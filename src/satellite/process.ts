import throttle from 'lodash.throttle'

import { AuthState } from '../auth/index'
import { Filesystem } from '../filesystems/index'
import { Change, ChangeNotification, Notifier } from '../notifiers/index'
import { DbName } from '../util/types'

import {
  OplogEntry,
  Satellite,
  SatelliteDatabaseAdapter,
  SatelliteOpts,
  SatelliteOverrides
} from './index'
import { DEFAULTS, OPERATIONS } from './config'

export class SatelliteProcess implements Satellite {
  dbName: DbName
  dbAdapter: SatelliteDatabaseAdapter
  fs: Filesystem
  notifier: Notifier
  opts: SatelliteOpts

  _authState?: AuthState
  _authStateSubscription?: string

  _lastSnapshotTimestamp?: Date
  _pollingInterval?: string
  _potentialDataChangeSubscription?: string
  _throttledSnapshot: () => void

  constructor(dbName: DbName, dbAdapter: SatelliteDatabaseAdapter, fs: Filesystem, notifier: Notifier, opts: SatelliteOpts) {
    this.dbName = dbName
    this.dbAdapter = dbAdapter
    this.fs = fs
    this.notifier = notifier
    this.opts = opts

    // Create a throttled function that performs a snapshot at most every
    // `minSnapshotWindow` ms. This function runs immediately when you
    // first call it and then every `minSnapshotWindow` ms as long as
    // you keep calling it within the window. If you don't call it within
    // the window, it will then run immediately the next time you call it.
    const snapshot = this._performSnapshot.bind(this)
    const throttleOpts = {leading: true, trailing: true}
    this._throttledSnapshot = throttle(snapshot, opts.minSnapshotWindow, throttleOpts)
  }

  // XXX kick off the satellite process
  //
  // - [x] poll the ops table
  // - [x] subscribe to data changes
  // - [ ] handle auth state
  // - [ ] establish replication connection
  // - [ ] ...
  //
  async start(authState?: AuthState): Promise<void>{
    const isVerified = await this._verifyTableStructure()
    if (!isVerified) {
      throw new Error('Invalid database schema. You need to run valid Electric SQL migrations.')
    }

    if (authState !== undefined) {
      this._authState = authState
    }

    if (this._authStateSubscription === undefined) {
      const handler = this._updateAuthState.bind(this)
      this._authStateSubscription = this.notifier.subscribeToAuthStateChanges(handler)
    }

    // XXX establish replication connection,
    // validate auth state, etc here.

    // Start polling to request a snapshot every `pollingInterval` ms.
    this._pollingInterval = setInterval(this._throttledSnapshot, this.opts.pollingInterval)

    // And request a snapshot whenever the data in our database potentially changes.
    this._potentialDataChangeSubscription = this.notifier.subscribeToPotentialDataChanges(this._throttledSnapshot)
  }

  // Unsubscribe from data changes and stop polling
  async stop(): Promise<void> {
    if (this._pollingInterval !== undefined) {
      clearInterval(this._pollingInterval)
      this._pollingInterval = undefined
    }

    if (this._potentialDataChangeSubscription !== undefined) {
      this.notifier.unsubscribeFromPotentialDataChanges(this._potentialDataChangeSubscription)
      this._potentialDataChangeSubscriptionKey = undefined
    }
  }

  // Perform a snapshot and notify which data actually changed.
  //
  // XXX currently this timestamps and fetches the new oplog entries. We still
  // need to actually replicate the data changes ...
  async _performSnapshot(): Promise<void> {
    const lastAckd = this.opts.lastAckdRowId
    const oplog = this.opts.oplogTable
    const timestamp = new Date().toISOString()

    const updateTimestamps = `
      UPDATE ${oplog} set timestamp = '${timestamp}'
        WHERE rowid in (
          SELECT rowid FROM ${oplog}
            WHERE timestamp is NULL
              AND rowid > ${lastAckd}
            ORDER BY rowid ASC
        )
    `

    const selectChanges = `
      SELECT * FROM ?
        WHERE timestamp = ?
        ORDER BY rowid ASC
    `

    await this.dbAdapter.exec(updateTimestamps)
    const results = await this.dbAdapter.query(selectChanges, [oplog, timestamp])

    await Promise.all([
      this._notifyChanges(results),
      this._replicateChanges(results)
    ])
  }

  async _notifyChanges(results: OplogEntry[]): Promise<void> {
    const acc: {[key: string]: Change} = {}

    // Would it be quicker to do this using a second SQL query that
    // returns results in `Change` format?!
    const reduceFn = (acc, entry) => {
      const qt = new QualifiedTablename(entry.namespace, entry.tablename)
      const key = qt.toString()

      if (key in acc) {
        acc[key].rowids.push(entry.rowid)
      }
      else {
        acc[key] = {
          qualifiedTablename: qt,
          rowids: [entry.rowid]
        }
      }

      return acc
    }

    const changes = Object.values(results.reduce(reduceFn, acc))
    const notification: ChangeNotification = {
      dbName: this.dbName,
      changes: changes
    }

    this.notifier.actuallyChanged(notification)
  }

  async _replicateChanges(results: OplogEntry[]): Promise<void> {
    // XXX integrate replication here ...
  }

  async _updateAuthState({ authState }: AuthStateNotification): Promise<void> {
    // XXX do whatever we need to stop/start or reconnect the replication
    // connection with the new auth state.

    // XXX Maybe we need to auto-start processing and/or replication
    // when we get the right authState?

    this._authState = authState
  }

  async _verifyTableStructure(): Promise<boolean> {
    const meta = this.opts.metaTable
    const oplog = this.opts.oplogTable

    const tablesExist = `
      SELECT count(name) as numTables FROM sqlite_master
        WHERE type='table'
          AND name IN (?, ?)
    `

    const [{ numTables }] = await this.dbAdapter.query(tablesExist, [meta, oplog])
    return numTables === 2
  }
}


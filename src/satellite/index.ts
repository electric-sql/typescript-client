import { AuthState } from '../auth/index'
import { AnyDatabase } from '../drivers/index'
import { Filesystem } from '../filesystems/index'
import { Notifier } from '../notifiers/index'
import { QualifiedTablename } from '../util/tablename'
import { BindParams, DbName, Row } from '../util/types'

export interface OplogEntry {
  rowid: number,
  namespace: string,
  tablename: string,
  optype: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT',
  primaryKey: string,
  timestamp: string,
  newRow?: string,
  oldRow?: string
}

export interface SatelliteOpts {
  // The database table where Satellite keeps its processing metadata.
  metaTable: QualifiedTablename,
  // The database table where change operations are written to by the triggers
  // automatically added to all tables in the user defined DDL schema.
  oplogTable: QualifiedTablename,
  // Polls the database for changes every `pollingInterval` milliseconds.
  pollingInterval: number,
  // Throttle snapshotting to once per `minSnapshotWindow` milliseconds.
  minSnapshotWindow: number,
  // The last rowid that was *sent to* the server.
  lastSentRowId: number,
  // The last rowid that was *acknowledged by* the server.
  lastAckdRowId: number
}

// As above but optional.
export interface SatelliteOverrides {
  metaTable?: QualifiedTablename,
  oplogTable?: QualifiedTablename,
  pollingInterval?: number,
  minSnapshotWindow?: number,
  lastSentRowId?: number,
  lastAckdRowId?: number
}

// `Satellite` is the main process handling Electric SQL replication.
//
// A Satellite instance is instantiated with a normalised `db` client,
// `fs`, a normalised filesystem adapter, and a `dbName` and `notifier`.
//
// It uses the filesystem to apply migrations, the database client to
// execute migrations and perform read and write operations. And it uses
// the `dbName` and `notifier` to recieve commit notifications and emit
// table and row scoped data-changed notifications.
export interface Satellite {
  dbAdapter: SatelliteDatabaseAdapter
  dbName: DbName
  fs: Filesystem
  notifier: Notifier
  opts: SatelliteOpts

  start(authState?: AuthState): Promise<void>
  stop(): Promise<void>
}

// `SatelliteDatabaseAdapter`s adapt a database client to provide the normalised
// interface defined here. This allows the satellite instance to
// interact with the database in a standardised way.
export interface SatelliteDatabaseAdapter {
  db: AnyDatabase

  // Runs sql against the DB, inside a transaction. If it's a success,
  // the promise resolves. Any errors, the transaction is rolled back
  // and the promise rejected.
  exec(sql: string): Promise<void>

  // Runs a query against the database, returning a promise. If the
  // query succeeds, the promise resolves with a list of rows.
  query(sql: string, bindParams?: BindParams): Promise<Row[]>
}

// The `SatelliteRegistry` is intended to be a global singleton that
// starts and stops replication processing for every SQLite database
// that the application is using.
export interface SatelliteRegistry {
  ensureStarted(dbName: DbName, dbAdapter: SatelliteDatabaseAdapter, fs: Filesystem, notifier: Notifier, authState?: AuthState): Promise<Satellite>
  ensureAlreadyStarted(dbName: DbName): Promise<Satellite>
  stop(dbName: DbName): Promise<void>
  stopAll(): Promise<void>
}

import { EventEmitter } from 'events'

import { randomValue } from '../util/random'
import { QualifiedTablename } from '../util/tablename'
import { AnyFunction, DbName, RowId } from '../util/types'

const EVENTS = {
  actualChange: 'actually:changed',
  potentialChange: 'potentially:changed'
}

export interface Change {
  qualifiedTablename: QualifiedTablename,
  rowids?: RowId[]
}
export interface ChangeNotification {
  dbName: DbName
  changes: Change[]
}
export interface PotentialChangeNotification {
  dbName: DbName
}

export type ChangeCallback = (notification: ChangeNotification) => void
export type PotentialChangeCallback = (notification: PotentialChangeNotification) => void
export type Notification = ChangeNotification | PotentialChangeNotification
export type NotificationCallback = ChangeCallback | PotentialChangeCallback

export interface Notifier {
  // Most database clients just open a single named database. However,
  // some can attach multiple databases. We keep track of this in the
  // set of `dbNames` by providing attach and detach methods.
  dbNames: Set<DbName>
  attach(dbName: DbName): void
  detach(dbName: DbName): void

  // The notification workflow starts by the electric database clients
  // (or the user manually) calling `potentiallyChanged` following
  // a write or transaction that may have changed the contents of one
  // or more of the opened/attached databases. If `dbName` is provided,
  // it restricts the potential change to the named database (as long)
  // as it is in the set of `this.dbNames`.
  potentiallyChanged(dbName?: DbName): void

  // Satellite processes subscribe to *potential* data changes and check
  // the opslog for *actual* changes as part of the replication machinery.
  subscribeToPotentialDataChanges(dbName: DbName, callback: PotentialChangeCallback): string
  unsubscribeFromPotentialDataChanges(key: string): void

  // When Satellite detects actual data changes in the opslog for a given
  // database, it calls  `actuallyChanged` with the list of changes.
  actuallyChanged(dbName: DbName, changes: Change[]): void

  // Reactive hooks then subscribe to `ActualDataChange` notifications,
  // using the info about what has actually changed to trigger re-queries.
  // when (and only when) necessary.
  subscribeToDataChanges(callback: ChangeCallback): string
  unsubscribeFromDataChanges(key: string): void
}

export class EventNotifier implements Notifier {
  dbNames: Set<DbName>
  events: EventEmitter

  _changeCallbacks: {
    [key: string]: NotificationCallback
  }

  constructor(dbNames: DbName | DbName[]) {
    this.dbNames = new Set(Array.isArray(dbNames) ? dbNames : [dbNames])

    this.events = new EventEmitter()

    this._changeCallbacks = {}
  }

  attach(dbName: DbName): void {
    this.dbNames.add(dbName)
  }

  detach(dbName: DbName): void {
    this.dbNames.delete(dbName)
  }

  potentiallyChanged(dbName?: DbName): void {
    const dbNames = [...this.dbNames].filter((candidate) => {
      return dbName !== undefined ? candidate === dbName : true
    })

    dbNames.forEach((dbName) => {
      this._emit(EVENTS.potentialChange, {dbName: dbName})
    })
  }
  actuallyChanged(dbName: DbName, changes: Change[]): void {
    const notification: ChangeNotification = {
      dbName: dbName,
      changes: changes
    }

    this._emit(EVENTS.actualChange, notification)
  }

  subscribeToPotentialDataChanges(dbName: DbName, callback: PotentialChangeCallback): string {
    const key = randomValue()

    const wrappedCallback = (notification: PotentialChangeNotification) => {
      if (notification.dbName === dbName) {
        callback(notification)
      }
    }

    this._changeCallbacks[key] = wrappedCallback
    this._subscribe(EVENTS.potentialChange, wrappedCallback)

    return key
  }
  unsubscribeFromPotentialDataChanges(key: string): void {
    const callback = this._changeCallbacks[key]

    if (callback === undefined) {
      return
    }

    this._unsubscribe(EVENTS.potentialChange, callback)

    delete this._changeCallbacks[key]
  }

  subscribeToDataChanges(callback: ChangeCallback): string {
    const key = randomValue()

    this._changeCallbacks[key] = callback
    this._subscribe(EVENTS.actualChange, callback)

    return key
  }
  unsubscribeFromDataChanges(key: string): void {
    const callback = this._changeCallbacks[key]

    if (callback === undefined) {
      return
    }

    this._unsubscribe(EVENTS.actualChange, callback)

    delete this._changeCallbacks[key]
  }

  _emit(eventName: string, notification: Notification) {
    this.events.emit(eventName, notification)
  }
  _subscribe(eventName: string, callback: AnyFunction): void {
    this.events.addListener(eventName, callback)
  }
  _unsubscribe(eventName: string, callback: AnyFunction): void {
    this.events.removeListener(eventName, callback)
  }
}

import { EventEmitter } from 'events'
import { randomValue } from '../util/random'
import { DbName } from '../util/types'

import {
  AuthStateNotification,
  Change,
  ChangeCallback,
  ChangeNotification,
  Notification,
  NotificationCallback,
  Notifier,
  PotentialChangeCallback,
  PotentialChangeNotification
} from './index'

const EVENT_NAMES = {
  authChange: 'auth:changed',
  actualDataChange: 'data:actually:changed',
  potentialDataChange: 'data:potentially:changed'
}

// Global singleton that all event notifiers use by default. Emitting an event
// on this object will notify all subscribers in the same thread. Cross thread
// notifications use the `./bridge` notifiers.
const globalEmitter = new EventEmitter()

export class EventNotifier implements Notifier {
  dbNames: Set<DbName>
  events: EventEmitter

  _changeCallbacks: {
    [key: string]: NotificationCallback
  }

  constructor(dbNames: DbName | DbName[], eventEmitter?: EventEmitter) {
    this.dbNames = new Set(Array.isArray(dbNames) ? dbNames : [dbNames])

    this.events = eventEmitter !== undefined
      ? eventEmitter
      : globalEmitter

    this._changeCallbacks = {}
  }

  attach(dbName: DbName): void {
    this.dbNames.add(dbName)
  }

  detach(dbName: DbName): void {
    this.dbNames.delete(dbName)
  }

  authStateChanged(authState: AuthState): void {
    this._emitAuthStateChange(current)
  }
  subscribeToAuthStateChanges(callback: AuthStateCallback): string {
    const key = randomValue()

    this._changeCallbacks[key] = callback
    this._subscribe(EVENT_NAMES.authChange, callback)

    return key
  }
  unsubscribeFromAuthStateChanges(key: string): void {
    const callback = this._changeCallbacks[key]

    if (callback === undefined) {
      return
    }

    this._unsubscribe(EVENT_NAMES.authChange, callback)

    delete this._changeCallbacks[key]
  }

  potentiallyChanged(dbName?: DbName): void {
    const dbNames = this._filterDbNames(dbName)
    const emitPotentialChange = this._emitPotentialChange.bind(this)

    dbNames.forEach(emitPotentialChange)
  }
  actuallyChanged(dbName: DbName, changes: Change[]): void {
    if (!this._hasDbName(dbName)) {
      return
    }

    this._emitActualChange(dbName, changes)
  }

  subscribeToPotentialDataChanges(callback: PotentialChangeCallback): string {
    const key = randomValue()
    const thisHasDbName = this._hasDbName.bind(this)

    const wrappedCallback = (notification: PotentialChangeNotification) => {
      if (thisHasDbName(notification.dbName)) {
        callback(notification)
      }
    }

    this._changeCallbacks[key] = wrappedCallback
    this._subscribe(EVENT_NAMES.potentialDataChange, wrappedCallback)

    return key
  }
  unsubscribeFromPotentialDataChanges(key: string): void {
    const callback = this._changeCallbacks[key]

    if (callback === undefined) {
      return
    }

    this._unsubscribe(EVENT_NAMES.potentialDataChange, callback)

    delete this._changeCallbacks[key]
  }

  subscribeToDataChanges(callback: ChangeCallback): string {
    const key = randomValue()
    const thisHasDbName = this._hasDbName.bind(this)

    const wrappedCallback = (notification: ChangeNotification) => {
      if (thisHasDbName(notification.dbName)) {
        callback(notification)
      }
    }

    this._changeCallbacks[key] = wrappedCallback
    this._subscribe(EVENT_NAMES.actualDataChange, wrappedCallback)

    return key
  }
  unsubscribeFromDataChanges(key: string): void {
    const callback = this._changeCallbacks[key]

    if (callback === undefined) {
      return
    }

    this._unsubscribe(EVENT_NAMES.actualDataChange, callback)

    delete this._changeCallbacks[key]
  }

  _filterDbNames(dbName?: DbName): DbName[] {
    const dbNames = [...this.dbNames]

    if (dbName === undefined) {
      return dbNames
    }

    return dbNames.filter((candidate) => candidate === dbName)
  }
  _hasDbName(dbName: DbName): boolean {
    return this.dbNames.has(dbName)
  }

  // Extracting out these methds allows them to be overridden
  // without duplicating any dbName filter / check logic, etc.
  _emitAuthStateChange(authState: AuthState): AuthStateNotification {
    const notification = {
      current: current
    }

    this._emit(EVENT_NAMES.authChange, notification)
  }
  _emitPotentialChange(dbName: DbName): PotentialChangeNotification {
    const notification = {
      dbName: dbName
    }

    this._emit(EVENT_NAMES.potentialDataChange, notification)

    return notification
  }
  _emitActualChange(dbName: DbName, changes: Change[]): ChangeNotification {
    const notification = {
      dbName: dbName,
      changes: changes
    }

    this._emit(EVENT_NAMES.actualDataChange, notification)

    return notification
  }

  _emit(eventName: string, notification: Notification) {
    this.events.emit(eventName, notification)
  }
  _subscribe(eventName: string, callback: NotificationCallback): void {
    this.events.addListener(eventName, callback)
  }
  _unsubscribe(eventName: string, callback: NotificationCallback): void {
    this.events.removeListener(eventName, callback)
  }
}

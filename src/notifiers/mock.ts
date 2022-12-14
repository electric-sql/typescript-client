import { DbName } from '../util/types'

import { Notification, Notifier } from './index'
import { EventNotifier } from './event'

export class MockNotifier extends EventNotifier implements Notifier {
  notifications: Notification[]

  constructor(dbName: DbName) {
    super(dbName)

    this.notifications = []
  }

  _emit(eventName: string, notification: Notification) {
    super._emit(eventName, notification)

    this.notifications.push(notification)
  }
}

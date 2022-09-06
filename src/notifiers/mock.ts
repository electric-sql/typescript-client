import { DbName } from '../util/types'
import { EventNotifier, Notification, Notifier } from './index'

export class MockNotifier extends EventNotifier implements Notifier {
  notifications: Notification[]

  constructor(dbNames: DbName | DbName[]) {
    super(dbNames)

    this.notifications = []
  }

  _emit(eventName: string, notification: Notification) {
    super._emit(eventName, notification)

    this.notifications.push(notification)
  }
}

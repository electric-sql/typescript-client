import { AuthState } from '../auth/index'
import { QualifiedTablename } from '../util/tablename'
import { DbName, RowId } from '../util/types'

export interface AuthStateNotification {
  authState: AuthState
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

export type Notification =
  AuthStateNotification
  | ChangeNotification
  | PotentialChangeNotification

export type AuthStateCallback = (notification: AuthStateNotification) => void
export type ChangeCallback = (notification: ChangeNotification) => void
export type PotentialChangeCallback = (notification: PotentialChangeNotification) => void
export type NotificationCallback = AuthStateCallback | ChangeCallback | PotentialChangeCallback

export interface Notifier {
  // Most database clients just open a single named database.
  dbName: DbName

  // However, some can attach multiple databases.
  attach(dbName: DbName, dbAlias: string): void
  detach(dbAlias: string): void

  // We keep track of the attached dbs in two mappings.
  attachedDbIndex: {
    byAlias: {
      [key: string]: DbName
    },
    byName: {
      [key: DbName]: string
    }
  }

  // And we provide a helper method to alias changes in the form
  // `{attachedDbName, tablenames}` to `aliasedTablenames`.
  alias(notification: ChangeNotification): QualifiedTablename[]

  // Calling `authStateChanged` notifies the Satellite process
  // with the new authentication credentials.
  authStateChanged(authState: AuthState): void
  subscribeToAuthStateChanges(callback: AuthStateCallback): string
  unsubscribeFromAuthStateChanges(key: string): void

  // The notification workflow starts by the electric database clients
  // (or the user manually) calling `potentiallyChanged` following
  // a write or transaction that may have changed the contents of one
  // or more of the opened/attached databases.
  potentiallyChanged(): void

  // Satellite processes subscribe to *potential* data changes and check
  // the opslog for *actual* changes as part of the replication machinery.
  subscribeToPotentialDataChanges(callback: PotentialChangeCallback): string
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

import { ElectricNamespace } from '../../electric/index'
import { ProxyWrapper } from '../../proxy/index'
import { AnyFunction, BindParams, DbName, VoidOrPromise } from '../../util/types'

import { ensurePromise } from './promise'
export { ensurePromise }

// The common subset of the SQLitePluginTransaction interface.
export interface SQLitePluginTransaction {
  readOnly: boolean
  success(...args: any[]): any
  executeSql(sql: string, values?: BindParams, success?: AnyFunction, error?: AnyFunction): VoidOrPromise
}

export type SQLitePluginTransactionFunction = (tx: SQLitePluginTransaction) => void

// The common subset of the SQLitePlugin database client API.
export interface SQLitePlugin {
  databaseFeatures: {
    isSQLitePluginDatabase: true
  }
  openDBs: {
    [key: DbName]: 'INIT' | 'OPEN'
  }

  // Never promisified.
  addTransaction(tx: SQLitePluginTransaction): void

  // May be promisified.
<<<<<<< HEAD
  readTransaction(txFn: SQLitePluginTransactionFunction, error?: AnyFunction, success?: AnyFunction): VoidOrPromise
  transaction(txFn: SQLitePluginTransactionFunction, error?: AnyFunction, success?: AnyFunction): VoidOrPromise
=======
  readTransaction(txFn: AnyFunction, error?: AnyFunction, success?: AnyFunction): VoidOrPromise
  transaction(txFn: AnyFunction, error?: AnyFunction, success?: AnyFunction): VoidOrPromise
  sqlBatch(stmts: string[], success?: AnyFunction, error?: AnyFunction): VoidOrPromise
}

// The relevant subset of the SQLitePluginTransaction interface.
export interface SQLitePluginTransaction {
  readOnly: boolean
  success(...args: any[]): any

  // Never promisified.
  addStatement(sql: string, values?: BindParams, success?: AnyFunction, error?: AnyFunction): void

  // May be promisified.
  executeSql(sql: string, values?: BindParams, success?: AnyFunction, error?: AnyFunction): VoidOrPromise
>>>>>>> 5e5490f (sql-plugin: switch `adapter.run` to use `db.sqlBatch`.)
}

// Abstract class designed to be extended by concrete
// implementations for Cordova and React Native.
export abstract class ElectricSQLitePlugin implements ProxyWrapper {
  // Private properties are not exposed via the proxy.
  _db: SQLitePlugin
  _promisesEnabled?: boolean

  // The public property we add to the underlying Database client,
  electric: ElectricNamespace

  constructor(db: SQLitePlugin, namespace: ElectricNamespace) {
    this._db = db

    this.electric = namespace
  }

  // Used when re-proxying so the proxy code doesn't need
  // to know the property name.
  _setOriginal(db: SQLitePlugin): void {
    this._db = db
  }
  _getOriginal(): SQLitePlugin {
    return this._db
  }

  addTransaction(tx: SQLitePluginTransaction): void {
    const originalSuccessFn = tx.success.bind(tx)
    const potentiallyChanged = this.electric.potentiallyChanged.bind(this.electric)

    tx.success = (...args: any[]): any => {
      if (!tx.readOnly) {
        potentiallyChanged()
      }

      if (!!originalSuccessFn) {
        originalSuccessFn(...args)
      }
    }

    return this._db.addTransaction(tx)
  }

  transaction(txFn: SQLitePluginTransactionFunction, error?: AnyFunction, success?: AnyFunction): VoidOrPromise {
    const wrappedSuccess = (): void => {
      this.electric.potentiallyChanged()

      if (success !== undefined) {
        success()
      }
    }

    if (this._promisesEnabled) {
      const retval = ensurePromise(this._db.transaction(txFn))

      return retval.then(wrappedSuccess)
    }

    return this._db.transaction(txFn, error, wrappedSuccess)
  }
}

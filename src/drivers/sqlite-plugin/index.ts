import { ElectricNamespace } from '../../electric/index'
import { ProxyWrapper } from '../../proxy/index'
import { AnyFunction, BindParams } from '../../util/types'

import { ensurePromise } from './promise'
import { Results } from './results'
export { ensurePromise }

export type StatementCallback = (
  transaction: SQLitePluginTransaction,
  resultSet: Results
) => void
export type StatementErrorCallback = (
  transaction: SQLitePluginTransaction,
  error: any
) => void

// The common subset of the SQLitePluginTransaction interface.
export interface SQLitePluginTransaction {
  executeSql(
    sql: string,
    values?: BindParams
  ): Promise<[SQLitePluginTransaction, Results]>
  executeSql(
    sql: string,
    values?: BindParams,
    success?: StatementCallback,
    error?: StatementErrorCallback
  ): void
}

export type SQLitePluginTransactionFunction = (
  tx: SQLitePluginTransaction
) => void

// The common subset of the SQLitePlugin database client API.
export interface SQLitePlugin {
  // May be promisified.
  readTransaction(
    txFn: SQLitePluginTransactionFunction
  ): Promise<SQLitePluginTransaction>
  readTransaction(
    txFn: SQLitePluginTransactionFunction,
    error?: AnyFunction,
    success?: SQLitePluginTransactionFunction
  ): void
  transaction(
    txFn: SQLitePluginTransactionFunction
  ): Promise<SQLitePluginTransaction>
  transaction(
    txFn: SQLitePluginTransactionFunction,
    error?: AnyFunction,
    success?: SQLitePluginTransactionFunction
  ): void
}

// Abstract class designed to be extended by concrete
// implementations for Cordova and React Native.
export abstract class ElectricSQLitePlugin
  implements ProxyWrapper, Pick<SQLitePlugin, 'transaction'>
{
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

  transaction(
    txFn: SQLitePluginTransactionFunction
  ): Promise<SQLitePluginTransaction>
  transaction(
    txFn: SQLitePluginTransactionFunction,
    error?: AnyFunction,
    success?: SQLitePluginTransactionFunction
  ): void
  transaction(
    txFn: SQLitePluginTransactionFunction,
    error?: AnyFunction,
    success?: SQLitePluginTransactionFunction
  ): void | Promise<SQLitePluginTransaction> {
    const wrappedSuccess = (
      tx: SQLitePluginTransaction
    ): SQLitePluginTransaction => {
      this.electric.potentiallyChanged()
      if (success !== undefined) success(tx)
      return tx
    }

    if (this._promisesEnabled) {
      const retval = ensurePromise(this._db.transaction(txFn))

      return retval.then(wrappedSuccess)
    }

    return this._db.transaction(txFn, error, wrappedSuccess)
  }
}

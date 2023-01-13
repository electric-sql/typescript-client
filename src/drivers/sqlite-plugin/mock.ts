import { AnyFunction, BindParams, DbName } from '../../util/types'
import {
  SQLitePlugin,
  SQLitePluginTransaction,
  StatementCallback,
} from './index'
import { mockResults } from './results'

export abstract class MockSQLitePlugin implements SQLitePlugin {
  openDBs: {
    [key: DbName]: 'INIT' | 'OPEN'
  }

  constructor(dbName: DbName) {
    this.openDBs = {}
    this.openDBs[dbName] = 'OPEN'
  }

  private addTransaction(
    tx: SQLitePluginTransaction & { success: AnyFunction; readOnly: boolean }
  ): void {
    if (tx.success !== undefined) {
      const results = mockResults([{ i: 0 }])
      const arg = tx.readOnly ? [tx, results] : undefined

      tx.success(arg)
    }
  }

  readTransaction(txFn: AnyFunction): Promise<SQLitePluginTransaction>
  readTransaction(
    txFn: AnyFunction,
    _error?: AnyFunction,
    success?: AnyFunction
  ): void
  readTransaction(
    txFn: AnyFunction,
    _error?: AnyFunction,
    success?: AnyFunction
  ): void | Promise<SQLitePluginTransaction> {
    const tx = new MockSQLitePluginTransaction(true, success)

    txFn(tx)

    this.addTransaction(tx)
  }
  transaction(txFn: AnyFunction): Promise<SQLitePluginTransaction>
  transaction(
    txFn: AnyFunction,
    _error?: AnyFunction,
    success?: AnyFunction
  ): void
  transaction(
    txFn: AnyFunction,
    _error?: AnyFunction,
    success?: AnyFunction
  ): void | Promise<SQLitePluginTransaction> {
    const tx = new MockSQLitePluginTransaction(false, success)

    txFn(tx)

    this.addTransaction(tx)
  }

  sqlBatch(
    _stmts: string[],
    success?: AnyFunction,
    _error?: AnyFunction
  ): void {
    if (success !== undefined) {
      success()
    }
  }
}

export class MockSQLitePluginTransaction implements SQLitePluginTransaction {
  readOnly: boolean
  successCallback?: AnyFunction

  constructor(readOnly = false, successCallback?: AnyFunction) {
    this.readOnly = readOnly
    this.successCallback = successCallback
  }

  success(...args: any[]): void {
    if (this.successCallback !== undefined) {
      this.successCallback(...args)
    }
  }

  addStatement(
    _sql: string,
    _values?: BindParams,
    success?: AnyFunction,
    _error?: AnyFunction
  ): void {
    if (success !== undefined) {
      const results = mockResults([{ i: 0 }])
      const arg = this.readOnly ? [this, results] : undefined

      success(arg)
    }
  }

  executeSql(
    sql: string,
    values?: BindParams
  ): Promise<[SQLitePluginTransaction, any]>
  executeSql(
    sql: string,
    values?: BindParams,
    success?: StatementCallback,
    error?: AnyFunction
  ): void
  executeSql(
    _sql: string,
    _values?: BindParams,
    success?: StatementCallback,
    _error?: AnyFunction
  ): void | Promise<[SQLitePluginTransaction, any]> {
    if (success !== undefined) {
      const results = mockResults([{ i: 0 }])

      success(this, results)
    }
  }
}

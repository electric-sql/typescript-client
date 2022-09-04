import { ElectricNamespace } from '../../electric/index'
import { randomValue } from '../../util/random'
import {
  AnyFunction,
  BindParams,
  DbName,
  EmptyFunction,
  FunctionMap,
  Row,
  RowCallback,
  SqlValue
} from '../../util/types'
import { WorkerClient } from './bridge'

export interface Config {
  useBigInt?: boolean
}

export interface QueryExecResult {
  columns: string[],
  values: SqlValue[][]
}

// The SQL.js API that we need to proxy -- which in this case
// is the entire interface.
export interface Database {
  exec(sql: string, params?: BindParams, config?: Config): QueryExecResult | Promise<QueryExecResult>
  run(sql: string, params?: BindParams): Database | Promise<Database>
  prepare(sql: string, params?: BindParams): Statement | Promise<Statement>
  each?(sql: string, params: BindParams | RowCallback, callback: RowCallback | EmptyFunction, done?: EmptyFunction, config?: Config): Database | Promise<Database>
  iterateStatements?(sql: string): StatementIterator | Promise<StatementIterator>
  getRowsModified(): number | Promise<number>
  close(): void | Promise<void>
  export(): Uint8Array | Promise<Uint8Array>
  create_function(name: string, func: AnyFunction | string): Database | Promise<Database>
}

export interface Statement {
  db: Database
  stmt: string

  bind(values: BindParams): boolean | Promise<boolean>
  step(): boolean | Promise<boolean>
  get(params?: BindParams, config?: Config): SqlValue[] | Promise<SqlValue[]>
  getColumnNames(): string[] | Promise<string[]>
  getAsObject(params?: BindParams, config?: Config): Row | Promise<Row>
  getSQL(): string | Promise<string>
  getNormalizedSQL(): string | Promise<string>
  run(values: BindParams): boolean | Promise<boolean>
  bindFromObject(valuesObj: Row): true | Promise<true>
  bindFromArray(values: SqlValue[]): true | Promise<true>
  reset(): boolean | Promise<boolean>
  free(): boolean | Promise<boolean>
}

export type StatementIterator = AsyncIterator<Statement>

// This is the primary wrapped database client that runs in the
// worker thread, using SQL.js with absurd-sql.
export class ElectricDatabase {
  db: Database
  electric: ElectricNamespace
  _statements: {
    [key: string]: Statement
  }
  _user_defined_functions: FunctionMap

  constructor(db: Database, namespace: ElectricNamespace, functions: FunctionMap = {}) {
    this.db = db
    this.electric = namespace

    this._statements = {}
    this._user_defined_functions = functions
  }

  _getStatement(key: string): Statement | undefined {
    return this._statements[key]
  }
  async _releaseStatement(key: string): Promise<void> {
    const statement = this._getStatement(key)

    if (statement === undefined) {
      return
    }

    statement.free()
    delete this._statements[key]
  }
  async _releaseStatements(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this._releaseStatement(key)))
  }

  async exec(sql: string, params?: BindParams, config?: Config): Promise<QueryExecResult> {
    return this.db.exec(sql, params, config)
  }
  async run(sql: string, params?: BindParams): Promise<void> {
    this.db.run(sql, params)
  }
  async prepare(sql: string, params?: BindParams): Promise<string> {
    const key = randomValue()
    const stmt = await this.db.prepare(sql, params)

    this._statements[key] = stmt

    return key
  }
  async getRowsModified(): Promise<number> {
    return this.db.getRowsModified()
  }
  async close(): Promise<void> {
    this.db.close()

    this._statements = {}
  }
  async export(): Promise<Uint8Array> {
    return this.db.export()
  }
  // N.b.: we can't pass functions to the worker, so any functions
  // need to be defined and hung off `self` in worker.js.
  async create_function(name: string, fnName: string): Promise<boolean> {
    const fn = this._user_defined_functions[fnName]

    if (fn !== undefined) {
      this.db.create_function(name, fn)

      return true
    }

    return false
  }
}

// This is the proxy client that runs in the main thread, using the
// workerClient to proxy method calls on to the ElectricDatabase in
// the worker thread.
export class MainThreadDatabaseProxy implements Database {
  _dbName: DbName
  _workerClient: WorkerClient
  _statements: {
    [key: string]: MainThreadStatementProxy
  }

  constructor(dbName: DbName, workerClient: WorkerClient) {
    this._dbName = dbName
    this._workerClient = workerClient
    this._statements = {}
  }

  _request(method: string, ...args: any[]): Promise<any> {
    const methodName = `db:${method}`

    return this._workerClient.request(methodName, ...args)
  }

  async _releaseStatement(id: string): Promise<void> {
    await this._request('_releaseStatement', id)

    delete this._statements[id]
  }

  exec(sql: string, params?: BindParams, config?: Config): Promise<QueryExecResult> {
    return this._request('exec', sql, params, config)
  }

  async run(sql: string, params?: BindParams): Promise<Database> {
    await this._request('run', sql, params)

    return this
  }
  async prepare(sql: string, params?: BindParams): Promise<MainThreadStatementProxy> {
    const id = await this._request('prepare', sql, params)
    const stmt = new MainThreadStatementProxy(id, sql, this, this._workerClient)

    this._statements[id] = stmt
    return stmt
  }
  async each(sql: string, params: BindParams | RowCallback, callback: RowCallback | EmptyFunction, done?: EmptyFunction, config?: Config): Promise<Database> {
    const shiftArgs = typeof params === 'function'

    const actualParams = (shiftArgs ? [] : params) as BindParams
    const actualCallback = (shiftArgs ? params : callback) as RowCallback
    const actualDone = (shiftArgs ? callback : done) as EmptyFunction

    const stmt = await this.prepare(sql, actualParams)

    let row: Row
    let hasRow: boolean

    try {
      while (true) {
        hasRow = await stmt.step()
        if (!hasRow) {
          break
        }

        row = await stmt.getAsObject(undefined, config)
        actualCallback(row)
      }
    }
    finally {
      stmt.free()
    }
    if (actualDone !== undefined) {
      actualDone()
    }

    return this
  }
  async *iterateStatements(sqlStatements: string): StatementIterator {
    const parts: string[] = sqlStatements.split(';')
    const stmtIds: string[] = []

    let i: number
    let sql: string
    let stmt: MainThreadStatementProxy

    try {
      for (i = 0; i < parts.length; i++) {
        sql = parts[i]
        stmt = await this.prepare(sql)
        stmtIds.push(stmt._id)
        yield stmt
      }
    }
    finally {
      if (stmtIds.length) {
        await this._request('_releaseStatements', stmtIds)
      }
    }
  }
  getRowsModified(): Promise<number> {
    return this._request('getRowsModified')
  }
  close(): Promise<void> {
    return this._request('close')
  }
  export(): Promise<Uint8Array> {
    return this._request('export')
  }

  // N.b.: we can't pass functions to the worker, so any functions
  // need to be defined and hung off `self` in worker.js.
  async create_function(name: string, fnName: string): Promise<Database> {
    await this._request('create_function', name, fnName)

    return this
  }
}

export class MainThreadStatementProxy implements Statement {
  db: MainThreadDatabaseProxy
  stmt: string

  _id: string
  _workerClient: WorkerClient

  constructor(id: string, stmt: string, db: MainThreadDatabaseProxy, workerClient: WorkerClient) {
    this.db = db
    this.stmt = stmt

    this._id = id
    this._workerClient = workerClient
  }

  _request(method: string, ...args: any[]): Promise<any> {
    const methodName = `statement:${this._id}:${method}`

    return this._workerClient.request(methodName, ...args)
  }

  bind(values: BindParams): Promise<boolean> {
    return this._request('bind', values)
  }
  step(): Promise<boolean> {
    return this._request('step')
  }
  get(params?: BindParams, config?: Config): Promise<SqlValue[]> {
    return this._request('get', params, config)
  }
  getColumnNames(): Promise<string[]> {
    return this._request('getColumnNames')
  }
  getAsObject(params?: BindParams, config?: Config): Promise<Row> {
    return this._request('getAsObject', params, config)
  }
  getSQL(): Promise<string> {
    return this._request('getSQL')
  }
  getNormalizedSQL(): Promise<string> {
    return this._request('getNormalizedSQL')
  }
  run(values: BindParams): Promise<boolean> {
    return this._request('run', values)
  }
  bindFromObject(valuesObj: Row): Promise<true> {
    return this._request('bindFromObject', valuesObj)
  }
  bindFromArray(values: SqlValue[]): Promise<true> {
    return this._request('bindFromArray', values)
  }
  reset(): Promise<boolean> {
    return this._request('reset')
  }
  async free(): Promise<boolean> {
    await this.db._releaseStatement(this._id)

    return true
  }
}

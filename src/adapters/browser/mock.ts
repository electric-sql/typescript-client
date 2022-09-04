import { AnyFunction, BindParams, DbName, Row, SqlValue } from '../../util/types'

import { DEFAULTS } from '../../electric/config'
import { ElectricNamespace } from '../../electric/index'

import { MockFilesystem } from '../../filesystems/mock'
import { CommitNotifier } from '../../notifiers/index'
import { MockCommitNotifier } from '../../notifiers/mock'
import { globalRegistry } from '../../satellite/registry'

import { BaseWorkerServer, RequestError } from './bridge'
import { Config, Database, ElectricDatabase, QueryExecResult, Statement } from './database'
import { QueryAdapter } from './query'
import { SatelliteDatabaseAdapter } from './satellite'

export class MockDatabase implements Database {
  exec(_sql: string, _params?: BindParams, _config?: Config): QueryExecResult {
    return {
      columns: ['a'],
      values: [[1], [2]]
    }
  }
  run(_sql: string, _params?: BindParams): Database {
    return this
  }
  prepare(sql: string, _params?: BindParams): Statement {
    return new MockStatement(this, sql)
  }
  // each(_sql: string, params: BindParams | RowCallback, callback: RowCallback | EmptyFunction, done?: EmptyFunction, _config?: Config): Database {
  //   const shiftArgs = typeof params === 'function'
  //   const actualCallback = (shiftArgs ? params : callback) as RowCallback
  //   const actualDone = (shiftArgs ? callback : done) as EmptyFunction

  //   actualCallback({a: 1})
  //   actualCallback({a: 2})

  //   if (typeof actualDone === 'function') {
  //     actualDone()
  //   }

  //   return this
  // }
  // async *iterateStatements(sqlStatements: string): StatementIterator {
  //   const parts = sqlStatements.split(';')

  //   for (let i = 0; i < parts.length; i++) {
  //     yield this.prepare(parts[i])
  //   }
  // }
  getRowsModified(): number {
    return 0
  }
  close(): void {}
  export(): Uint8Array {
    return new Uint8Array(2)
  }
  create_function(_name: string, _func: AnyFunction | string): Database {
    return this
  }
}

export class MockStatement implements Statement {
  db: Database
  stmt: string

  _steps: number
  _maxSteps: number

  constructor(db: Database, stmt: string) {
    this.db = db
    this.stmt = stmt

    this._steps = 0
    this._maxSteps = 3
  }

  bind(_values: BindParams): boolean {
    return true
  }
  step(): boolean {
    this._steps += 1

    return this._steps <= this._maxSteps
  }
  get(_params?: BindParams, _config?: Config): SqlValue[] {
    return [1]
  }
  getColumnNames(): string[] {
    return ['a']
  }
  getAsObject(_params?: BindParams, _config?: Config): Row {
    return {a: 1}
  }
  getSQL(): string {
    return this.stmt
  }
  getNormalizedSQL(): string {
    return this.stmt
  }
  run(_values: BindParams): boolean {
    return true
  }
  bindFromObject(_valuesObj: Row): true {
    return true
  }
  bindFromArray(_values: SqlValue[]): true {
    return true
  }
  reset(): boolean {
    this._steps = 0

    return true
  }
  free(): boolean {
    return true
  }
}

export class MockElectricWorker extends BaseWorkerServer {
  original?: Database
  notifier?: CommitNotifier

  async init(_locatorPattern: string): Promise<boolean> {
    this.SQL = true

    return true
  }

  async open(dbName: DbName): Promise<boolean> {
    if (!this.SQL) {
      throw new RequestError(400, 'Must init before opening')
    }

    const db = new MockDatabase()

    const opts = this.opts
    const defaultNamespace = opts.defaultNamespace || DEFAULTS.namespace
    const commitNotifier = opts.commitNotifier || new MockCommitNotifier(dbName)
    const fs = opts.filesystem || new MockFilesystem()
    const queryAdapter = opts.queryAdapter || new QueryAdapter(db, defaultNamespace)
    const satelliteDbAdapter = opts.satelliteDbAdapter || new SatelliteDatabaseAdapter(db)
    const satelliteRegistry = opts.satelliteRegistry || globalRegistry

    const namespace = new ElectricNamespace(commitNotifier, queryAdapter)
    this.db = new ElectricDatabase(db, namespace, this.worker.user_defined_functions)
    this.notifier = commitNotifier
    this.original = db

    await satelliteRegistry.ensureStarted(dbName, satelliteDbAdapter, fs)

    return true
  }
}

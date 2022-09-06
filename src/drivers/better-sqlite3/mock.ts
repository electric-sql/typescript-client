import { BindParams, DbName, Row } from '../../util/types'
import { Database, Info, Statement } from './database'

export class MockDatabase implements Database {
  name: DbName

  inTransaction = false
  memory = false

  constructor(name: DbName) {
    this.name = name
  }

  exec(_sql: string): Database {
    return this
  }

  prepare(_sql: string): Statement {
    return new MockStatement(this)
  }

  transaction(fn: (...args: any[]) => any): (...args: any[]) => any {
    const self = this

    return (...args) => {
      self.inTransaction = true

      const retval = fn(...args)

      self.inTransaction = false

      return retval
    }
  }
}

export class MockStatement implements Statement {
  database: Database
  readonly = false
  source = 'select foo from bar'

  constructor(db: Database) {
    this.database = db
  }

  run(_bindParams: BindParams): Info {
    return {
      changes: 0,
      lastInsertRowid: 1234
    }
  }

  get(_bindParams: BindParams): Row | void {}

  all(_bindParams: BindParams): Row[] {
    return []
  }

  iterate(_bindParams: BindParams): Iterable<Row> {
    return []
  }
}

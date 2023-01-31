import { DatabaseAdapter as DatabaseAdapterInterface } from '../../electric/adapter'

import { parseTableNames } from '../../util/parser'
import { QualifiedTablename } from '../../util/tablename'
import { Row, Statement } from '../../util/types'

import { Database } from './database'
import { resultToRows } from './result'

export class DatabaseAdapter implements DatabaseAdapterInterface {
  db: Database

  constructor(db: Database) {
    this.db = db
  }
  async runInTransaction(...statements: Statement[]): Promise<void> {
    let open = false
    try {
      // SQL-js accepts multiple statements in a string and does
      // not run them as transaction.
      await this.db.run('BEGIN')
      open = true
      for (const stmt of statements) {
        await this.db.run(stmt.sql, stmt.args)
      }
    } catch (error) {
      await this.db.run('ROLLBACK')
      open = false
      throw error // rejects the promise with the reason for the rollback
    } finally {
      if (open) {
        await this.db.run('COMMIT')
      }
    }
  }

  async run(statement: Statement): Promise<void> {
    const prepared = await this.db.prepare(statement.sql)
    await prepared.run(statement.args ? statement.args : [])
  }

  async query(statement: Statement): Promise<Row[]> {
    const result = await this.db.exec(statement.sql, statement.args)

    return resultToRows(result)
  }

  tableNames({ sql }: Statement): QualifiedTablename[] {
    return parseTableNames(sql)
  }
}

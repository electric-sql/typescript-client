import { RunResult, Transaction } from '../../electric/adapter'
import { QueryBuilder } from 'squel'
import { DB } from './db'
import * as z from 'zod'

export class TransactionalDB<T> implements DB<T> {
  constructor(private _tx: Transaction) {}
  run(
    statement: QueryBuilder | string,
    successCallback?: (db: DB<T>, res: RunResult) => void,
    errorCallback?: (error: any) => void
  ): void {
    this._tx.run(
      { sql: statement.toString() },
      (tx, res) => {
        if (typeof successCallback !== 'undefined')
          successCallback(new TransactionalDB(tx), res)
      },
      errorCallback
    )
  }

  query<Z>(
    statement: QueryBuilder | string,
    schema: z.ZodType<Z>,
    successCallback: (db: DB<T>, res: Z[]) => void,
    errorCallback?: (error: any) => void
  ): void {
    this._tx.query(
      { sql: statement.toString() },
      (tx, rows) => {
        if (typeof successCallback !== 'undefined') {
          const objects = rows.map((row) => schema.parse(row)) //.partial().parse(row))
          successCallback(new TransactionalDB(tx), objects)
        }
      },
      errorCallback
    )
  }
}

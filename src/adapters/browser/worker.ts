import { Request, Response } from './client'
import { WasmLocator } from './locator'

// Avoid garbage collection.
const refs = []

// This is the primary wrapped database client that runs in the
// worker thread, using SQL.js with absurd-sql.
class ElectricDatabase {
  async init(locatorPattern: string): Promise<void> {
    const locateFileFn = WasmLocator.deserialise(locatorPattern)

    console.log('XXX ready to initSqljs', {locateFile: locateFileFn})
  }
}

// Runs in the worker thread and handles the communication with the
// `ElectricDatabase`, mapping postMessages to db method calls.
export class ElectricWorker {
  db: ElectricDatabase
  worker: Worker

  constructor(db: ElectricDatabase, worker: Worker) {
    this.db = db
    this.worker = worker
    this.worker.addEventListener('message', this.handleCall.bind(this))
  }

  async handleCall(event: MessageEvent) {
    const data = event.data as Request
    const { requestId, method, args } = data

    try {
      const dbFn = Reflect.get(this.db, method)
      const result = await dbFn.apply(this.db, args)

      this.dispatchResult(requestId, result)
    }
    catch (err) {
      this.dispatchError(requestId, err)
    }
  }

  dispatchError(requestId: string, error: any) {
    const resp: Response = {
      status: 'error',
      result: error,
      requestId: requestId
    }

    this.worker.postMessage(resp)
  }

  dispatchResult(requestId: string, result: any) {
    const resp: Response = {
      status: 'success',
      result: result,
      requestId: requestId
    }

    this.worker.postMessage(resp)
  }

  // Static entrypoint allows us to maintain a reference to
  // the constructed instance.
  static start(worker: Worker):void {
    const db = new ElectricDatabase()
    const ref = new ElectricWorker(db, worker)

    refs.push(ref)
  }
}

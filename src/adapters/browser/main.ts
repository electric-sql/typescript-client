import { DbName } from '../../util/types'
import { WorkerClient } from './client'

// This is the proxy client that runs in the main thread, using the
// workerClient to proxy method calls on to the ElectricDatabase in
// the worker thread.
export class MainThreadDatabaseProxy {
  dbName: DbName
  workerClient: WorkerClient

  constructor(dbName: DbName, workerClient: WorkerClient) {
    this.dbName = dbName
    this.workerClient = workerClient
  }
}

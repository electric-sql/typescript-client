import { DbName } from '../../util/types'

import { WorkerClient } from './client'
import { LocateFileOpts, WasmLocator } from './locator'
import { MainThreadDatabaseProxy } from './main'

export { ElectricWorker } from './worker'

// XXX what we really want to do is:
// - instantiate a ProxyClient
// - that provides the SQL.js client API
// - but instead of doing the commands
// - it calls the worker process
// - where the API has an instance of the real client

// the query adapter wrapps the proxyclient in the main thread
// the filesystem and satellite stuff is in the worker thread
// and the notifier machinery needs to go through this req/resp interface
export const initElectricSqlJs = (worker: Worker, opts: LocateFileOpts = {}): Promise<object> => {
  const client = new WorkerClient(worker)
  const locator = new WasmLocator(opts)
  const pattern = locator.serialise()

  // We return a class to emulate the SQL.js API of
  // `initSqlJs(...).then(SQL => new SQL.Database)`
  class Database {
    constructor(dbName: DbName) {
      return new MainThreadDatabaseProxy(dbName, client)
    }
  }
  const SQL = {
    Database
  }

  return client.request('init', pattern)
    .then(() => SQL)
}

import { Filesystem } from '../filesystems/index'
import { Notifier } from '../notifiers/index'
import { sleepAsync } from '../util/timer'
import { DbName } from '../util/types'

import { Satellite, SatelliteDatabaseAdapter } from './index'
import { BaseRegistry } from './registry'

export class MockSatelliteProcess implements Satellite {
  dbAdapter: SatelliteDatabaseAdapter
  dbName: DbName
  fs: Filesystem
  notifier: Notifier

  constructor(dbName: DbName, dbAdapter: SatelliteDatabaseAdapter, fs: Filesystem, notifier: Notifier) {
    this.dbAdapter = dbAdapter
    this.dbName = dbName
    this.fs = fs
    this.notifier = notifier
  }

  async stop(): Promise<void> {
    await sleepAsync(50)
  }

  static async start(dbName: DbName, dbAdapter: SatelliteDatabaseAdapter, fs: Filesystem, notifier: Notifier): Promise<Satellite> {
    await sleepAsync(50)

    return new MockSatelliteProcess(dbName, dbAdapter, fs, notifier)
  }
}

export class MockRegistry extends BaseRegistry {
  startProcess(dbName: DbName, dbAdapter: SatelliteDatabaseAdapter, fs: Filesystem, notifier: Notifier): Promise<Satellite> {
    return MockSatelliteProcess.start(dbName, dbAdapter, fs, notifier)
  }
}

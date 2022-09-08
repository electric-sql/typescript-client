import { Filesystem } from '../filesystems/index'
import { Notifier } from '../notifiers/index'
import { DbName } from '../util/types'

import { Satellite, SatelliteDatabaseAdapter } from './index'

export class SatelliteProcess implements Satellite {
  dbName: DbName
  dbAdapter: SatelliteDatabaseAdapter
  fs: Filesystem
  notifier: Notifier

  constructor(dbName: DbName, dbAdapter: SatelliteDatabaseAdapter, fs: Filesystem, notifier: Notifier) {
    this.dbAdapter = dbAdapter
    this.dbName = dbName
    this.fs = fs
    this.notifier = notifier
  }

  async stop(): Promise<void> {
    // XXX ...
  }

  static async start(dbName: DbName, dbAdapter: SatelliteDatabaseAdapter, fs: Filesystem, notifier: Notifier): Promise<Satellite> {
    const satellite = new SatelliteProcess(dbName, dbAdapter, fs, notifier)

    // await satellite.startListening()

    return satellite
  }
}

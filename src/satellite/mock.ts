import { Filesystem } from '../filesystems/index'
import { Notifier } from '../notifiers/index'
import { sleepAsync } from '../util/timer'
import { DbName } from '../util/types'

import { Satellite, SatelliteDatabaseAdapter, SatelliteOpts, SatelliteOverrides } from './index'
import { DEFAULTS } from './config'
import { BaseRegistry } from './registry'


export class MockSatelliteProcess implements Satellite {
  dbAdapter: SatelliteDatabaseAdapter
  dbName: DbName
  fs: Filesystem
  notifier: Notifier
  opts: SatelliteOpts

  constructor(dbName: DbName, dbAdapter: SatelliteDatabaseAdapter, fs: Filesystem, notifier: Notifier, opts: SatelliteOpts) {
    this.dbAdapter = dbAdapter
    this.dbName = dbName
    this.fs = fs
    this.notifier = notifier
    this.opts = opts
  }

  async start(): void {
    await sleepAsync(50)
  }

  async stop(): Promise<void> {
    await sleepAsync(50)
  }
}

export class MockRegistry extends BaseRegistry {
  startProcess(
        dbName: DbName,
        dbAdapter: SatelliteDatabaseAdapter,
        fs: Filesystem,
        notifier: Notifier,
        authState?: AuthState,
        overrides?: SatelliteOverrides
      ): Promise<Satellite> {
    const opts = {...DEFAULTS, ...overrides}

    const satellite = new MockSatelliteProcess(dbName, dbAdapter, fs, notifier, opts)
    await satellite.start(authState)

    return satellite
  }
}

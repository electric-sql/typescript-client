import { AnyDatabase, AnyElectricDatabase, AnyElectrifiedDatabase } from '../drivers/index'
import { DatabaseAdapter } from '../electric/adapter'
import { Migration, Migrator } from '../migrators/index'
import { Notifier } from '../notifiers/index'
import { Registry } from '../satellite/index'
import { Socket } from '../sockets/index'
import { proxyOriginal } from '../proxy/original'
import { DbName } from '../util/types'
import { ElectricConfig } from '../satellite/config'

// These are the options that should be provided to the adapter's electrify
// entrypoint. They are all optional to optionally allow different / mock
// implementations to be passed in to facilitate testing.
export interface ElectrifyOptions {
  migrations?: Migration[],
  adapter?: DatabaseAdapter,
  migrator?: Migrator,
  notifier?: Notifier,
  socket?: Socket,
  registry?: Registry,
  config: ElectricConfig,  
}

// This is the namespace that's patched onto the user's database client
// (technically via the proxy machinery) as the `.electric` property.
export class ElectricNamespace {
  adapter: DatabaseAdapter
  notifier: Notifier

  constructor(adapter: DatabaseAdapter, notifier: Notifier) {
    this.adapter = adapter
    this.notifier = notifier
  }

  // We lift this function a level so the user can call
  // `db.electric.potentiallyChanged()` rather than the longer / more redundant
  // `db.electric.notifier.potentiallyChanged()`.
  potentiallyChanged(): void {
    this.notifier.potentiallyChanged()
  }
}

// This is the primary `electrify()` endpoint that the individal drivers
// call once they've constructed their implementations. This function can
// also be called directly by tests that don't want to go via the adapter
// entrypoints in order to avoid loading the environment dependencies.
export const electrify = async (
      dbName: DbName,
      db: AnyDatabase,
      electric: AnyElectricDatabase,
      adapter: DatabaseAdapter,
      migrator: Migrator,
      notifier: Notifier,
      socket: Socket,
      registry: Registry,
      opts: ElectrifyOptions,
    ): Promise<AnyElectrifiedDatabase> => {
  await registry.ensureStarted(dbName, adapter, migrator, notifier, socket, opts)

  return proxyOriginal(db, electric)
}

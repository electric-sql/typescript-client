import { AnyDatabase, AnyElectricDatabase } from '../drivers/index'
import { DatabaseAdapter } from '../electric/adapter'
import { Migrator } from '../migrators/index'
import { Notifier } from '../notifiers/index'
import { Registry } from '../satellite/index'
import { proxyOriginal } from '../proxy/original'
import { DbName } from '../util/types'

// These are the options that should be provided to the adapter's electrify
// entrypoint. They are all optional to optionally allow different / mock
// implementations to be passed in to facilitate testing.
export interface ElectrifyOptions {
  adapter?: DatabaseAdapter,
  migrationsPath?: string,
  migrator?: Migrator,
  notifier?: Notifier,
  registry?: Registry
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
export const electrify = (
      dbName: DbName,
      db: AnyDatabase,
      electric: AnyElectricDatabase,
      adapter: DatabaseAdapter,
      migrator: Migrator,
      notifier: Notifier,
      registry: Registry
    ): Promise<any> => {
  return registry.ensureStarted(dbName, adapter, migrator, notifier)
    .then(() => proxyOriginal(db, electric))
}

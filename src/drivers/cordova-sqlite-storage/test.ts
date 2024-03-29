// Safe entrypoint for tests that avoids importing the React Native
// specific dependencies.
import { DbName } from '../../util/types'

import {
  ElectricNamespace,
  electrify,
  ElectrifyOptions,
} from '../../electric/index'

import { MockMigrator } from '../../migrators/mock'
import { Notifier } from '../../notifiers/index'
import { MockNotifier } from '../../notifiers/mock'
import { MockRegistry } from '../../satellite/mock'

import { DatabaseAdapter } from './adapter'
import { Database, ElectricDatabase, ElectrifiedDatabase } from './database'
import { MockDatabase } from './mock'
import { MockSocketFactory } from '../../sockets/mock'
import { MockConsoleClient } from '../../auth/mock'

type RetVal<N extends Notifier> = Promise<[Database, N, ElectrifiedDatabase]>

const testConfig = { app: 'app', env: 'default', migrations: [] }

export const initTestable = async <N extends Notifier = MockNotifier>(
  dbName: DbName,
  config = testConfig,
  opts?: ElectrifyOptions
): RetVal<N> => {
  const db = new MockDatabase(dbName)

  const adapter = opts?.adapter || new DatabaseAdapter(db)
  const notifier = (opts?.notifier as N) || new MockNotifier(dbName)
  const migrator = opts?.migrator || new MockMigrator()
  const socketFactory = opts?.socketFactory || new MockSocketFactory()
  const console = opts?.console || new MockConsoleClient()
  const registry = opts?.registry || new MockRegistry()

  const namespace = new ElectricNamespace(adapter, notifier)
  const electric = new ElectricDatabase(db, namespace)

  const electrified = await electrify(
    dbName,
    db,
    electric,
    adapter,
    migrator,
    notifier,
    socketFactory,
    console,
    registry,
    config
  )
  return [db, notifier, electrified as unknown as ElectrifiedDatabase]
}

// Safe entrypoint for tests that avoids importing the React Native
// specific dependencies.
import { DbName } from '../../util/types'

import { ElectricNamespace, ElectrifyOptions, electrify } from '../../electric/index'

import { MockMigrator } from '../../migrators/mock'
import { Notifier } from '../../notifiers/index'
import { MockNotifier } from '../../notifiers/mock'
import { MockRegistry } from '../../satellite/mock'
import { ElectricConfig } from '../../satellite/config'

import { DatabaseAdapter } from './adapter'
import { Database, ElectricDatabase, ElectrifiedDatabase } from './database'
import { MockDatabase} from './mock'
import { MockSocket } from '../../sockets/mock'

type RetVal = Promise<[Database, Notifier, ElectrifiedDatabase]>

const testConfig =  {app: "app", env: "test", replication: {address: "", port: 0}}

export const initTestable = async (dbName: DbName, config: ElectricConfig = testConfig, opts?: ElectrifyOptions): RetVal => {
  const db = new MockDatabase(dbName)

  const adapter = opts?.adapter || new DatabaseAdapter(db)
  const migrator = opts?.migrator || new MockMigrator()
  const notifier = opts?.notifier || new MockNotifier(dbName)
  const socket = opts?.socket || new MockSocket()
  const registry = opts?.registry || new MockRegistry()

  const namespace = new ElectricNamespace(adapter, notifier)
  const electric = new ElectricDatabase(db, namespace)

  const electrified = await electrify(dbName, db, electric, adapter, migrator, notifier, socket, registry, config)
  return [db, notifier, electrified as unknown as ElectrifiedDatabase]
}

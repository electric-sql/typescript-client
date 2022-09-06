// Safe entrypoint for tests that avoids importing the React Native
// specific dependencies.
import { DbName } from '../../util/types'

import { DEFAULTS } from '../../electric/config'
import { ElectricNamespace, ElectrifyOptions, electrify } from '../../electric/index'

import { MockFilesystem } from '../../filesystems/mock'
import { CommitNotifier } from '../../notifiers/index'
import { MockCommitNotifier } from '../../notifiers/mock'
import { globalRegistry } from '../../satellite/registry'

import { Database, ElectricDatabase } from './database'
import { MockDatabase } from './mock'
import { QueryAdapter } from './query'
import { SatelliteDatabaseAdapter } from './satellite'

type RetVal = Promise<[Database, CommitNotifier, Database]>

export const initTestable = (dbName: DbName, opts: ElectrifyOptions = {}): RetVal => {
  const db = new MockDatabase(dbName)

  const commitNotifier = opts.commitNotifier || new MockCommitNotifier(dbName)
  const fs = opts.filesystem || new MockFilesystem()
  const queryAdapter = opts.queryAdapter || new QueryAdapter(db, DEFAULTS.namespace)
  const satelliteDbAdapter = opts.satelliteDbAdapter || new SatelliteDatabaseAdapter(db)
  const satelliteRegistry = opts.satelliteRegistry || globalRegistry

  const namespace = new ElectricNamespace(commitNotifier, queryAdapter)
  const electric = new ElectricDatabase(db, namespace)

  return electrify(dbName, db, electric, fs, satelliteDbAdapter, satelliteRegistry)
    .then((electrified) => [db, commitNotifier, electrified])
}

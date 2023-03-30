// N.b.: importing this module is an entrypoint that imports the Cordova
// environment dependencies. Specifically `./filesystems/cordova`. You can
// use the alternative entrypoint in `./test` to avoid importing this.
import { DbName } from '../../util/types'

import {
  ElectrifyOptions,
  electrify as baseElectrify,
} from '../../electric/index'

import { DatabaseAdapter } from './adapter'
import { ElectricConfig } from '../../config'
import { Database } from './database'
import { MockSocketFactory } from '../../sockets/mock'
import { DalNamespace } from '../../client/model/dalNamespace'
import { DBDescription } from '../../client/model/dbDescription'

export { DatabaseAdapter }
export type { Database }

export const electrify = async <
  T extends Database,
  DB extends DBDescription<any>
>(
  db: T,
  dbDescription: DB,
  config: ElectricConfig,
  opts?: ElectrifyOptions
): Promise<DalNamespace<DB>> => {
  const dbName: DbName = db.dbname!
  const adapter = opts?.adapter || new DatabaseAdapter(db)
  const socketFactory = opts?.socketFactory || new MockSocketFactory()

  const namespace = await baseElectrify(
    dbName,
    dbDescription,
    adapter,
    socketFactory,
    config,
    opts
  )

  return namespace
}

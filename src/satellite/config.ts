import { QualifiedTablename } from '../util/tablename'

export interface SatelliteOpts {
  // The database table where Satellite keeps its processing metadata.
  metaTable: QualifiedTablename,
  // The database table where change operations are written to by the triggers
  // automatically added to all tables in the user defined DDL schema.
  oplogTable: QualifiedTablename,
  // Polls the database for changes every `pollingInterval` milliseconds.
  pollingInterval: number,
  // Throttle snapshotting to once per `minSnapshotWindow` milliseconds.
  minSnapshotWindow: number,
  // The last rowid that was *sent to* the server.
  lastSentRowId: number,
  // The last rowid that was *acknowledged by* the server.
  lastAckdRowId: number
}

// As above but optional.
export interface SatelliteOverrides {
  metaTable?: QualifiedTablename,
  oplogTable?: QualifiedTablename,
  pollingInterval?: number,
  minSnapshotWindow?: number,
  lastSentRowId?: number,
  lastAckdRowId?: number
}

export const satelliteDefaults: SatelliteOpts = {
  metaTable: new QualifiedTablename('main', '_electric_meta'),
  oplogTable: new QualifiedTablename('main', '_electric_oplog'),
  pollingInterval: 2000,
  minSnapshotWindow: 40,
  lastSentRowId: -1,
  lastAckdRowId: -1
}

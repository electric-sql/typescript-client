import { SatelliteOpts } from './index'

export const DEFAULTS: SatelliteOpts = {
  metaTable: new QualifiedTablename('main', '_satellite_meta'),
  oplogTable: new QualifiedTablename('main', '_oplog'),
  pollingInterval: 2000,
  minSnapshotWindow: 40,
  lastSentRowId: -1,
  lastAckdRowId: -1
}

export const OPERATIONS = {
  insert: 'INSERT',
  update: 'UPDATE',
  delete: 'DELETE',
  upsert: 'UPSERT'
}

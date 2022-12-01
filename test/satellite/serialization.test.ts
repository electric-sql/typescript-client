import {
  SatInStopReplicationResp,
  SatInStartReplicationResp,
  SatOpCommit,
  SatOpBegin,
  SatOpLog,
  SatPingReq,
  SatOpInsert,
  SatRelation,
  SatRelationColumn,
  SatRelation_RelationType,
  SatOpUpdate,
  SatOpDelete,
  SatTransOp,
  SatAuthResp,
  SatPingResp,
} from '../../src/_generated/proto/satellite';
import { WebSocketNodeFactory } from '../../src/sockets/node';
import { SatelliteClient, serializeRow, deserializeRow } from '../../src/satellite/client';
import { SatelliteWSServerStub } from './server_ws_stub';
import test from 'ava'
import Long from 'long';
import { AckType, ChangeType, SatelliteErrorCode, Transaction, Relation } from '../../src/util/types';
import { base64, DEFAULT_LSN, bytesToNumber, typeEncoder, numberToBytes } from '../../src/util/common'
import { getObjFromString, getTypeFromCode, getTypeFromString, SatPbMsg } from '../../src/util/proto';
import { OplogEntry, toTransactions } from '../../src/satellite/oplog';
import { relations } from './common';
import { MockNotifier } from '../../src/notifiers';


test("serialize/deserialize row data", async t => {
  const rel: Relation = {
    id: 1,
    schema: 'schema',
    table: 'table',
    tableType: SatRelation_RelationType.TABLE,
    columns: [
      { name: 'name1', type: 'TEXT' },
      { name: 'name2', type: 'TEXT' },
      { name: 'name3', type: 'TEXT' }
  ]}

  const record: Record = {name1: "Hello", 'name2': "World!", 'name3': undefined }
  const s_row = serializeRow(record, rel)
  const d_row = deserializeRow(s_row, rel)

  t.deepEqual(record, d_row)
})

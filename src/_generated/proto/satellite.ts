/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal.js";
import { messageTypeRegistry } from "../typeRegistry.js";

export const protobufPackage = "Electric.Satellite.v1_0";

/**
 * This file defines protobuf protocol for Satellite <> Electric replication
 * Messages are sent over the wire in the following format:
 *
 * Size:32, MsgType:8, Msg/binary
 *
 * In this document there is a notation of the Client/Server and
 * Producer/Consumer which are used to annotate messages.
 *
 * Server is expected to be one of the Electric instances, while Client is a
 * client application that talks to Electric via Satellite library, or any other
 * enitty that implements this protocol.
 *
 * Producer and Consumer are the corresponding roles Client and Server play in
 * replication process. Consumer requests replication from the Producer, and
 * periodically answer Ping requests form the Prodicer to acknowledge
 * successful replication. Consumer may also send such Ping requests, if the
 * bidirectional replication is enabled. If one of the parties is not involved
 * in the replication lsn field may be left empty.
 */

export enum SatAuthHeader {
  /** UNSPECIFIED - protobuff required to have this by default */
  UNSPECIFIED = 0,
  /**
   * PROTO_VERSION - required header
   * protobuf protocol version, this version is picked from
   * the package statement of this protobuf file, for example "Electric.Satellite.v10_13"
   */
  PROTO_VERSION = 1,
  /**
   * SCHEMA_VERSION - required header
   * last schema version applied on the client. Is prepended with the hash
   * algorithm type, for example: "sha256:71c9f..."
   */
  SCHEMA_VERSION = 2,
  UNRECOGNIZED = -1,
}

/** Ping request. Can be send by any party */
export interface SatPingReq {
  $type: "Electric.Satellite.v1_0.SatPingReq";
}

/** Ping response. */
export interface SatPingResp {
  $type: "Electric.Satellite.v1_0.SatPingResp";
  /**
   * If LSN is present, it conveys to producer the latest LSN position that
   * was applied on the consumer side. If there is no active replication
   * ongoing the field should be left 0
   */
  lsn?: Uint8Array | undefined;
}

export interface SatAuthHeaderPair {
  $type: "Electric.Satellite.v1_0.SatAuthHeaderPair";
  key: SatAuthHeader;
  value: string;
}

/**
 * (Client) Auth request
 *
 * Client request is the first request that the client should send before
 * executing any other request
 */
export interface SatAuthReq {
  $type: "Electric.Satellite.v1_0.SatAuthReq";
  /**
   * Identity of the Satellite application. Is expected to be something like
   * UUID. Required field
   */
  id: string;
  /** Authentication token, auth method specific, required */
  token: string;
  /** Headers, required */
  headers: SatAuthHeaderPair[];
}

/** (Server) Auth response */
export interface SatAuthResp {
  $type: "Electric.Satellite.v1_0.SatAuthResp";
  /** Identity of the Server */
  id: string;
  /** Headers optional */
  headers: SatAuthHeaderPair[];
}

/**
 * General purpose error message, that could be sent to any request from any
 * sides. FIXME: We might want to separate that into Client/Server parts
 */
export interface SatErrorResp {
  $type: "Electric.Satellite.v1_0.SatErrorResp";
  errorType: SatErrorResp_ErrorCode;
}

export enum SatErrorResp_ErrorCode {
  INTERNAL = 0,
  AUTH_REQUIRED = 1,
  AUTH_FAILED = 2,
  REPLICATION_FAILED = 3,
  INVALID_REQUEST = 4,
  PROTO_VSN_MISSMATCH = 5,
  SCHEMA_VSN_MISSMATCH = 6,
  UNRECOGNIZED = -1,
}

/** (Consumer) Starts replication stream from producer to consumer */
export interface SatInStartReplicationReq {
  $type: "Electric.Satellite.v1_0.SatInStartReplicationReq";
  /** LSN position of the log on the producer side */
  lsn: Uint8Array;
  options: SatInStartReplicationReq_Option[];
  /**
   * Amount of message after which SatPingResp message is expected to be
   * delivered when SYNC_MODE is used
   */
  syncBatchSize: number;
}

export enum SatInStartReplicationReq_Option {
  NONE = 0,
  /**
   * LAST_ACKNOWLEDGED - Flag that indicates to Producer, to start replication from the latest
   * position that have been acknowledged by this Consumer. In such a case
   * provided lsn will be ignored
   */
  LAST_ACKNOWLEDGED = 1,
  /**
   * SYNC_MODE - In sync mode consumer of the stream is expected to send SatPingResp
   * message for every committed batch of SatOpLog messages
   */
  SYNC_MODE = 2,
  /**
   * FIRST_LSN - Asks receiver to start replication from the first transaction in the log
   * without necessity to know about the actual internal format of the LSN
   */
  FIRST_LSN = 3,
  /**
   * LAST_LSN - Asks receiver to start replication from the last position in the log,
   * whatever this position is. Used for tests only.
   */
  LAST_LSN = 4,
  UNRECOGNIZED = -1,
}

/** (Producer) Acknowledgement that replication have been started */
export interface SatInStartReplicationResp {
  $type: "Electric.Satellite.v1_0.SatInStartReplicationResp";
}

/** (Consumer) Request to stop replication */
export interface SatInStopReplicationReq {
  $type: "Electric.Satellite.v1_0.SatInStopReplicationReq";
}

/** (Producer) Acknowledgement that repliation have been stopped */
export interface SatInStopReplicationResp {
  $type: "Electric.Satellite.v1_0.SatInStopReplicationResp";
}

export interface SatRelationColumn {
  $type: "Electric.Satellite.v1_0.SatRelationColumn";
  name: string;
  type: string;
}

export interface SatRelation {
  $type: "Electric.Satellite.v1_0.SatRelation";
  schemaName: string;
  tableType: SatRelation_RelationType;
  tableName: string;
  /**
   * Volatile identity defined at the start of the replication protocol may or
   * may not be persisted is used in SatTransOp operations, to indicate
   * relation the operation is working on.
   */
  relationId: number;
  columns: SatRelationColumn[];
}

export enum SatRelation_RelationType {
  TABLE = 0,
  INDEX = 1,
  VIEW = 2,
  TRIGGER = 3,
  UNRECOGNIZED = -1,
}

/**
 * (Producer) Type defines replication messages, that flow from Producer once
 * the replication is established. Message contains operations log. Operations
 * should go in the LSN order. Begin and Commit opetations corresponds to
 * transaction boundaries.
 * Transactions are guranteed not to be mixed, and will folllow one by one.
 */
export interface SatOpLog {
  $type: "Electric.Satellite.v1_0.SatOpLog";
  ops: SatTransOp[];
}

/**
 * (Producer) Single operation, should be only send as part of the SatOplog
 * message
 */
export interface SatTransOp {
  $type: "Electric.Satellite.v1_0.SatTransOp";
  begin?: SatOpBegin | undefined;
  commit?: SatOpCommit | undefined;
  update?: SatOpUpdate | undefined;
  insert?: SatOpInsert | undefined;
  delete?: SatOpDelete | undefined;
}

/**
 * (Producer) Replication message that indicates transaction boundaries
 * should be only send as payload in the SatTransOp message
 */
export interface SatOpBegin {
  $type: "Electric.Satellite.v1_0.SatOpBegin";
  commitTimestamp: Long;
  transId: string;
  /**
   * Lsn position that points to first data segment of transaction in the
   * WAL
   */
  lsn: Uint8Array;
  /**
   * Globally unique id of the source that transaction originated from. For
   * data coming from Satellite this field is ignored. For data coming from
   * Electric this field can be used to deduce if the incoming transaction
   * originated on this Satellite instance or not.
   */
  origin?: string | undefined;
}

/**
 * (Producer) Replication message that indicates transaction boundaries
 * should be only send as payload in the SatTransOp message
 */
export interface SatOpCommit {
  $type: "Electric.Satellite.v1_0.SatOpCommit";
  commitTimestamp: Long;
  transId: string;
  lsn: Uint8Array;
}

/**
 * (Producer) Data manipulation message, that only should be part of the
 * SatTransOp message
 */
export interface SatOpInsert {
  $type: "Electric.Satellite.v1_0.SatOpInsert";
  relationId: number;
  rowData:
    | SatOpRow
    | undefined;
  /** dependency information */
  tags: string[];
}

/**
 * (Producer) Data manipulation message, that only should be part of the
 * SatTransOp message
 */
export interface SatOpUpdate {
  $type: "Electric.Satellite.v1_0.SatOpUpdate";
  relationId: number;
  rowData: SatOpRow | undefined;
  oldRowData:
    | SatOpRow
    | undefined;
  /** dependency information */
  tags: string[];
}

/**
 * (Producer) Data manipulation message, that only should be part of the
 * SatTransOp message
 */
export interface SatOpDelete {
  $type: "Electric.Satellite.v1_0.SatOpDelete";
  relationId: number;
  oldRowData:
    | SatOpRow
    | undefined;
  /** dependency information */
  tags: string[];
}

/**
 * Message is sent when server is migrated while client is still connected It's
 * up to the client to immediately perform a migration or stop replication
 * stream if it's ongoing.
 */
export interface SatMigrationNotification {
  $type: "Electric.Satellite.v1_0.SatMigrationNotification";
  /** all fields are required */
  oldSchemaVersion: string;
  oldSchemaHash: string;
  newSchemaVersion: string;
  newSchemaHash: string;
}

/** Message that corresponds to the single row. */
export interface SatOpRow {
  $type: "Electric.Satellite.v1_0.SatOpRow";
  nullsBitmask: Uint8Array;
  /**
   * values may contain binaries with size 0 for NULLs and empty values
   * check nulls_bitmask to differentiate between the two
   */
  values: Uint8Array[];
}

/**
 * A migration message, originating in Postgres, captured via event triggers,
 * propated to electric, converted from postgres to the equivalent sqlite
 * statement and inserted into the replication stream
 *
 * Each migration message includes the sql strings to execute on the satellite
 * client as well as metadata information about the resulting structure of the
 * changed tables.
 */
export interface SatMigration {
  $type: "Electric.Satellite.v1_0.SatMigration";
  /**
   * the migration version as specified by the developer and put into
   * the postgresql migration as an electric function call
   */
  version: string;
  /** a list of sql ddl statements to apply, converted from the pg originals */
  stmts: SatMigration_Stmt[];
  /** a list of the table definitions resulting from applying these migrations */
  tables: SatMigration_Table[];
}

export enum SatMigration_Type {
  CREATE_TABLE = 0,
  CREATE_INDEX = 1,
  ALTER_ADD_COLUMN = 6,
  UNRECOGNIZED = -1,
}

export interface SatMigration_Stmt {
  $type: "Electric.Satellite.v1_0.SatMigration.Stmt";
  type: SatMigration_Type;
  sql: string;
}

export interface SatMigration_Column {
  $type: "Electric.Satellite.v1_0.SatMigration.Column";
  name: string;
  sqliteType: string;
  pgType: string;
}

export interface SatMigration_ForeignKey {
  $type: "Electric.Satellite.v1_0.SatMigration.ForeignKey";
  /** the columns in the child table that point to the parent */
  fkCols: string[];
  /** the parent table */
  pkTable: string;
  /** the cols in the parent table */
  pkCols: string[];
}

export interface SatMigration_Table {
  $type: "Electric.Satellite.v1_0.SatMigration.Table";
  name: string;
  columns: SatMigration_Column[];
  fks: SatMigration_ForeignKey[];
}

function createBaseSatPingReq(): SatPingReq {
  return { $type: "Electric.Satellite.v1_0.SatPingReq" };
}

export const SatPingReq = {
  $type: "Electric.Satellite.v1_0.SatPingReq" as const,

  encode(_: SatPingReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatPingReq {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatPingReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatPingReq>, I>>(base?: I): SatPingReq {
    return SatPingReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatPingReq>, I>>(_: I): SatPingReq {
    const message = createBaseSatPingReq();
    return message;
  },
};

messageTypeRegistry.set(SatPingReq.$type, SatPingReq);

function createBaseSatPingResp(): SatPingResp {
  return { $type: "Electric.Satellite.v1_0.SatPingResp", lsn: undefined };
}

export const SatPingResp = {
  $type: "Electric.Satellite.v1_0.SatPingResp" as const,

  encode(message: SatPingResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.lsn !== undefined) {
      writer.uint32(10).bytes(message.lsn);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatPingResp {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatPingResp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.lsn = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatPingResp>, I>>(base?: I): SatPingResp {
    return SatPingResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatPingResp>, I>>(object: I): SatPingResp {
    const message = createBaseSatPingResp();
    message.lsn = object.lsn ?? undefined;
    return message;
  },
};

messageTypeRegistry.set(SatPingResp.$type, SatPingResp);

function createBaseSatAuthHeaderPair(): SatAuthHeaderPair {
  return { $type: "Electric.Satellite.v1_0.SatAuthHeaderPair", key: 0, value: "" };
}

export const SatAuthHeaderPair = {
  $type: "Electric.Satellite.v1_0.SatAuthHeaderPair" as const,

  encode(message: SatAuthHeaderPair, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== 0) {
      writer.uint32(8).int32(message.key);
    }
    if (message.value !== "") {
      writer.uint32(18).string(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatAuthHeaderPair {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatAuthHeaderPair();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.int32() as any;
          break;
        case 2:
          message.value = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatAuthHeaderPair>, I>>(base?: I): SatAuthHeaderPair {
    return SatAuthHeaderPair.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatAuthHeaderPair>, I>>(object: I): SatAuthHeaderPair {
    const message = createBaseSatAuthHeaderPair();
    message.key = object.key ?? 0;
    message.value = object.value ?? "";
    return message;
  },
};

messageTypeRegistry.set(SatAuthHeaderPair.$type, SatAuthHeaderPair);

function createBaseSatAuthReq(): SatAuthReq {
  return { $type: "Electric.Satellite.v1_0.SatAuthReq", id: "", token: "", headers: [] };
}

export const SatAuthReq = {
  $type: "Electric.Satellite.v1_0.SatAuthReq" as const,

  encode(message: SatAuthReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.token !== "") {
      writer.uint32(18).string(message.token);
    }
    for (const v of message.headers) {
      SatAuthHeaderPair.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatAuthReq {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatAuthReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string();
          break;
        case 2:
          message.token = reader.string();
          break;
        case 3:
          message.headers.push(SatAuthHeaderPair.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatAuthReq>, I>>(base?: I): SatAuthReq {
    return SatAuthReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatAuthReq>, I>>(object: I): SatAuthReq {
    const message = createBaseSatAuthReq();
    message.id = object.id ?? "";
    message.token = object.token ?? "";
    message.headers = object.headers?.map((e) => SatAuthHeaderPair.fromPartial(e)) || [];
    return message;
  },
};

messageTypeRegistry.set(SatAuthReq.$type, SatAuthReq);

function createBaseSatAuthResp(): SatAuthResp {
  return { $type: "Electric.Satellite.v1_0.SatAuthResp", id: "", headers: [] };
}

export const SatAuthResp = {
  $type: "Electric.Satellite.v1_0.SatAuthResp" as const,

  encode(message: SatAuthResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    for (const v of message.headers) {
      SatAuthHeaderPair.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatAuthResp {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatAuthResp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string();
          break;
        case 3:
          message.headers.push(SatAuthHeaderPair.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatAuthResp>, I>>(base?: I): SatAuthResp {
    return SatAuthResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatAuthResp>, I>>(object: I): SatAuthResp {
    const message = createBaseSatAuthResp();
    message.id = object.id ?? "";
    message.headers = object.headers?.map((e) => SatAuthHeaderPair.fromPartial(e)) || [];
    return message;
  },
};

messageTypeRegistry.set(SatAuthResp.$type, SatAuthResp);

function createBaseSatErrorResp(): SatErrorResp {
  return { $type: "Electric.Satellite.v1_0.SatErrorResp", errorType: 0 };
}

export const SatErrorResp = {
  $type: "Electric.Satellite.v1_0.SatErrorResp" as const,

  encode(message: SatErrorResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.errorType !== 0) {
      writer.uint32(8).int32(message.errorType);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatErrorResp {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatErrorResp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.errorType = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatErrorResp>, I>>(base?: I): SatErrorResp {
    return SatErrorResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatErrorResp>, I>>(object: I): SatErrorResp {
    const message = createBaseSatErrorResp();
    message.errorType = object.errorType ?? 0;
    return message;
  },
};

messageTypeRegistry.set(SatErrorResp.$type, SatErrorResp);

function createBaseSatInStartReplicationReq(): SatInStartReplicationReq {
  return {
    $type: "Electric.Satellite.v1_0.SatInStartReplicationReq",
    lsn: new Uint8Array(),
    options: [],
    syncBatchSize: 0,
  };
}

export const SatInStartReplicationReq = {
  $type: "Electric.Satellite.v1_0.SatInStartReplicationReq" as const,

  encode(message: SatInStartReplicationReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.lsn.length !== 0) {
      writer.uint32(10).bytes(message.lsn);
    }
    writer.uint32(18).fork();
    for (const v of message.options) {
      writer.int32(v);
    }
    writer.ldelim();
    if (message.syncBatchSize !== 0) {
      writer.uint32(24).int32(message.syncBatchSize);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatInStartReplicationReq {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatInStartReplicationReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.lsn = reader.bytes();
          break;
        case 2:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.options.push(reader.int32() as any);
            }
          } else {
            message.options.push(reader.int32() as any);
          }
          break;
        case 3:
          message.syncBatchSize = reader.int32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatInStartReplicationReq>, I>>(base?: I): SatInStartReplicationReq {
    return SatInStartReplicationReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatInStartReplicationReq>, I>>(object: I): SatInStartReplicationReq {
    const message = createBaseSatInStartReplicationReq();
    message.lsn = object.lsn ?? new Uint8Array();
    message.options = object.options?.map((e) => e) || [];
    message.syncBatchSize = object.syncBatchSize ?? 0;
    return message;
  },
};

messageTypeRegistry.set(SatInStartReplicationReq.$type, SatInStartReplicationReq);

function createBaseSatInStartReplicationResp(): SatInStartReplicationResp {
  return { $type: "Electric.Satellite.v1_0.SatInStartReplicationResp" };
}

export const SatInStartReplicationResp = {
  $type: "Electric.Satellite.v1_0.SatInStartReplicationResp" as const,

  encode(_: SatInStartReplicationResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatInStartReplicationResp {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatInStartReplicationResp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatInStartReplicationResp>, I>>(base?: I): SatInStartReplicationResp {
    return SatInStartReplicationResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatInStartReplicationResp>, I>>(_: I): SatInStartReplicationResp {
    const message = createBaseSatInStartReplicationResp();
    return message;
  },
};

messageTypeRegistry.set(SatInStartReplicationResp.$type, SatInStartReplicationResp);

function createBaseSatInStopReplicationReq(): SatInStopReplicationReq {
  return { $type: "Electric.Satellite.v1_0.SatInStopReplicationReq" };
}

export const SatInStopReplicationReq = {
  $type: "Electric.Satellite.v1_0.SatInStopReplicationReq" as const,

  encode(_: SatInStopReplicationReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatInStopReplicationReq {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatInStopReplicationReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatInStopReplicationReq>, I>>(base?: I): SatInStopReplicationReq {
    return SatInStopReplicationReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatInStopReplicationReq>, I>>(_: I): SatInStopReplicationReq {
    const message = createBaseSatInStopReplicationReq();
    return message;
  },
};

messageTypeRegistry.set(SatInStopReplicationReq.$type, SatInStopReplicationReq);

function createBaseSatInStopReplicationResp(): SatInStopReplicationResp {
  return { $type: "Electric.Satellite.v1_0.SatInStopReplicationResp" };
}

export const SatInStopReplicationResp = {
  $type: "Electric.Satellite.v1_0.SatInStopReplicationResp" as const,

  encode(_: SatInStopReplicationResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatInStopReplicationResp {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatInStopReplicationResp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatInStopReplicationResp>, I>>(base?: I): SatInStopReplicationResp {
    return SatInStopReplicationResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatInStopReplicationResp>, I>>(_: I): SatInStopReplicationResp {
    const message = createBaseSatInStopReplicationResp();
    return message;
  },
};

messageTypeRegistry.set(SatInStopReplicationResp.$type, SatInStopReplicationResp);

function createBaseSatRelationColumn(): SatRelationColumn {
  return { $type: "Electric.Satellite.v1_0.SatRelationColumn", name: "", type: "" };
}

export const SatRelationColumn = {
  $type: "Electric.Satellite.v1_0.SatRelationColumn" as const,

  encode(message: SatRelationColumn, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    if (message.type !== "") {
      writer.uint32(18).string(message.type);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatRelationColumn {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatRelationColumn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.type = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatRelationColumn>, I>>(base?: I): SatRelationColumn {
    return SatRelationColumn.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatRelationColumn>, I>>(object: I): SatRelationColumn {
    const message = createBaseSatRelationColumn();
    message.name = object.name ?? "";
    message.type = object.type ?? "";
    return message;
  },
};

messageTypeRegistry.set(SatRelationColumn.$type, SatRelationColumn);

function createBaseSatRelation(): SatRelation {
  return {
    $type: "Electric.Satellite.v1_0.SatRelation",
    schemaName: "",
    tableType: 0,
    tableName: "",
    relationId: 0,
    columns: [],
  };
}

export const SatRelation = {
  $type: "Electric.Satellite.v1_0.SatRelation" as const,

  encode(message: SatRelation, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.schemaName !== "") {
      writer.uint32(10).string(message.schemaName);
    }
    if (message.tableType !== 0) {
      writer.uint32(16).int32(message.tableType);
    }
    if (message.tableName !== "") {
      writer.uint32(26).string(message.tableName);
    }
    if (message.relationId !== 0) {
      writer.uint32(32).uint32(message.relationId);
    }
    for (const v of message.columns) {
      SatRelationColumn.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatRelation {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatRelation();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.schemaName = reader.string();
          break;
        case 2:
          message.tableType = reader.int32() as any;
          break;
        case 3:
          message.tableName = reader.string();
          break;
        case 4:
          message.relationId = reader.uint32();
          break;
        case 5:
          message.columns.push(SatRelationColumn.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatRelation>, I>>(base?: I): SatRelation {
    return SatRelation.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatRelation>, I>>(object: I): SatRelation {
    const message = createBaseSatRelation();
    message.schemaName = object.schemaName ?? "";
    message.tableType = object.tableType ?? 0;
    message.tableName = object.tableName ?? "";
    message.relationId = object.relationId ?? 0;
    message.columns = object.columns?.map((e) => SatRelationColumn.fromPartial(e)) || [];
    return message;
  },
};

messageTypeRegistry.set(SatRelation.$type, SatRelation);

function createBaseSatOpLog(): SatOpLog {
  return { $type: "Electric.Satellite.v1_0.SatOpLog", ops: [] };
}

export const SatOpLog = {
  $type: "Electric.Satellite.v1_0.SatOpLog" as const,

  encode(message: SatOpLog, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.ops) {
      SatTransOp.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatOpLog {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatOpLog();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.ops.push(SatTransOp.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatOpLog>, I>>(base?: I): SatOpLog {
    return SatOpLog.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatOpLog>, I>>(object: I): SatOpLog {
    const message = createBaseSatOpLog();
    message.ops = object.ops?.map((e) => SatTransOp.fromPartial(e)) || [];
    return message;
  },
};

messageTypeRegistry.set(SatOpLog.$type, SatOpLog);

function createBaseSatTransOp(): SatTransOp {
  return {
    $type: "Electric.Satellite.v1_0.SatTransOp",
    begin: undefined,
    commit: undefined,
    update: undefined,
    insert: undefined,
    delete: undefined,
  };
}

export const SatTransOp = {
  $type: "Electric.Satellite.v1_0.SatTransOp" as const,

  encode(message: SatTransOp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.begin !== undefined) {
      SatOpBegin.encode(message.begin, writer.uint32(10).fork()).ldelim();
    }
    if (message.commit !== undefined) {
      SatOpCommit.encode(message.commit, writer.uint32(18).fork()).ldelim();
    }
    if (message.update !== undefined) {
      SatOpUpdate.encode(message.update, writer.uint32(26).fork()).ldelim();
    }
    if (message.insert !== undefined) {
      SatOpInsert.encode(message.insert, writer.uint32(34).fork()).ldelim();
    }
    if (message.delete !== undefined) {
      SatOpDelete.encode(message.delete, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatTransOp {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatTransOp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.begin = SatOpBegin.decode(reader, reader.uint32());
          break;
        case 2:
          message.commit = SatOpCommit.decode(reader, reader.uint32());
          break;
        case 3:
          message.update = SatOpUpdate.decode(reader, reader.uint32());
          break;
        case 4:
          message.insert = SatOpInsert.decode(reader, reader.uint32());
          break;
        case 5:
          message.delete = SatOpDelete.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatTransOp>, I>>(base?: I): SatTransOp {
    return SatTransOp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatTransOp>, I>>(object: I): SatTransOp {
    const message = createBaseSatTransOp();
    message.begin = (object.begin !== undefined && object.begin !== null)
      ? SatOpBegin.fromPartial(object.begin)
      : undefined;
    message.commit = (object.commit !== undefined && object.commit !== null)
      ? SatOpCommit.fromPartial(object.commit)
      : undefined;
    message.update = (object.update !== undefined && object.update !== null)
      ? SatOpUpdate.fromPartial(object.update)
      : undefined;
    message.insert = (object.insert !== undefined && object.insert !== null)
      ? SatOpInsert.fromPartial(object.insert)
      : undefined;
    message.delete = (object.delete !== undefined && object.delete !== null)
      ? SatOpDelete.fromPartial(object.delete)
      : undefined;
    return message;
  },
};

messageTypeRegistry.set(SatTransOp.$type, SatTransOp);

function createBaseSatOpBegin(): SatOpBegin {
  return {
    $type: "Electric.Satellite.v1_0.SatOpBegin",
    commitTimestamp: Long.UZERO,
    transId: "",
    lsn: new Uint8Array(),
    origin: undefined,
  };
}

export const SatOpBegin = {
  $type: "Electric.Satellite.v1_0.SatOpBegin" as const,

  encode(message: SatOpBegin, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (!message.commitTimestamp.isZero()) {
      writer.uint32(8).uint64(message.commitTimestamp);
    }
    if (message.transId !== "") {
      writer.uint32(18).string(message.transId);
    }
    if (message.lsn.length !== 0) {
      writer.uint32(26).bytes(message.lsn);
    }
    if (message.origin !== undefined) {
      writer.uint32(34).string(message.origin);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatOpBegin {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatOpBegin();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.commitTimestamp = reader.uint64() as Long;
          break;
        case 2:
          message.transId = reader.string();
          break;
        case 3:
          message.lsn = reader.bytes();
          break;
        case 4:
          message.origin = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatOpBegin>, I>>(base?: I): SatOpBegin {
    return SatOpBegin.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatOpBegin>, I>>(object: I): SatOpBegin {
    const message = createBaseSatOpBegin();
    message.commitTimestamp = (object.commitTimestamp !== undefined && object.commitTimestamp !== null)
      ? Long.fromValue(object.commitTimestamp)
      : Long.UZERO;
    message.transId = object.transId ?? "";
    message.lsn = object.lsn ?? new Uint8Array();
    message.origin = object.origin ?? undefined;
    return message;
  },
};

messageTypeRegistry.set(SatOpBegin.$type, SatOpBegin);

function createBaseSatOpCommit(): SatOpCommit {
  return {
    $type: "Electric.Satellite.v1_0.SatOpCommit",
    commitTimestamp: Long.UZERO,
    transId: "",
    lsn: new Uint8Array(),
  };
}

export const SatOpCommit = {
  $type: "Electric.Satellite.v1_0.SatOpCommit" as const,

  encode(message: SatOpCommit, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (!message.commitTimestamp.isZero()) {
      writer.uint32(8).uint64(message.commitTimestamp);
    }
    if (message.transId !== "") {
      writer.uint32(18).string(message.transId);
    }
    if (message.lsn.length !== 0) {
      writer.uint32(26).bytes(message.lsn);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatOpCommit {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatOpCommit();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.commitTimestamp = reader.uint64() as Long;
          break;
        case 2:
          message.transId = reader.string();
          break;
        case 3:
          message.lsn = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatOpCommit>, I>>(base?: I): SatOpCommit {
    return SatOpCommit.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatOpCommit>, I>>(object: I): SatOpCommit {
    const message = createBaseSatOpCommit();
    message.commitTimestamp = (object.commitTimestamp !== undefined && object.commitTimestamp !== null)
      ? Long.fromValue(object.commitTimestamp)
      : Long.UZERO;
    message.transId = object.transId ?? "";
    message.lsn = object.lsn ?? new Uint8Array();
    return message;
  },
};

messageTypeRegistry.set(SatOpCommit.$type, SatOpCommit);

function createBaseSatOpInsert(): SatOpInsert {
  return { $type: "Electric.Satellite.v1_0.SatOpInsert", relationId: 0, rowData: undefined, tags: [] };
}

export const SatOpInsert = {
  $type: "Electric.Satellite.v1_0.SatOpInsert" as const,

  encode(message: SatOpInsert, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.relationId !== 0) {
      writer.uint32(8).uint32(message.relationId);
    }
    if (message.rowData !== undefined) {
      SatOpRow.encode(message.rowData, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.tags) {
      writer.uint32(26).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatOpInsert {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatOpInsert();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.relationId = reader.uint32();
          break;
        case 2:
          message.rowData = SatOpRow.decode(reader, reader.uint32());
          break;
        case 3:
          message.tags.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatOpInsert>, I>>(base?: I): SatOpInsert {
    return SatOpInsert.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatOpInsert>, I>>(object: I): SatOpInsert {
    const message = createBaseSatOpInsert();
    message.relationId = object.relationId ?? 0;
    message.rowData = (object.rowData !== undefined && object.rowData !== null)
      ? SatOpRow.fromPartial(object.rowData)
      : undefined;
    message.tags = object.tags?.map((e) => e) || [];
    return message;
  },
};

messageTypeRegistry.set(SatOpInsert.$type, SatOpInsert);

function createBaseSatOpUpdate(): SatOpUpdate {
  return {
    $type: "Electric.Satellite.v1_0.SatOpUpdate",
    relationId: 0,
    rowData: undefined,
    oldRowData: undefined,
    tags: [],
  };
}

export const SatOpUpdate = {
  $type: "Electric.Satellite.v1_0.SatOpUpdate" as const,

  encode(message: SatOpUpdate, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.relationId !== 0) {
      writer.uint32(8).uint32(message.relationId);
    }
    if (message.rowData !== undefined) {
      SatOpRow.encode(message.rowData, writer.uint32(18).fork()).ldelim();
    }
    if (message.oldRowData !== undefined) {
      SatOpRow.encode(message.oldRowData, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.tags) {
      writer.uint32(34).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatOpUpdate {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatOpUpdate();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.relationId = reader.uint32();
          break;
        case 2:
          message.rowData = SatOpRow.decode(reader, reader.uint32());
          break;
        case 3:
          message.oldRowData = SatOpRow.decode(reader, reader.uint32());
          break;
        case 4:
          message.tags.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatOpUpdate>, I>>(base?: I): SatOpUpdate {
    return SatOpUpdate.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatOpUpdate>, I>>(object: I): SatOpUpdate {
    const message = createBaseSatOpUpdate();
    message.relationId = object.relationId ?? 0;
    message.rowData = (object.rowData !== undefined && object.rowData !== null)
      ? SatOpRow.fromPartial(object.rowData)
      : undefined;
    message.oldRowData = (object.oldRowData !== undefined && object.oldRowData !== null)
      ? SatOpRow.fromPartial(object.oldRowData)
      : undefined;
    message.tags = object.tags?.map((e) => e) || [];
    return message;
  },
};

messageTypeRegistry.set(SatOpUpdate.$type, SatOpUpdate);

function createBaseSatOpDelete(): SatOpDelete {
  return { $type: "Electric.Satellite.v1_0.SatOpDelete", relationId: 0, oldRowData: undefined, tags: [] };
}

export const SatOpDelete = {
  $type: "Electric.Satellite.v1_0.SatOpDelete" as const,

  encode(message: SatOpDelete, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.relationId !== 0) {
      writer.uint32(8).uint32(message.relationId);
    }
    if (message.oldRowData !== undefined) {
      SatOpRow.encode(message.oldRowData, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.tags) {
      writer.uint32(26).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatOpDelete {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatOpDelete();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.relationId = reader.uint32();
          break;
        case 2:
          message.oldRowData = SatOpRow.decode(reader, reader.uint32());
          break;
        case 3:
          message.tags.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatOpDelete>, I>>(base?: I): SatOpDelete {
    return SatOpDelete.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatOpDelete>, I>>(object: I): SatOpDelete {
    const message = createBaseSatOpDelete();
    message.relationId = object.relationId ?? 0;
    message.oldRowData = (object.oldRowData !== undefined && object.oldRowData !== null)
      ? SatOpRow.fromPartial(object.oldRowData)
      : undefined;
    message.tags = object.tags?.map((e) => e) || [];
    return message;
  },
};

messageTypeRegistry.set(SatOpDelete.$type, SatOpDelete);

function createBaseSatMigrationNotification(): SatMigrationNotification {
  return {
    $type: "Electric.Satellite.v1_0.SatMigrationNotification",
    oldSchemaVersion: "",
    oldSchemaHash: "",
    newSchemaVersion: "",
    newSchemaHash: "",
  };
}

export const SatMigrationNotification = {
  $type: "Electric.Satellite.v1_0.SatMigrationNotification" as const,

  encode(message: SatMigrationNotification, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.oldSchemaVersion !== "") {
      writer.uint32(10).string(message.oldSchemaVersion);
    }
    if (message.oldSchemaHash !== "") {
      writer.uint32(18).string(message.oldSchemaHash);
    }
    if (message.newSchemaVersion !== "") {
      writer.uint32(26).string(message.newSchemaVersion);
    }
    if (message.newSchemaHash !== "") {
      writer.uint32(34).string(message.newSchemaHash);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatMigrationNotification {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatMigrationNotification();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.oldSchemaVersion = reader.string();
          break;
        case 2:
          message.oldSchemaHash = reader.string();
          break;
        case 3:
          message.newSchemaVersion = reader.string();
          break;
        case 4:
          message.newSchemaHash = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatMigrationNotification>, I>>(base?: I): SatMigrationNotification {
    return SatMigrationNotification.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatMigrationNotification>, I>>(object: I): SatMigrationNotification {
    const message = createBaseSatMigrationNotification();
    message.oldSchemaVersion = object.oldSchemaVersion ?? "";
    message.oldSchemaHash = object.oldSchemaHash ?? "";
    message.newSchemaVersion = object.newSchemaVersion ?? "";
    message.newSchemaHash = object.newSchemaHash ?? "";
    return message;
  },
};

messageTypeRegistry.set(SatMigrationNotification.$type, SatMigrationNotification);

function createBaseSatOpRow(): SatOpRow {
  return { $type: "Electric.Satellite.v1_0.SatOpRow", nullsBitmask: new Uint8Array(), values: [] };
}

export const SatOpRow = {
  $type: "Electric.Satellite.v1_0.SatOpRow" as const,

  encode(message: SatOpRow, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.nullsBitmask.length !== 0) {
      writer.uint32(10).bytes(message.nullsBitmask);
    }
    for (const v of message.values) {
      writer.uint32(18).bytes(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatOpRow {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatOpRow();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nullsBitmask = reader.bytes();
          break;
        case 2:
          message.values.push(reader.bytes());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatOpRow>, I>>(base?: I): SatOpRow {
    return SatOpRow.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatOpRow>, I>>(object: I): SatOpRow {
    const message = createBaseSatOpRow();
    message.nullsBitmask = object.nullsBitmask ?? new Uint8Array();
    message.values = object.values?.map((e) => e) || [];
    return message;
  },
};

messageTypeRegistry.set(SatOpRow.$type, SatOpRow);

function createBaseSatMigration(): SatMigration {
  return { $type: "Electric.Satellite.v1_0.SatMigration", version: "", stmts: [], tables: [] };
}

export const SatMigration = {
  $type: "Electric.Satellite.v1_0.SatMigration" as const,

  encode(message: SatMigration, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.version !== "") {
      writer.uint32(10).string(message.version);
    }
    for (const v of message.stmts) {
      SatMigration_Stmt.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.tables) {
      SatMigration_Table.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatMigration {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatMigration();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.string();
          break;
        case 2:
          message.stmts.push(SatMigration_Stmt.decode(reader, reader.uint32()));
          break;
        case 3:
          message.tables.push(SatMigration_Table.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatMigration>, I>>(base?: I): SatMigration {
    return SatMigration.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatMigration>, I>>(object: I): SatMigration {
    const message = createBaseSatMigration();
    message.version = object.version ?? "";
    message.stmts = object.stmts?.map((e) => SatMigration_Stmt.fromPartial(e)) || [];
    message.tables = object.tables?.map((e) => SatMigration_Table.fromPartial(e)) || [];
    return message;
  },
};

messageTypeRegistry.set(SatMigration.$type, SatMigration);

function createBaseSatMigration_Stmt(): SatMigration_Stmt {
  return { $type: "Electric.Satellite.v1_0.SatMigration.Stmt", type: 0, sql: "" };
}

export const SatMigration_Stmt = {
  $type: "Electric.Satellite.v1_0.SatMigration.Stmt" as const,

  encode(message: SatMigration_Stmt, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.type !== 0) {
      writer.uint32(8).int32(message.type);
    }
    if (message.sql !== "") {
      writer.uint32(18).string(message.sql);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatMigration_Stmt {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatMigration_Stmt();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.type = reader.int32() as any;
          break;
        case 2:
          message.sql = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatMigration_Stmt>, I>>(base?: I): SatMigration_Stmt {
    return SatMigration_Stmt.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatMigration_Stmt>, I>>(object: I): SatMigration_Stmt {
    const message = createBaseSatMigration_Stmt();
    message.type = object.type ?? 0;
    message.sql = object.sql ?? "";
    return message;
  },
};

messageTypeRegistry.set(SatMigration_Stmt.$type, SatMigration_Stmt);

function createBaseSatMigration_Column(): SatMigration_Column {
  return { $type: "Electric.Satellite.v1_0.SatMigration.Column", name: "", sqliteType: "", pgType: "" };
}

export const SatMigration_Column = {
  $type: "Electric.Satellite.v1_0.SatMigration.Column" as const,

  encode(message: SatMigration_Column, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    if (message.sqliteType !== "") {
      writer.uint32(18).string(message.sqliteType);
    }
    if (message.pgType !== "") {
      writer.uint32(26).string(message.pgType);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatMigration_Column {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatMigration_Column();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.sqliteType = reader.string();
          break;
        case 3:
          message.pgType = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatMigration_Column>, I>>(base?: I): SatMigration_Column {
    return SatMigration_Column.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatMigration_Column>, I>>(object: I): SatMigration_Column {
    const message = createBaseSatMigration_Column();
    message.name = object.name ?? "";
    message.sqliteType = object.sqliteType ?? "";
    message.pgType = object.pgType ?? "";
    return message;
  },
};

messageTypeRegistry.set(SatMigration_Column.$type, SatMigration_Column);

function createBaseSatMigration_ForeignKey(): SatMigration_ForeignKey {
  return { $type: "Electric.Satellite.v1_0.SatMigration.ForeignKey", fkCols: [], pkTable: "", pkCols: [] };
}

export const SatMigration_ForeignKey = {
  $type: "Electric.Satellite.v1_0.SatMigration.ForeignKey" as const,

  encode(message: SatMigration_ForeignKey, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.fkCols) {
      writer.uint32(10).string(v!);
    }
    if (message.pkTable !== "") {
      writer.uint32(18).string(message.pkTable);
    }
    for (const v of message.pkCols) {
      writer.uint32(26).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatMigration_ForeignKey {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatMigration_ForeignKey();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.fkCols.push(reader.string());
          break;
        case 2:
          message.pkTable = reader.string();
          break;
        case 3:
          message.pkCols.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatMigration_ForeignKey>, I>>(base?: I): SatMigration_ForeignKey {
    return SatMigration_ForeignKey.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatMigration_ForeignKey>, I>>(object: I): SatMigration_ForeignKey {
    const message = createBaseSatMigration_ForeignKey();
    message.fkCols = object.fkCols?.map((e) => e) || [];
    message.pkTable = object.pkTable ?? "";
    message.pkCols = object.pkCols?.map((e) => e) || [];
    return message;
  },
};

messageTypeRegistry.set(SatMigration_ForeignKey.$type, SatMigration_ForeignKey);

function createBaseSatMigration_Table(): SatMigration_Table {
  return { $type: "Electric.Satellite.v1_0.SatMigration.Table", name: "", columns: [], fks: [] };
}

export const SatMigration_Table = {
  $type: "Electric.Satellite.v1_0.SatMigration.Table" as const,

  encode(message: SatMigration_Table, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    for (const v of message.columns) {
      SatMigration_Column.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.fks) {
      SatMigration_ForeignKey.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SatMigration_Table {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSatMigration_Table();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.columns.push(SatMigration_Column.decode(reader, reader.uint32()));
          break;
        case 3:
          message.fks.push(SatMigration_ForeignKey.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SatMigration_Table>, I>>(base?: I): SatMigration_Table {
    return SatMigration_Table.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<SatMigration_Table>, I>>(object: I): SatMigration_Table {
    const message = createBaseSatMigration_Table();
    message.name = object.name ?? "";
    message.columns = object.columns?.map((e) => SatMigration_Column.fromPartial(e)) || [];
    message.fks = object.fks?.map((e) => SatMigration_ForeignKey.fromPartial(e)) || [];
    return message;
  },
};

messageTypeRegistry.set(SatMigration_Table.$type, SatMigration_Table);

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Long ? string | number | Long : T extends Array<infer U> ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in Exclude<keyof T, "$type">]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P> | "$type">]: never };

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}

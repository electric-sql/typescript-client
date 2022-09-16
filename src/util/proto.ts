import * as Pb from '../_generated/proto/satellite'
import * as _m0 from 'protobufjs/minimal';

let msgtypemapping = new Map<string, number>(
    [
        ["Electric.Satellite.SatErrorResp", 0],
        ["Electric.Satellite.SatAuthReq", 1],
        ["Electric.Satellite.SatAuthResp", 2],
        ["Electric.Satellite.SatGetServerInfoReq", 3],
        ["Electric.Satellite.SatGetServerInfoResp", 4],
        ["Electric.Satellite.SatPingReq", 5],
        ["Electric.Satellite.SatPingResp", 6],
        ["Electric.Satellite.SatInStartReplicationReq", 7],
        ["Electric.Satellite.SatInStartReplicationResp", 8],
        ["Electric.Satellite.SatInStopReplicationReq", 9],
        ["Electric.Satellite.SatInStopReplicationResp", 10],
        ["Electric.Satellite.SatOpLog", 11],
        ["Electric.Satellite.SatRelation", 12],
        ["Electric.Satellite.SatMigrationNotification", 13]
    ]);

export type SatPbMsg =
    | Pb.SatErrorResp
    | Pb.SatAuthReq
    | Pb.SatAuthResp
    | Pb.SatGetServerInfoReq
    | Pb.SatGetServerInfoResp
    | Pb.SatPingReq
    | Pb.SatPingResp
    | Pb.SatInStartReplicationReq
    | Pb.SatInStartReplicationResp
    | Pb.SatInStopReplicationReq
    | Pb.SatInStopReplicationResp
    | Pb.SatOpLog
    | Pb.SatRelation
    | Pb.SatMigrationNotification

export type SatPbMsgObj = {
    $type: string;
    encode(message: SatPbMsg, writer: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): SatPbMsg;
    fromPartial<I extends Pb.Exact<Pb.DeepPartial<SatPbMsg>, I>>(object: I): SatPbMsg;
};

// Returns
export function getMsgType(msg: SatPbMsg) {
    return msgtypemapping.get(msg.$type) ?? 0;
}

export function getTypeFromString(string_type: string) {
    return msgtypemapping.get(string_type);
}

export function getSizeBuf(msg_type: SatPbMsg) {
    const msgtype = getMsgType(msg_type)

    var buf = Buffer.alloc(1);
    buf.writeUInt8(msgtype, 0);
    return buf
}

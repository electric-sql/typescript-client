import { AuthState } from '../auth/index'
import { DatabaseAdapter } from '../electric/adapter'
import { Migrator } from '../migrators/index'
import { Notifier } from '../notifiers/index'
import { sleepAsync } from '../util/timer'
import { AckCallback, AuthResponse, DbName, LSN, SatelliteError, Transaction } from '../util/types'

import { Client, Satellite } from './index'
import { SatelliteOpts, SatelliteOverrides, satelliteDefaults } from './config'
import { BaseRegistry } from './registry'
import { Socket } from '../sockets'
import { EventEmitter } from 'events'

export class MockSatelliteProcess implements Satellite {
  dbName: DbName
  adapter: DatabaseAdapter
  migrator: Migrator
  notifier: Notifier
  socket: Socket
  opts: SatelliteOpts

  constructor(dbName: DbName, adapter: DatabaseAdapter, migrator: Migrator, notifier: Notifier, socket: Socket, opts: SatelliteOpts) {
    this.dbName = dbName
    this.adapter = adapter
    this.migrator = migrator
    this.notifier = notifier
    this.socket = socket
    this.opts = opts
  }

  async start(_authState?: AuthState): Promise<void> {
    await sleepAsync(50)
  }

  async stop(): Promise<void> {
    await sleepAsync(50)
  }
}

export class MockRegistry extends BaseRegistry {
  async startProcess(
        dbName: DbName,
        adapter: DatabaseAdapter,
        migrator: Migrator,
        notifier: Notifier,
        socket: Socket,
        authState?: AuthState,
        overrides?: SatelliteOverrides
      ): Promise<Satellite> {
    const opts = { ...satelliteDefaults, ...overrides }

    const satellite = new MockSatelliteProcess(dbName, adapter, migrator, notifier, socket, opts)
    await satellite.start(authState)

    return satellite
  }
}

export class MockSatelliteClient extends EventEmitter implements Client { 
  connect(): Promise<void | SatelliteError> {
    return Promise.resolve();
  }
  close(): Promise<void | SatelliteError> {
    return Promise.resolve();
  }
  authenticate(_clientId: string): Promise<SatelliteError | AuthResponse> {
    return Promise.resolve({});
  }
  startReplication(_lsn: LSN, _resume?: boolean | undefined): Promise<void | SatelliteError> {
    return Promise.resolve();
  }
  stopReplication(): Promise<void | SatelliteError> {
    return Promise.resolve();
  }
  subscribeToTransactions(_callback: (transaction: Transaction) => Promise<void>): void {
  }
  enqueueTransaction(_transaction: Transaction): void | SatelliteError {
    return
  }
  subscribeToAck(callback: AckCallback): void {
    this.on('ack_lsn', callback)
  }
  unsubscribeToAck(_callback: AckCallback): void {
    return
  }

  setOutboundLogPositions(_sent: LSN, _ack: LSN): void {
    return
  }

}

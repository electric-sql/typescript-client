import { AnyWorkerThreadElectricDatabase } from '../drivers/index'
import { ElectrifyOptions } from '../electric/index'
import {
  ChangeCallback,
  ChangeNotification,
  ConnectivityStateChangeCallback,
  ConnectivityStateChangeNotification,
  EventNotifier,
} from '../notifiers/index'
import { randomValue } from '../util/random'
import { AnyFunction, DbName, StatementId } from '../util/types'

declare global {
  interface Worker {
    user_defined_functions?: {
      [key: string]: (...args: any[]) => any
    }
  }
}

export interface ServerMethod {
  target: 'server'
  name: 'init' | 'open' | '_get_test_data'
}

type ExtractFunctions<T> = {
  [k in keyof T as T[k] extends (...args: any[]) => any ? k : never]: T[k]
}

export interface DbMethod {
  target: 'db'
  dbName: DbName
  name: keyof ExtractFunctions<AnyWorkerThreadElectricDatabase>
}

export interface NotifyMethod {
  target: 'notify'
  dbName: DbName
  name: keyof ExtractFunctions<EventNotifier>
}

type AnyWorkerStatement = NonNullable<
  ReturnType<AnyWorkerThreadElectricDatabase['_getStatement']>
>
export interface StatementMethod {
  target: 'statement'
  dbName: DbName
  statementId: StatementId
  name: keyof ExtractFunctions<AnyWorkerStatement>
}

type RequestMethod = ServerMethod | DbMethod | NotifyMethod | StatementMethod

type FnForRequestMethod<T extends RequestMethod> = T extends ServerMethod
  ? (...args: any[]) => any
  : T extends DbMethod
  ? AnyWorkerThreadElectricDatabase[T['name']]
  : T extends NotifyMethod
  ? EventNotifier[T['name']]
  : T extends StatementMethod
  ? AnyWorkerStatement[T['name']]
  : never

export interface Request {
  args: any[]
  method: RequestMethod
  requestId: string
}

export class RequestError extends Error {
  code: number

  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'RequestError'
  }
}

export interface Response {
  status: 'error' | 'success'
  result?: any
  requestId: string
}

export interface ChangeNotificationResponse {
  status: 'changed'
  result: ChangeNotification
  isChangeNotification: true
}

export interface ConnectivityStateChangeNotificationResponse {
  status: 'changed'
  result: ConnectivityStateChangeNotification
  isConnectivityStateChangeNotification: true
}

// Used by the main thread to send requests to the the worker.
export class WorkerClient {
  worker: Worker

  addListener: AnyFunction
  removeListener: AnyFunction
  postMessage: AnyFunction

  _changeCallbacks: {
    [key: string]: ChangeCallback
  }

  _connectivityStateChangeCallbacks: {
    [key: string]: ConnectivityStateChangeCallback
  }

  constructor(worker: Worker) {
    this.worker = worker

    this.addListener = worker.addEventListener.bind(worker)
    this.removeListener = worker.removeEventListener.bind(worker)
    this.postMessage = worker.postMessage.bind(worker)

    this._changeCallbacks = {}
    this._connectivityStateChangeCallbacks = {}

    this.addListener('message', this.handleMessage.bind(this))
  }

  request<T extends RequestMethod>(
    method: T,
    ...args: Parameters<FnForRequestMethod<T>>
  ): Promise<Awaited<ReturnType<FnForRequestMethod<T>>>> {
    const requestId = randomValue()
    const data = {
      args: args,
      method: method,
      requestId: requestId,
    }

    const addListener = this.addListener
    const removeListener = this.removeListener
    const postMessage = this.postMessage

    return new Promise((resolve: AnyFunction, reject: AnyFunction) => {
      const handleResponse = ({ data }: MessageEvent): any => {
        if (data.requestId === undefined) {
          return
        }
        if (data.requestId !== requestId) {
          return
        }

        removeListener('message', handleResponse)

        const { result, status }: Response = data
        status === 'error' ? reject(result) : resolve(result)
      }

      addListener('message', handleResponse)
      postMessage(data)
    })
  }

  notify<T extends NotifyMethod>(
    method: T,
    ...args: Parameters<EventNotifier[T['name']]>
  ): void {
    const requestId = randomValue()
    const data = {
      args: args,
      method: method,
      requestId: requestId,
    }

    this.postMessage(data)
  }

  subscribeToChanges(key: string, callback: ChangeCallback): string {
    if (key in this._changeCallbacks) {
      throw new Error(`Subscription key clash -- \`key\` must be unique.`)
    }

    this._changeCallbacks[key] = callback

    return key
  }
  unsubscribeFromChanges(key: string): void {
    delete this._changeCallbacks[key]
  }

  subscribeToConnectivityStateChange(
    key: string,
    callback: ConnectivityStateChangeCallback
  ): string {
    if (key in this._connectivityStateChangeCallbacks) {
      throw new Error(`Subscription key clash -- \`key\` must be unique.`)
    }

    this._connectivityStateChangeCallbacks[key] = callback

    return key
  }

  unsubscribeFromConnectivityStateChange(key: string): void {
    delete this._connectivityStateChangeCallbacks[key]
  }

  handleMessage({ data }: MessageEvent): void {
    if (data.isChangeNotification == true) {
      const callbacks = Object.values(this._changeCallbacks)
      const notification = data.result
      callbacks.forEach((callback) => callback(notification))
      return
    }

    if (data.isConnectivityStateChangeNotification == true) {
      const callbacks = Object.values(this._connectivityStateChangeCallbacks)
      const notification = data.result
      callbacks.forEach((callback) => callback(notification))
      return
    }

    // console.error("unhandled worker to main thread message")
  }
}

// Run in the worker thread to handle requests from the main thread.
// Routes messages according to the method interfaces above.
//
// - ServerMethod => this.init / this.open
// - DbMethod => this._dbs[dbName].method
// - NotifyMethod => this._dbs[dbName].electric.notifier.method
// - StatementMethod => this._dbs[dbName]._getStatement(id).method
//
// Note that the server can also notify the client to make the bridge
// notification messaging work.
//
// It's abstract because we extend with concrete implementations
// for the open and init methods and an implementatin specific
// start method.
export abstract class WorkerServer {
  SQL?: any

  worker: Worker
  opts?: ElectrifyOptions

  _dbs: {
    [key: DbName]: AnyWorkerThreadElectricDatabase
  }

  constructor(worker: Worker, opts?: ElectrifyOptions) {
    this.worker = worker
    this.opts = opts
    this._dbs = {}

    this.worker.addEventListener('message', this.handleCall.bind(this))
  }

  async handleCall(event: MessageEvent) {
    const data = event.data as Request
    const { requestId, method, args } = data

    try {
      const boundTargetFn = this._getTargetFunction(method)
      if (boundTargetFn === undefined) {
        throw new RequestError(405, `Method not found: \`${method}\`.`)
      }

      const result = await boundTargetFn(...args)

      this._dispatchResult(requestId, result)
    } catch (err) {
      this._dispatchError(requestId, err)
    }
  }

  _dispatchError(requestId: string, error: any) {
    const resp: Response = {
      status: 'error',
      result: error,
      requestId: requestId,
    }

    this.worker.postMessage(resp)
  }

  _dispatchResult(requestId: string, result: any) {
    const resp: Response = {
      status: 'success',
      result: result,
      requestId: requestId,
    }

    this.worker.postMessage(resp)
  }

  _dispatchChangeNotification(notification: ChangeNotification): void {
    const resp: ChangeNotificationResponse = {
      status: 'changed',
      result: notification,
      isChangeNotification: true,
    }

    this.worker.postMessage(resp)
  }

  _dispatchConnectivityStateNotification(
    notification: ConnectivityStateChangeNotification
  ): void {
    const resp: ConnectivityStateChangeNotificationResponse = {
      status: 'changed',
      result: notification,
      isConnectivityStateChangeNotification: true,
    }

    this.worker.postMessage(resp)
  }

  _getBound(target: any, methodName: string): AnyFunction | undefined {
    if (target === undefined) {
      return
    }

    const fn = Reflect.get(target, methodName)

    if (typeof fn !== 'function') {
      return
    }

    return fn.bind(target)
  }

  _getDb(dbName: DbName): AnyWorkerThreadElectricDatabase | undefined {
    return this._dbs[dbName]
  }

  _getTargetFunction(method: RequestMethod): AnyFunction | void {
    if (method.target === 'server') {
      return this._getBound(this, method.name)
    }

    const db = this._getDb(method.dbName)
    if (db === undefined) {
      throw new RequestError(500, 'Database not open')
    }

    if (method.target === 'db') {
      return this._getBound(db, method.name)
    }

    if (method.target === 'notify') {
      const notifier = db.electric.notifier

      return this._getBound(notifier, method.name)
    }

    if (method.target === 'statement') {
      const statement = db._getStatement(method.statementId)

      return this._getBound(statement, method.name)
    }
  }

  static start(_worker: Worker, _opts: any = {}): void {
    throw new Error('Sub-classes must implement `WorkerServer.start`')
  }
}

import { randomValue } from '../../util/random'
import { AnyFunction } from '../../util/types'
import { ElectrifyOptions } from '../../electric/index'
import { ElectricDatabase } from './database'

declare global {
  interface Worker {
    user_defined_functions?: {
      [key: string]: (...args: any[]) => any
    }
  }
}

export interface Request {
  args: any[]
  method: string,
  requestId: string
}

export class RequestError extends Error {
  code: number

  constructor(code: number, message: string) {
    super(message);
    this.code = code
    this.name = "RequestError"
  }
}

export interface Response {
  status: 'error' | 'success'
  result?: any
  requestId: string
}

// Used by the main thread to send requests to the the worker.
export class WorkerClient {
  worker: Worker

  addListener: AnyFunction
  removeListener: AnyFunction
  postMessage: AnyFunction

  constructor(worker: Worker) {
    this.worker = worker

    this.addListener = worker.addEventListener.bind(worker)
    this.removeListener = worker.removeEventListener.bind(worker)
    this.postMessage = worker.postMessage.bind(worker)
  }

  request(method: string, ...args: any[]): Promise<any> {
    const requestId = randomValue()
    const data = {
      args: args,
      method: method,
      requestId: requestId
    }

    const addListener = this.addListener
    const removeListener = this.removeListener
    const postMessage = this.postMessage

    return new Promise((resolve: AnyFunction, reject: AnyFunction) => {
      const handleResponse = (event: MessageEvent): any => {
        const resp: Response = event.data

        if (resp.requestId !== requestId) {
          return
        }

        removeListener('message', handleResponse)

        const { result, status } = resp
        status === 'error' ? reject(result) : resolve(result)
      }

      addListener('message', handleResponse)
      postMessage(data)
    })
  }
}

// Run in the worker thread to handle requests from the main thread.
//
// Routes according to a naming convention in the method name:
//
// - 'init' | 'open' => this.init / this.open
// - 'db:method' => this.db.method
// - 'stmt:id:method' => this.db._getStatement(id).method
//
// It's abstract because we extend with concrete implementations
// for the open and init methods and an implementatin specific
// start method.
export abstract class BaseWorkerServer {
  worker: Worker
  opts: ElectrifyOptions

  SQL?: any
  db?: ElectricDatabase

  constructor(worker: Worker, opts: ElectrifyOptions) {
    this.worker = worker
    this.opts = opts

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
    }
    catch (err) {
      this._dispatchError(requestId, err)
    }
  }

  _dispatchError(requestId: string, error: any) {
    const resp: Response = {
      status: 'error',
      result: error,
      requestId: requestId
    }

    this.worker.postMessage(resp)
  }

  _dispatchResult(requestId: string, result: any) {
    const resp: Response = {
      status: 'success',
      result: result,
      requestId: requestId
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

  _getTargetFunction(method: string): AnyFunction | void {
    const parts = method.split(':')

    if (parts.length === 1 && ['init', 'open'].includes(method)) {
      return this._getBound(this, method)
    }

    if (this.db === undefined) {
      throw new RequestError(500, 'Database not open')
    }

    if (parts.length === 2 && method.startsWith('db:')) {
      return this._getBound(this.db, parts[1])
    }

    if (parts.length === 3 || method.startsWith('stmt:')) {
      const [ _literal, statementId, methodName ] = parts
      const statement = this.db._getStatement(statementId)

      return this._getBound(statement, methodName)
    }
  }

  static start(_worker: Worker, _opts: ElectrifyOptions = {}): void {
    throw new Error('Sub-classes must implement `WorkerServer.start`')
  }
}

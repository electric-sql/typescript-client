import { randomValue } from '../../util/random'
import { AnyFunction } from '../../util/types'

export interface Request {
  args: any[]
  method: string,
  requestId: string
}

export interface Response {
  status: 'error' | 'success'
  result?: any
  requestId: string
}

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

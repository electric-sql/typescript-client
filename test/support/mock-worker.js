import { MockCommitNotifier } from '../../src/notifiers/mock'
import { MockElectricWorker } from '../../src/adapters/browser/mock'

const notifier = new MockCommitNotifier('test.db')
const ref = new MockElectricWorker(self, {commitNotifier: notifier})

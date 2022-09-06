import { MockNotifier } from '../../src/notifiers/mock'
import { MockElectricWorker } from '../../src/drivers/browser/mock'

// XXX These functions become available to add to an
// open database using `db.create_function`.
self.user_defined_functions = {
  addTwoNumbers: (a, b) => {
    return a + b
  }
}

const notifier = new MockNotifier('test.db')
const ref = new MockElectricWorker(self, {notifier: notifier})

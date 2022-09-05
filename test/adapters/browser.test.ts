import test from 'ava'

import Worker from 'web-worker'
import { Blob } from 'node:buffer'

import { RequestError, ServerMethod, WorkerClient } from '../../src/adapters/browser/bridge'
import { MainThreadDatabaseProxy } from '../../src/adapters/browser/database'
import { MockDatabase, MockElectricWorker, MockStatement } from '../../src/adapters/browser/mock'
import { QueryAdapter, resultToRows } from '../../src/adapters/browser/query'
import { SatelliteDatabaseAdapter } from '../../src/adapters/browser/satellite'
import { MockCommitNotifier } from '../../src/notifiers/mock'
import { QualifiedTablename } from '../../src/util/tablename'

const makeWorker = () => {
  return new Worker('./test/support/mock-worker.js', {type: 'module'})
}

const initMethod: ServerMethod = {target: 'server', name: 'init'}
const openMethod: ServerMethod = {target: 'server', name: 'open'}

test('init and open works', async t => {
  const worker = makeWorker()
  const client = new WorkerClient(worker)


  t.is(await client.request(initMethod, '<locator pattern>'), true)
  t.is(await client.request(openMethod, 'test.db'), true)
})

test('the main thread proxy provides the expected methods', async t => {
  const worker = makeWorker()
  const client = new WorkerClient(worker)
  const db = new MainThreadDatabaseProxy('test.db', client)

  const targetMethods = [
    'close',
    'create_function',
    'each',
    'exec',
    'export',
    'getRowsModified',
    'iterateStatements',
    'prepare',
    'run'
  ]

  targetMethods.forEach((key) => t.is(typeof db[key], 'function'))
})

test('can\'t open before you init', async t => {
  const worker = makeWorker()
  const client = new WorkerClient(worker)

  await t.throwsAsync(client.request(openMethod, 'test.db'), {
    message: 'Must init before opening'
  })
})

test('can\'t query before you open', async t => {
  const worker = makeWorker()
  const client = new WorkerClient(worker)
  await client.request(initMethod, '<locator pattern>')

  const db = new MainThreadDatabaseProxy('test.db', client)
  await t.throwsAsync(db.exec('select 1'), {
    message: 'Database not open'
  })
})

test('can open the same database twice', async t => {
  const worker = makeWorker()
  const client = new WorkerClient(worker)
  await client.request(initMethod, '<locator pattern>')

  await client.request(openMethod, 'test.db')
  await client.request(openMethod, 'test.db')

  t.assert(true)
})

test('exec returns query results', async t => {
  const worker = makeWorker()
  const client = new WorkerClient(worker)

  await client.request(initMethod, '<locator pattern>')
  await client.request(openMethod, 'test.db')

  const db = new MainThreadDatabaseProxy('test.db', client)
  const result = await db.exec('select 1')

  t.deepEqual(resultToRows(result), [
    {db: 'test.db', val: 1},
    {db: 'test.db', val: 2}
  ])
})

test('can query multiple databases', async t => {
  const worker = makeWorker()
  const client = new WorkerClient(worker)
  await client.request(initMethod, '<locator pattern>')

  await client.request(openMethod, 'foo.db')
  await client.request(openMethod, 'bar.db')

  const fooDb = new MainThreadDatabaseProxy('foo.db', client)
  const barDb = new MainThreadDatabaseProxy('bar.db', client)

  t.deepEqual(resultToRows(await fooDb.exec('select 1')), [
    {db: 'foo.db', val: 1},
    {db: 'foo.db', val: 2}
  ])
  t.deepEqual(resultToRows(await barDb.exec('select 1')), [
    {db: 'bar.db', val: 1},
    {db: 'bar.db', val: 2}
  ])
})

// XXX to test:
// - the rest of the database and statement api
// - commit notifications

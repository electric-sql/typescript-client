import test from 'ava'

import Worker from 'web-worker'
import { Blob } from 'node:buffer'

import { RequestError, ServerMethod, WorkerClient } from '../../src/adapters/browser/bridge'
import { MainThreadDatabaseProxy, MainThreadStatementProxy } from '../../src/adapters/browser/database'
import { MockDatabase, MockElectricWorker } from '../../src/adapters/browser/mock'
import { QueryAdapter, resultToRows } from '../../src/adapters/browser/query'
import { SatelliteDatabaseAdapter } from '../../src/adapters/browser/satellite'
import { MockCommitNotifier } from '../../src/notifiers/mock'
import { QualifiedTablename } from '../../src/util/tablename'

const initMethod: ServerMethod = {target: 'server', name: 'init'}
const openMethod: ServerMethod = {target: 'server', name: 'open'}

const makeWorker = () => {
  return new Worker('./test/support/mock-worker.js', {type: 'module'})
}

const makeDb = async () => {
  const worker = makeWorker()
  const client = new WorkerClient(worker)
  await client.request(initMethod, '<locator pattern>')
  await client.request(openMethod, 'test.db')

  return new MainThreadDatabaseProxy('test.db', client)
}

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

test('must open the right database', async t => {
  const worker = makeWorker()
  const client = new WorkerClient(worker)
  await client.request(initMethod, '<locator pattern>')
  await client.request(openMethod, 'test.db')

  const db = new MainThreadDatabaseProxy('another.db', client)
  await t.throwsAsync(db.exec('select 1'), {
    message: 'Database not open'
  })
})

test('exec returns query results', async t => {
  const db = await makeDb()
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


test('db.run works', async t => {
  const db = await makeDb()
  const retval = await db.run('insert lala into foobar')

  t.is(retval, db)
})

test('db.prepare statement works', async t => {
  const db = await makeDb()
  const retval = await db.prepare('select 1')

  t.assert(retval instanceof MainThreadStatementProxy)
})

test('db.each works', async t => {
  const db = await makeDb()
  const sql = 'select * from lalas'

  let isDone = false
  const results = []

  const handleRow = (row: Row) => {
    results.push(row)
  }
  const handleDone = () => {
    isDone = true
  }

  const retval = await db.each(sql, [], handleRow, handleDone)
  t.is(retval, db)
  t.assert(isDone)
  t.deepEqual(results, [{a: 1}, {a: 1}, {a: 1}])
})

test('db.each works without bindParams', async t => {
  const db = await makeDb()
  const sql = 'select * from lalas'

  let isDone = false
  const results = []

  const handleRow = (row: Row) => {
    results.push(row)
  }
  const handleDone = () => {
    isDone = true
  }

  const retval = await db.each(sql, handleRow, handleDone)
  t.is(retval, db)
  t.assert(isDone)
  t.deepEqual(results, [{a: 1}, {a: 1}, {a: 1}])
})

test('db.iterateStatements works', async t => {
  const db = await makeDb()
  const statements = 'select 1; select 2; select 3'

  let count = 0

  for await (const stmt of db.iterateStatements(statements)) {
    count += 1

    t.assert(stmt instanceof MainThreadStatementProxy)
  }

  t.is(count, 3)
})

test('db.iterateStatements handles extra semicolons', async t => {
  const db = await makeDb()
  const statements = '; ;;select 1; select 2;;; select 3;'

  let count = 0

  for await (const stmt of db.iterateStatements(statements)) {
    count += 1

    t.assert(stmt instanceof MainThreadStatementProxy)
  }

  t.is(count, 3)
})

test('db.getRowsModified works', async t => {
  const db = await makeDb()
  const retval = await db.getRowsModified()

  t.is(retval, 0)
})

test('db.close works', async t => {
  const db = await makeDb()

  t.is(await db.close(), undefined)
})

test('db.export works', async t => {
  const db = await makeDb()

  t.deepEqual(await db.export(), new Uint8Array(2))
})

test('db.create_function works', async t => {
  const db = await makeDb()
  const retval = await db.create_function('addTwoNumbers')

  t.is(retval, db)

  await t.throwsAsync(db.create_function('notDefinedOnWorker'), {
    message: 'Failed to create `notDefinedOnWorker. ' +
             'Have you added it to `self.user_defined_functions` ' +
             'in your worker.js?'
  })
})

// XXX to test:
// - the statement api
// - commit notifications

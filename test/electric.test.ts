import test from 'ava'

test('tests run', t => {
  t.is(1, 1)
})

test('import', async t => {
  await import('../foo')
})

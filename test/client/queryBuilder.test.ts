import test from 'ava'
import { Builder } from '../../src/client/model/builder'

const tbl = new Builder('Post')

const post1 = {
  id: 'i1',
  title: 't1',
  contents: 'c1',
  nbr: 18,
}

const post2 = {
  id: 'i2',
  title: 't2',
  contents: 'c2',
  nbr: 21,
}

/*
 * The tests below check that the generated queries are correct.
 * The query builder does not validate the input, it assumes that the input it gets was already validated.
 * Input validation is currently done by the `Table` itself before building the query.
 */

// Test that we can make a create query
test('create query', (t) => {
  const query = tbl
    .create({
      data: post1,
    })
    .toString()

  t.is(
    query,
    "INSERT INTO Post (id, title, contents, nbr) VALUES ('i1', 't1', 'c1', 18)"
  )
})

test('createMany query', (t) => {
  const query = tbl
    .createMany({
      data: [post1, post2],
    })
    .toString()

  t.is(
    query,
    "INSERT INTO Post (id, title, contents, nbr) VALUES ('i1', 't1', 'c1', 18), ('i2', 't2', 'c2', 21)"
  )

  const query2 = tbl
    .createMany({
      data: [post1, post2],
      skipDuplicates: true,
    })
    .toString()

  t.is(
    query2,
    "INSERT INTO Post (id, title, contents, nbr) VALUES ('i1', 't1', 'c1', 18), ('i2', 't2', 'c2', 21) ON CONFLICT DO NOTHING"
  )
})

test('findUnique query', async (t) => {
  const query = tbl
    .findUnique({
      where: {
        id: 'i2',
        nbr: 21,
      },
    })
    .toString()

  t.is(query, "SELECT * FROM Post WHERE (id = ('i2')) AND (nbr = (21)) LIMIT 2")
})

test('findUnique query with selection', (t) => {
  const query = tbl
    .findUnique({
      where: {
        id: 'i2',
        nbr: 21,
      },
      select: {
        title: true,
        contents: false,
      },
    })
    .toString()

  t.is(
    query,
    "SELECT id, nbr, title FROM Post WHERE (id = ('i2')) AND (nbr = (21)) LIMIT 2"
  )
})

test('findMany allows results to be ordered', (t) => {
  const query = tbl
    .findMany({
      // `where` argument must not be provided when using the actual API because it is added as default by the validator
      // but since we directly use the query builder we need to provide it
      where: {},
      orderBy: [
        {
          id: 'asc',
        },
        {
          title: 'desc',
        },
      ],
    })
    .toString()

  t.is(query, 'SELECT * FROM Post ORDER BY id ASC, title DESC')
})

test('update query', (t) => {
  const query = tbl
    .update({
      data: { title: 'Foo', contents: 'Bar' },
      where: { id: '1' },
    })
    .toString()

  t.is(
    query,
    "UPDATE Post SET title = 'Foo', contents = 'Bar' WHERE (id = ('1'))"
  )
})

test('updateMany query', (t) => {
  const query1 = tbl
    .updateMany({
      data: { title: 'Foo', contents: 'Bar' },
      // `where` argument must not be provided when using the actual API because it is added as default by the validator
      // but since we directly use the query builder we need to provide it
      where: {},
    })
    .toString()

  const sql = "UPDATE Post SET title = 'Foo', contents = 'Bar'"

  t.is(query1, sql)
})

test('delete query', (t) => {
  const query = tbl
    .delete({
      where: { id: 'Foo', title: 'Bar' },
    })
    .toString()

  t.is(query, "DELETE FROM Post WHERE (id = ('Foo')) AND (title = ('Bar'))")
})

test('deleteMany query', (t) => {
  const query1 = tbl
    .deleteMany({
      where: { id: 'Foo', title: 'Bar' },
    })
    .toString()

  t.is(query1, "DELETE FROM Post WHERE (id = ('Foo')) AND (title = ('Bar'))")

  const query2 = tbl
    .deleteMany({
      // `where` argument is not required when using the actual API because it is added as default by the validator
      // but since we directly use the query builder we need to provide it
      where: {},
    })
    .toString()

  const sql = 'DELETE FROM Post'
  t.is(query2, sql)
})
import 'https://gist.githubusercontent.com/qwtel/b14f0f81e3a96189f7771f83ee113f64/raw/TestRequest.ts'
import {
  assert,
  assertExists,
  assertEquals,
  assertStrictEquals,
  assertStringIncludes,
  assertThrows,
  assertRejects,
} from 'https://deno.land/std@0.133.0/testing/asserts.ts'
import { spy, assertSpyCall, assertSpyCalls } from "https://deno.land/std@0.133.0/testing/mock.ts";
const { test } = Deno;

import { unsignedCookies } from '../cookies.ts';
import { cookieSession, storageSession } from '../session.ts';
import { StorageArea } from 'https://ghuc.cc/worker-tools/kv-storage/index.ts'
import 'https://ghuc.cc/worker-tools/deno-kv-storage/adapters/sqlite.ts'
import { StreamResponse } from 'https://ghuc.cc/worker-tools/stream-response/index.ts'

import { withMiddleware, combine } from '../context.ts'
import { ok } from 'https://ghuc.cc/worker-tools/response-creators/index.ts'

const cookieMW = combine(
  unsignedCookies(),
  cookieSession({
    defaultSession: { foo: '', bar: 'xxx' },
  }),
);

const storage = new StorageArea('session', { url: 'sqlite://session.sqlite' })

test('cookie session', async () => {
  let i = 0
  const fn = withMiddleware(cookieMW, (_, { cookies, session }) => {
    if (i === 1) assertExists(cookies.obj)
    assert(typeof session === 'object' && session !== null)
    assertEquals(session.foo, i++ === 0 ? '' : 'baz')
    assertEquals(session.bar, 'xxx')
    session.foo = 'baz'
    return ok()
  })

  const res = await fn(new Request('/'))
  const setCookie = res.headers.get('set-cookie')!;
  await fn(new Request('/', { headers: { cookie: setCookie.split(';')[0] } }))

  assertEquals(i, 2)
})

test('storage session', async () => {
  let i = 0
  const fn = withMiddleware(combine(
    unsignedCookies(),
    storageSession({
      storage,
      defaultSession: { foo: '', bar: 'xxx' }
    }),
  ), (_, { cookies, session }) => {
    if (i === 1) assertExists(cookies.sid)
    assert(typeof session === 'object' && session !== null)
    assertEquals(session.foo, i++ === 0 ? '' : 'baz')
    assertEquals(session.bar, 'xxx')
    session.foo = 'baz'
    return ok()
  })

  const res = await fn(new Request('/'))
  const setCookie = res.headers.get('set-cookie')!;
  assertExists(setCookie)
  await fn(new Request('/', { headers: { cookie: setCookie.split(';')[0] } }))

  assertEquals(i, 2)
})

test('not setting cookies when session hasn\'t changed', async () => {
  const fn = withMiddleware(cookieMW, (_, { session }) => {
    assert(typeof session === 'object' && session !== null)
    assertEquals(session.bar, 'xxx')
    session.bar = 'xxx'
    return ok()
  })

  const res = await fn(new Request('/'))
  const cookie = res.headers.get('set-cookie');
  assert(cookie == null)
})

test('deep property tracking', async () => {
  let i = 0
  const fn = withMiddleware(combine(
    unsignedCookies(),
    storageSession({
      storage,
      defaultSession: { foo: { bar: 'xxx' } },
    })
  ), (_, { session }) => {
    assert(typeof session === 'object' && session !== null)
    assertEquals(session.foo.bar, i++ === 0 ? 'xxx' : 'BAZ')
    session.foo.bar = 'BAZ'
    return ok()
  })

  const res = await fn(new Request('/'))
  const setCookie = res.headers.get('set-cookie');
  assertExists(setCookie)
  await fn(new Request('/', { headers: { cookie: setCookie.split(';')[0] } }))

  assertEquals(i, 2)
})

test('maps & sets', async () => {
  let i = 0
  const fn = withMiddleware(combine(
    unsignedCookies(),
    storageSession({
      storage,
      defaultSession: { map: new Map([['foo', 'bar']]), set: new Set([1, 2, 3]) },
    })
  ), (_, { session }) => {
    if (i === 0) {
      assertExists(session)
      assertExists(session.map)
      assertExists(session.set)
      assertEquals(session.map.get('foo'), 'bar')
      assertEquals(session.set.has(2), true)
      session.map.set('foo', 'baz')
      session.map.set('new', 'wow')
    }
    if (i === 1) {
      assertEquals(session.map.get('foo'), 'baz')
      assertEquals(session.map.get('new'), 'wow')
    }
    i++
    return ok()
  })

  const res = await fn(new Request('/'))
  const setCookie = res.headers.get('set-cookie');
  assertExists(setCookie)
  await fn(new Request('/', { headers: { cookie: setCookie.split(';')[0] } }))

  assertEquals(i, 2)
})

const timeout = (n?: number) => new Promise(r => setTimeout(r, n))

test('streams', async () => {
  const fn = withMiddleware(combine(
    unsignedCookies(),
    cookieSession({ defaultSession: { foo: '' } })
  ), (_, { session }) => {
    return new StreamResponse(async function* () {
      yield 'hello'
      await timeout(10)
      assertThrows(() => session.foo = '300')
      yield ' world'
    }())
  })
  const res = await fn(new Request('/'))
  assertEquals(await res.text(), 'hello world')
  assert(res.headers.get('set-cookie') == null)
})

test('streams II', async () => {
  const fn = withMiddleware(combine(
    unsignedCookies(),
    storageSession({ storage, defaultSession: { foo: '' } })
  ), (_, { session }) => {
    return new StreamResponse(async function* () {
      yield 'hello'
      await timeout(10)
      session.foo = '300'
      yield ' world'
    }())
  })
  const res = await fn(new Request('/'))
  assertEquals(await res.text(), 'hello world')
})
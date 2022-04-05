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
const { test } = Deno;

import { EffectsList, executeEffects } from '../context.ts'
import { withUnsignedCookies, withSignedCookies } from '../cookies.ts';

import { iterHeadersSetCookieFix } from '../utils/headers-set-cookie-fix.ts';
import { MiddlewareCookieStore } from '../utils/middleware-cookie-store.ts';

import { SignedCookieStore } from 'https://raw.githubusercontent.com/worker-tools/signed-cookie-store/master/index.ts';
import { ok } from 'https://raw.githubusercontent.com/worker-tools/response-creators/master/index.ts'

const mkCtx = (request: Request) => ({ request, effects: new EffectsList() })

const request = new Request('/item/detail?id=3', {
  method: 'POST',
  headers: {
    'Cookie': 'foo=bar; user=bert; no=mad',
  },
})

test('exist', () => {
  assertExists(withUnsignedCookies())
})

test('basics', async () => {
  const { cookies, cookieStore } = await withUnsignedCookies()(mkCtx(request))
  assertExists(cookies)
  assertExists(cookieStore)
  assert(cookieStore instanceof MiddlewareCookieStore)
})

test('parsed cookies', async () => {
  const { cookies } = await withUnsignedCookies()(mkCtx(request))
  assertEquals(cookies.foo, 'bar')
  assertEquals(cookies.user, 'bert')
  assertEquals(cookies.no, 'mad')
})

test('effects', async () => {
  const { effects } = await withUnsignedCookies()(mkCtx(request))
  assertEquals(effects.length, 1);
})

test('setting cookies', async () => {
  const { cookieStore, effects } = await withUnsignedCookies()(mkCtx(request))
  cookieStore.set('bee', 'hive')
  const setCookie = (await executeEffects(effects, ok())).headers.get('set-cookie')
  assertEquals(setCookie, 'bee=hive')
})

test('deleting cookies', async () => {
  const { cookieStore, effects } = await withUnsignedCookies()(mkCtx(request))
  cookieStore.delete('foo')
  const setCookie = (await executeEffects(effects, ok())).headers.get('set-cookie')!
  assertStringIncludes(setCookie, 'foo=;')
  assertStringIncludes(setCookie, 'Expires=Thu, 01 Jan 1970 00:00:00 GMT;')
})

test('setting cookies 2', async () => {
  const { cookieStore, effects } = await withUnsignedCookies()(mkCtx(request))
  const now = Date.now()
  cookieStore.set({
    name: 'foo',
    value: 'bar',
    expires: new Date(now),
    domain: 'example.com',
    path: '/beehive',
    sameSite: 'strict',
    httpOnly: true
  });
  const response = await executeEffects(effects, ok())
  const setCookie = response.headers.get('set-cookie')!
  assertStringIncludes(setCookie, 'foo=bar');
  assertStringIncludes(setCookie, `Expires=${new Date(now).toUTCString()}`);
  assertStringIncludes(setCookie, 'Domain=example.com');
  assertStringIncludes(setCookie, 'Path=/beehive');
  assertStringIncludes(setCookie, 'SameSite=Strict');
  assertStringIncludes(setCookie, 'HttpOnly');
})

test('cookie value encoding', async () => {
  const { cookieStore, effects } = await withUnsignedCookies()(mkCtx(request))
  const randomUTF8 = '⟗⥍⛨ⅸ⼩⍍⫵␇⌯ⱎ⇗⪽‷⚷␢⒏⋁⺺↲‚✰⧒Ⳟ☵⦞⩗▥⸲Ⳃ⤚⼳⢍'
  cookieStore.set('two, words', randomUTF8)
  const response = await executeEffects(effects, ok())
  assertStringIncludes(response.headers.get('set-cookie')!, `two%2C%20words=${encodeURIComponent(randomUTF8)}`)
})

test('cookie value encoding 2', async () => {
  const { cookieStore, effects } = await withUnsignedCookies()(mkCtx(request))
  const randomUTF8 = '⟗⥍⛨ⅸ⼩⍍⫵␇⌯ⱎ⇗⪽‷⚷␢⒏⋁⺺↲‚✰⧒Ⳟ☵⦞⩗▥⸲Ⳃ⤚⼳⢍'
  cookieStore.set({ name: 'two, words', value: randomUTF8 })
  const response = await executeEffects(effects, ok())
  assertStringIncludes(response.headers.get('set-cookie')!, `two%2C%20words=${encodeURIComponent(randomUTF8)}`)
})

test('setting multiple cookies', async () => {
  const { cookieStore, effects } = await withUnsignedCookies()(mkCtx(request))
  cookieStore.set('one', '1')
  cookieStore.set('two', '2')
  const response = await executeEffects(effects, ok())
  assertEquals([...iterHeadersSetCookieFix(response.headers)].filter(([k]) => k === 'set-cookie').length, 2)
})

const secret = 'password123'

test('exists', () => {
  assertExists(withSignedCookies({ secret }))
})

test('throws on missing secret', () => {
  // @ts-expect-error: for testing only
  assertThrows(() => withSignedCookies({}), Error)
})

const signedCookiesFn = withSignedCookies({ secret })

test('use with other cookie middleware', async () => {
  const { cookies, signedCookies, unsignedCookies } = await signedCookiesFn(withUnsignedCookies()(mkCtx(request)))
  assertExists(unsignedCookies)
  assertExists(signedCookies)
  assertEquals(cookies, signedCookies) // last one "wins"
})

test('unsigned cookies to be ignored', async () => {
  const { cookies, cookieStore, effects } = await signedCookiesFn(mkCtx(request))
  assertEquals(Object.keys(cookies).length, 0)
  assertEquals(await cookieStore.get('foo'), null);
  assertEquals(await cookieStore.getAll(), [])
})

const signedRequest = new Request('/', {
  headers: {
    'Cookie': 'foo=bar; foo.sig=Sd_7Nz01uxBspv_y6Lqs8gLXXYEe8iFEN8fNouVNLzI; bar=ignored',
  },
})

test('get signed cookie', async () => {
  const { cookies, cookieStore, effects } = await signedCookiesFn(mkCtx(signedRequest))
  assertEquals(cookies, { foo: 'bar' })
  assertEquals(await cookieStore.get('bar'), null)
})

test('throws on forged signature', async () => {
  const forgedRequest = new Request('/', {
    headers: {
      'Cookie': 'foo=bar; foo.sig=Sd_7Nz01uxBspv_y6Lqs8gLXXYEe8iFEN8fAAAAAAAA',
    },
  })
  const res = await signedCookiesFn(mkCtx(forgedRequest))
    .catch(x => x instanceof Response ? x : Promise.reject(x))
  assert(res instanceof Response)
  assertEquals(res.status, 403)
})

test('verifying signatures form previous keys', async () => {
  const { cookies, cookieStore, effects } = await withSignedCookies({
    secret: 'new-key',
    keyring: [await SignedCookieStore.deriveCryptoKey({ secret })]
  })(mkCtx(signedRequest))
  assertEquals(cookies, { foo: 'bar' })
})

test('signing signatures with new key', async () => {
  const { cookies, cookieStore, effects } = await withSignedCookies({
    secret: 'new-key',
    keyring: [await SignedCookieStore.deriveCryptoKey({ secret })]
  })(mkCtx(signedRequest))
  cookieStore.set('foo', 'bar') // no await
  const setCookie = (await executeEffects(effects, ok())).headers.get('set-cookie')!
  assert(!setCookie.includes('foo.sig=Sd_7Nz01uxBspv_y6Lqs8gLXXYEe8iFEN8fNouVNLzI'))
  assertStringIncludes(setCookie, 'foo.sig=-VaHv2_MfLKX42ys3uhI9fa9XhpMVmi5l7PdPAGGA9c')
})

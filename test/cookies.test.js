import './fixes';
import { jest } from '@jest/globals'
import { ok } from '@worker-tools/response-creators';

import { executeEffects, unsignedCookies } from '../index.js';


test('unsignedCookies', () => {
  expect(unsignedCookies()).toBeDefined()
})

const request = new Request('/item/detail?id=3', {
  method: 'POST',
  headers: {
    'Cookie': 'foo=bar; user=bert; no=mad',
  },
})

import { MiddlewareCookieStore } from '../utils/middleware-cookie-store';
test('basics', async () => {
  const { unsignedCookies: cookies, unsignedCookieStore: cookieStore } = await unsignedCookies()({ request, effects: [] })
  expect(cookies).toBeDefined()
  expect(cookieStore).toBeDefined()
  expect(cookieStore).toBeInstanceOf(MiddlewareCookieStore)
})

test('parsed cookies', async () => {
  const { unsignedCookies: cookies } = await unsignedCookies()({ request, effects: [] })
  expect(cookies.foo).toBe('bar')
  expect(cookies.user).toBe('bert')
  expect(cookies.no).toBe('mad')
})

test('effects', async () => {
  const { effects } = await unsignedCookies()({ request, effects: [] })
  expect(effects.length).toBe(1);
})

test('setting cookies', async () => {
  const { unsignedCookieStore: cookieStore, effects } = await unsignedCookies()({ request, effects: [] })
  cookieStore.set('bee', 'hive')
  const setCookie = (await executeEffects(effects, ok())).headers.get('set-cookie')
  expect(setCookie).toBe('bee=hive')
})

test('deleting cookies', async () => {
  const { unsignedCookieStore: cookieStore, effects } = await unsignedCookies()({ request, effects: [] })
  cookieStore.delete('foo')
  const setCookie = (await executeEffects(effects, ok())).headers.get('set-cookie')
  expect(setCookie).toContain('foo=;')
  expect(setCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT;')
})

test('setting cookies 2', async () => {
  const { unsignedCookieStore: cookieStore, effects } = await unsignedCookies()({ request, effects: [] })
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
  const setCookie = response.headers.get('set-cookie')
  expect(setCookie).toContain('foo=bar');
  expect(setCookie).toContain(`Expires=${new Date(now).toUTCString()}`);
  expect(setCookie).toContain('Domain=example.com');
  expect(setCookie).toContain('Path=/beehive');
  expect(setCookie).toContain('SameSite=Strict');
  expect(setCookie).toContain('HttpOnly');
})

test('cookie value encoding', async () => {
  const { unsignedCookieStore: cookieStore, effects } = await unsignedCookies()({ request, effects: [] })
  const randomUTF8 = '⟗⥍⛨ⅸ⼩⍍⫵␇⌯ⱎ⇗⪽‷⚷␢⒏⋁⺺↲‚✰⧒Ⳟ☵⦞⩗▥⸲Ⳃ⤚⼳⢍'
  cookieStore.set('two, words', randomUTF8)
  const response = await executeEffects(effects, ok())
  expect(response.headers.get('set-cookie')).toContain(`two%2C%20words=${encodeURIComponent(randomUTF8)}`)
})

test('cookie value encoding 2', async () => {
  const { unsignedCookieStore: cookieStore, effects } = await unsignedCookies()({ request, effects: [] })
  const randomUTF8 = '⟗⥍⛨ⅸ⼩⍍⫵␇⌯ⱎ⇗⪽‷⚷␢⒏⋁⺺↲‚✰⧒Ⳟ☵⦞⩗▥⸲Ⳃ⤚⼳⢍'
  cookieStore.set({ name: 'two, words', value: randomUTF8 })
  const response = await executeEffects(effects, ok())
  expect(response.headers.get('set-cookie')).toContain(`two%2C%20words=${encodeURIComponent(randomUTF8)}`)
})

import { iterHeadersSetCookieFix }  from '../utils/headers-set-cookie-fix.js';
test('setting multiple cookies', async () => {
  const { unsignedCookieStore: cookieStore, effects } = await unsignedCookies()({ request, effects: [] })
  cookieStore.set('one', '1')
  cookieStore.set('two', '2')
  const response = await executeEffects(effects, ok())
  expect([...iterHeadersSetCookieFix(response.headers)].length).toBe(2)
})

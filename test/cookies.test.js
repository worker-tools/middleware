import './fixes';
import { jest } from '@jest/globals'
import { ok } from '@worker-tools/response-creators';

import { withUnsignedCookies, withSignedCookies, executeEffects } from '../index.js';

import { iterHeadersSetCookieFix } from '../utils/headers-set-cookie-fix.js';
import { MiddlewareCookieStore } from '../utils/middleware-cookie-store';
import { SignedCookieStore } from '@worker-tools/signed-cookie-store';

const request = new Request('/item/detail?id=3', {
  method: 'POST',
  headers: {
    'Cookie': 'foo=bar; user=bert; no=mad',
  },
})

describe('unsigned cookies', () => {
  test('exist', () => {
    expect(withUnsignedCookies()).toBeDefined()
  })

  test('basics', async () => {
    const { cookies, cookieStore } = await withUnsignedCookies()({ request, effects: [] })
    expect(cookies).toBeDefined()
    expect(cookieStore).toBeDefined()
    expect(cookieStore).toBeInstanceOf(MiddlewareCookieStore)
  })

  test('parsed cookies', async () => {
    const { cookies } = await withUnsignedCookies()({ request, effects: [] })
    expect(cookies.foo).toBe('bar')
    expect(cookies.user).toBe('bert')
    expect(cookies.no).toBe('mad')
  })

  test('effects', async () => {
    const { effects } = await withUnsignedCookies()({ request, effects: [] })
    expect(effects.length).toBe(1);
  })

  test('setting cookies', async () => {
    const { cookieStore, effects } = await withUnsignedCookies()({ request, effects: [] })
    cookieStore.set('bee', 'hive')
    const setCookie = (await executeEffects(effects, ok())).headers.get('set-cookie')
    expect(setCookie).toBe('bee=hive')
  })

  test('deleting cookies', async () => {
    const { cookieStore, effects } = await withUnsignedCookies()({ request, effects: [] })
    cookieStore.delete('foo')
    const setCookie = (await executeEffects(effects, ok())).headers.get('set-cookie')
    expect(setCookie).toContain('foo=;')
    expect(setCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT;')
  })

  test('setting cookies 2', async () => {
    const { cookieStore, effects } = await withUnsignedCookies()({ request, effects: [] })
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
    const { cookieStore, effects } = await withUnsignedCookies()({ request, effects: [] })
    const randomUTF8 = '⟗⥍⛨ⅸ⼩⍍⫵␇⌯ⱎ⇗⪽‷⚷␢⒏⋁⺺↲‚✰⧒Ⳟ☵⦞⩗▥⸲Ⳃ⤚⼳⢍'
    cookieStore.set('two, words', randomUTF8)
    const response = await executeEffects(effects, ok())
    expect(response.headers.get('set-cookie')).toContain(`two%2C%20words=${encodeURIComponent(randomUTF8)}`)
  })

  test('cookie value encoding 2', async () => {
    const { cookieStore, effects } = await withUnsignedCookies()({ request, effects: [] })
    const randomUTF8 = '⟗⥍⛨ⅸ⼩⍍⫵␇⌯ⱎ⇗⪽‷⚷␢⒏⋁⺺↲‚✰⧒Ⳟ☵⦞⩗▥⸲Ⳃ⤚⼳⢍'
    cookieStore.set({ name: 'two, words', value: randomUTF8 })
    const response = await executeEffects(effects, ok())
    expect(response.headers.get('set-cookie')).toContain(`two%2C%20words=${encodeURIComponent(randomUTF8)}`)
  })

  test('setting multiple cookies', async () => {
    const { cookieStore, effects } = await withUnsignedCookies()({ request, effects: [] })
    cookieStore.set('one', '1')
    cookieStore.set('two', '2')
    const response = await executeEffects(effects, ok())
    expect([...iterHeadersSetCookieFix(response.headers)].length).toBe(2)
  })
})

const secret = 'password123'

describe('signed cookies', () => {
  test('exists', () => {
    expect(withSignedCookies({ secret })).toBeDefined()
  })

  test('throws on missing secret', () => {
    expect(() => withSignedCookies()).toThrowError();
  })

  const signedCookiesFn = withSignedCookies({ secret })

  test('use with other cookie middleware', async () => {
    const { cookies, signedCookies, unsignedCookies, effects } = await signedCookiesFn(withUnsignedCookies()({ request, effects: [] }))
    expect(unsignedCookies).toBeDefined()
    expect(signedCookies).toBeDefined()
    expect(cookies).toBe(signedCookies) // last one "wins"
  })

  test('unsigned cookies to be ignored', async () => {
    const { cookies, cookieStore, effects } = await signedCookiesFn({ request, effects: [] })
    expect(Object.keys(cookies).length).toBe(0)
    expect(cookieStore.get('foo')).resolves.toBeNull
    expect(cookieStore.getAll()).resolves.toStrictEqual([])
  })

  const signedRequest = new Request('/', {
    headers: {
      'Cookie': 'foo=bar; foo.sig=Sd_7Nz01uxBspv_y6Lqs8gLXXYEe8iFEN8fNouVNLzI; bar=ignored',
    },
  })

  test('get signed cookie', async () => {
    const { cookies, cookieStore, effects } = await signedCookiesFn({ request: signedRequest, effects: [] })
    expect(cookies).toStrictEqual({ foo: 'bar' })
    expect(cookieStore.get('bar')).resolves.toBeNull
  })

  test('throws on forged signature', async () => {
    const forgedRequest = new Request('/', {
      headers: {
        'Cookie': 'foo=bar; foo.sig=Sd_7Nz01uxBspv_y6Lqs8gLXXYEe8iFEN8fAAAAAAAA',
      },
    })
    expect(signedCookiesFn({ request: forgedRequest, effects: [] })).rejects.toBeInstanceOf(Response)
  })

  test('verifying signatures form previous keys', async () => {
    const { cookies, cookieStore, effects } = await withSignedCookies({ 
      secret: 'new-key', 
      keyring: [await SignedCookieStore.deriveCryptoKey({ secret })] 
    })({ 
      request: signedRequest, effects: [] 
    })
    expect(cookies).toStrictEqual({ foo: 'bar' })
  })

  test('signing signatures with new key', async () => {
    const { cookies, cookieStore, effects } = await withSignedCookies({ 
      secret: 'new-key', 
      keyring: [await SignedCookieStore.deriveCryptoKey({ secret })] 
    })({ 
      request: signedRequest, effects: [] 
    })
    cookieStore.set('foo', 'bar')
    const setCookie = (await executeEffects(effects, ok())).headers.get('set-cookie')
    expect(setCookie).not.toContain('foo.sig=Sd_7Nz01uxBspv_y6Lqs8gLXXYEe8iFEN8fNouVNLzI')
    expect(setCookie).toContain('foo.sig=-VaHv2_MfLKX42ys3uhI9fa9XhpMVmi5l7PdPAGGA9c')
  })
})

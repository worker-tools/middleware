import './fixes';
import { jest } from '@jest/globals'
import { ok } from '@worker-tools/response-creators';

import { withBasics } from '../index.js';

test('environment', () => {
  expect(Request).toBeDefined();
  expect(Response).toBeDefined();
  expect(location).toBeDefined();
  expect(withBasics).toBeDefined();
});

test('basics', () => {
  expect(withBasics()).toBeDefined()
})

const request = new Request('/item/detail?id=3', {
  method: 'POST',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US);',
  },
})

const basics = withBasics()

test('basics/method', async () => {
  const { method } = await basics({ request, effects: [] })
  expect(method).toBe('POST')
})

test('basics/url', async () => {
  const { url } = await basics({ request, effects: [] })
  expect(url).toBeInstanceOf(URL)
})

test('basics/headers', async () => {
  const { headers } = await basics({ request, effects: [] })
  expect(headers).toBeInstanceOf(Headers)
  expect(headers.get('user-agent')).toBe('Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US);')
})

test('basics/pathname', async () => {
  const { pathname } = await basics({ request, effects: [] })
  expect(pathname).toBe('/item/detail')
})

test('basics/search', async () => {
  const { searchParams, query } = await basics({ request, effects: [] })
  expect(searchParams).toBeInstanceOf(URLSearchParams)
  expect(searchParams.get('id')).toBe('3')
  expect(query.id).toBe('3')
})

test('basics/userAgent', async () => {
  const { userAgent } = await basics({ request, effects: [] })
  expect(userAgent).toBe('Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US);')
})

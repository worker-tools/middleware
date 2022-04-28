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

import { basics } from '../basics.ts';

test('environment', () => {
  assertExists(Request);
  assertExists(Response);
  assertExists(basics);
});

test('basics', () => {
  assertExists(basics())
})

const request = new Request('/item/detail?id=3', {
  method: 'POST',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US);',
  },
})

const handled = Promise.resolve();
const waitUntil = () => {}

const withBasics = basics()

test('basics/method', async () => {
  const { method } = await withBasics({ request, effects: [], handled, waitUntil });
  assertEquals(method, 'POST')
})

test('basics/url', async () => {
  const { url } = await withBasics({ request, effects: [], handled, waitUntil });
  assert(url instanceof URL);
})

test('basics/headers', async () => {
  const { headers } = await withBasics({ request, effects: [], handled, waitUntil });
  assert(headers instanceof Headers)
  assertEquals(headers.get('user-agent'), 'Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US);')
})

test('basics/pathname', async () => {
  const { pathname } = await withBasics({ request, effects: [], handled, waitUntil });
  assertEquals(pathname, '/item/detail')
})

test('basics/search', async () => {
  const { searchParams, query } = await withBasics({ request, effects: [], handled, waitUntil });
  assert(searchParams instanceof URLSearchParams)
  assertEquals(searchParams.get('id'), '3')
  assertEquals(query.id, '3')
})

test('basics/userAgent', async () => {
  const { userAgent } = await withBasics({ request, effects: [], handled, waitUntil });
  assertEquals(userAgent, 'Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US);')
})

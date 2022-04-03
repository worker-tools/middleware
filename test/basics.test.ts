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

import { EffectsList } from '../context.ts'
import { withBasics } from '../basics.ts';

test('environment', () => {
  assertExists(Request);
  assertExists(Response);
  assertExists(withBasics);
});

test('basics', () => {
  assertExists(withBasics())
})

const request = new Request('/item/detail?id=3', {
  method: 'POST',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US);',
  },
})

const mkCtx = (request: Request) => ({ request, effects: new EffectsList() })

const basics = withBasics()

test('basics/method', async () => {
  const { method } = await basics(mkCtx(request))
  assertEquals(method, 'POST')
})

test('basics/url', async () => {
  const { url } = await basics(mkCtx(request))
  assert(url instanceof URL);
})

test('basics/headers', async () => {
  const { headers } = await basics(mkCtx(request))
  assert(headers instanceof Headers)
  assertEquals(headers.get('user-agent'), 'Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US);')
})

test('basics/pathname', async () => {
  const { pathname } = await basics(mkCtx(request))
  assertEquals(pathname, '/item/detail')
})

test('basics/search', async () => {
  const { searchParams, query } = await basics(mkCtx(request))
  assert(searchParams instanceof URLSearchParams)
  assertEquals(searchParams.get('id'), '3')
  assertEquals(query.id, '3')
})

test('basics/userAgent', async () => {
  const { userAgent } = await basics(mkCtx(request))
  assertEquals(userAgent, 'Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US);')
})

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

import { anyCORS, strictCORS, REQUEST_METHOD, REQUEST_HEADERS, ALLOW_ORIGIN, ALLOW_METHODS, ALLOW_HEADERS, ALLOW_CREDENTIALS, ORIGIN, VARY } from '../cors.ts';

import { executeEffects } from '../context.ts'
import { ok, noContent } from 'https://ghuc.cc/worker-tools/response-creators/index.ts'

const handled = Promise.resolve()
const waitUntil = () => {}

test('environment', () => {
  assertExists(Request);
  assertExists(Response);
  assertExists(anyCORS);
  assertExists(strictCORS);
});

test('anyCORS', () => {
  assertExists(anyCORS())
})

const withAnyCors = anyCORS()

const withStrictCors = strictCORS({
  origin: { origin: 'localhost:12334' },
  methods: ['POST', 'PATCH'],
  headers: ['X-PINGOTHER'],
  credentials: true,
})

test('any method', async () => {
  const { effects } = await withAnyCors({ request: new Request('/', { method: 'OPTIONS', headers: { [REQUEST_METHOD]: 'POST' } }), effects: [], handled, waitUntil })
  const { headers } = await executeEffects(effects, noContent())
  assertStringIncludes(headers.get(ALLOW_METHODS)!, 'POST')
  assertStringIncludes(headers.get(VARY)!, REQUEST_METHOD)
})

test('any headers', async () => {
  const { effects } = await withAnyCors({ request: new Request('/', { method: 'OPTIONS', headers: { [REQUEST_HEADERS]: 'X-PINGOTHER, Content-Type' } }), effects: [], handled, waitUntil })
  const { headers } = await executeEffects(effects, noContent())
  assertStringIncludes(headers.get(ALLOW_HEADERS)!, 'X-PINGOTHER')
  assertStringIncludes(headers.get(ALLOW_HEADERS)!, 'Content-Type')
  assertStringIncludes(headers.get(VARY)!, REQUEST_HEADERS)
})

test('any origin', async () => {
  let { effects } = await withAnyCors({ request: new Request('/', { method: 'OPTIONS', headers: { [ORIGIN]: 'foo.example.com' } }), effects: [], handled, waitUntil })
  let { headers } = await executeEffects(effects, noContent())
  assertStringIncludes(headers.get(ALLOW_ORIGIN)!, 'foo.example.com');

  ({ effects } = await withAnyCors({ request: new Request('/', { method: 'OPTIONS', headers: { [ORIGIN]: 'bar.example.com' } }), effects: [], handled, waitUntil }));
  ({ headers } = await executeEffects(effects, noContent()));
  assertStringIncludes(headers.get(ALLOW_ORIGIN)!, 'bar.example.com');
  assertStringIncludes(headers.get(VARY)!, ORIGIN)
})

test('strict cors 1', async () => {
  const { effects } = await withStrictCors({ request: new Request('/', { method: 'OPTIONS', headers: { [ORIGIN]: 'foo.example.com' } }), effects: [], handled, waitUntil })
  const { headers } = await executeEffects(effects, noContent())
  assertEquals(headers.get(ALLOW_ORIGIN), 'localhost:12334')
})

// const withCors2 = strictCORS({
//   origin: { origin: 'localhost:12334' },
//   methods: ['DELETE', 'PUT'],
//   headers: [],
//   credentials: true,
// })

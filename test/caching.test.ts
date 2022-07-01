// deno-lint-ignore-file no-unused-vars
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
// import { spy, assertSpyCall, assertSpyCalls } from "https://deno.land/std@0.133.0/testing/mock.ts";
const { test } = Deno;

import { Temporal } from 'https://cdn.skypack.dev/temporal-polyfill@0.0.7?dts';
import { caching } from '../caching.ts';

import { withMiddleware, combine } from '../context.ts'
import { ok } from 'https://ghuc.cc/worker-tools/response-creators/index.ts'

test('exists', async () => {
  const fn = withMiddleware(caching({
    maxAge: 31536000,
    public: true,
  }), () => ok())
  const res = await fn(new Request('/'))
  const cacheControl = res.headers.get('cache-control');
  assertEquals(cacheControl, 'max-age=31536000, public')
})

test('temporal', async () => {
  const fn = withMiddleware(caching({
    sharedMaxAge: Temporal.Duration.from({ years: 1 }),
    public: true,
  }), () => ok())
  const res = await fn(new Request('/'))
  const cacheControl = res.headers.get('cache-control');
  assertEquals(cacheControl, 's-maxage=31536000, public')
})

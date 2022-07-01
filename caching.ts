// deno-lint-ignore-file no-explicit-any
import type { Temporal } from 'https://cdn.skypack.dev/temporal-spec@0.0.2?dts';
import type { Awaitable } from "./utils/common-types.ts";
import type { Context } from "./index.ts";

import { format, CacheControl } from 'https://cdn.skypack.dev/@tusbar/cache-control@0.6.1?dts'

/**
 * The Cache-Control HTTP header field holds directives (instructions)
 * — in both requests and responses — that control caching in browsers
 * and shared caches (e.g. Proxies, CDNs).
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
 */
export type CacheOptions = {
  [K in keyof CacheControl]: CacheControl[K] extends (number | null | undefined) 
    ? number | Temporal.Duration | null 
    : CacheControl[K]
}

const SECOND = { unit: 'second', relativeTo: '1970-01-01' } as Temporal.DurationTotalOf;
const isDuration = (x?: unknown): x is Temporal.Duration => (<any>x)?.[Symbol.toStringTag] === 'Temporal.Duration'

export const caching = (options: CacheOptions = {}) => async <X extends Context>(ax: Awaitable<X>) => {
  const x = await ax;
  const opts: CacheControl = Object.fromEntries(
    Object.entries(options).map(([k, v]) => [k, isDuration(v) ? v.total(SECOND) : v])
  );
  x.effects.push(res => res.headers.set('Cache-Control', format(opts)));
  return x;
}

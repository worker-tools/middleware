import type { Temporal } from '@js-temporal/polyfill'
import { Awaitable } from "./utils/common-types";
import { Context } from "./index";

export type CacheControl = 'no-cache' | 'no-store' | 'public' | 'private' | string;

export interface CacheOptions {
  cacheControl?: CacheControl,
  maxAge?: number | Temporal.Duration,
  mustRevalidate?: boolean,
  immutable?: boolean,
}

const SECONDS = { unit: 'second', relativeTo: '1970-01-01' } as Temporal.DurationTotalOf;

/**
 * TODO: Implement request-response
 */
export const withCaching = (opt: CacheOptions = {}) => async <X extends Context>(ax: Awaitable<X>): Promise<X> => {
  const x = await ax;
  const req = x.request;
  
  x.effects.push(res => {
    res.headers.set('cache-control', opt.cacheControl ?? '')

    if (typeof opt.maxAge === 'number') {
      // FIXME: check for global DEBUG var? Check process.env ??
      if (opt.maxAge > 31536000) console.warn(`Provided maxAge appears to be too large. Perhaps you meant ${opt.maxAge / 1000}? maxAge is defined in seconds!`)
      res.headers.append('cache-control', `max-age=${opt.maxAge}`)
    } else if (opt.maxAge) {
      res.headers.append('cache-control', `max-age=${opt.maxAge.total(SECONDS)}`)
    }

    if (typeof opt.mustRevalidate) {
      res.headers.append('cache-control', 'must-revalidate')
    }

    if (typeof opt.immutable) {
      res.headers.append('cache-control', 'immutable')
    }

    return res;
  })

  return x;
}

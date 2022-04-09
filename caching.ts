//xxxx/ <reference path="./typings/Temporal.d.ts" />

import type { Awaitable } from "./utils/common-types.ts";
import type { Context } from "./index.ts";


export type CacheControl = 'no-cache' | 'no-store' | 'public' | 'private' | string;

export interface CacheOptions {
  cacheControl?: CacheControl,
  maxAge?: number,
  mustRevalidate?: boolean,
  immutable?: boolean,
}

// const SECONDS = { unit: 'second', relativeTo: '1970-01-01' } as Temporal.DurationTotalOf;

/**
 * TODO: Implement request-response
 */
export const caching = (opt: CacheOptions = {}) => async <X extends Context>(ax: Awaitable<X>) => {
  const x = await ax;
  // const req = x.request;
  
  x.effects.push(res => {
    res.headers.set('cache-control', opt.cacheControl ?? '')

    if (typeof opt.maxAge === 'number') {
      // FIXME: check for global DEBUG var? Check process.env ??
      if (opt.maxAge > 31536000) console.warn(`Provided maxAge appears to be too large. Perhaps you meant ${opt.maxAge / 1000}? maxAge is defined in seconds!`)
      res.headers.append('cache-control', `max-age=${opt.maxAge}`)
    // } else if (opt.maxAge) {
    //   res.headers.append('cache-control', `max-age=${opt.maxAge.total(SECONDS)}`)
    }

    if (opt.mustRevalidate) {
      res.headers.append('cache-control', 'must-revalidate')
    }

    if (opt.immutable) {
      res.headers.append('cache-control', 'immutable')
    }

    return res;
  })

  return x;
}

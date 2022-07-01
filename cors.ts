// deno-lint-ignore-file no-explicit-any
import type { Temporal } from 'https://cdn.skypack.dev/temporal-spec@0.0.2?dts';
import type { SetRequired } from 'https://cdn.skypack.dev/type-fest@2.15.1?dts';
import type { Awaitable } from "./utils/common-types.ts";
import type { Context } from "./index.ts";

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export const ORIGIN = 'Origin';
export const REQUEST_METHOD = 'Access-Control-Request-Method';
export const REQUEST_HEADERS = 'Access-Control-Request-Headers';
export const ALLOW_ORIGIN = 'Access-Control-Allow-Origin';
export const ALLOW_METHODS = 'Access-Control-Allow-Methods';
export const ALLOW_HEADERS = 'Access-Control-Allow-Headers';
export const ALLOW_CREDENTIALS = 'Access-Control-Allow-Credentials';
export const VARY = 'VARY';

export interface CORSOptions {
  origin?: string | { origin: string }
  methods?: Method[],
  headers?: string[],
  credentials?: boolean;
  maxAge?: number | Temporal.Duration;
}

export type StrictCORSOptions = SetRequired<CORSOptions, 'origin' | 'methods' | 'headers'>;

const SECOND = { unit: 'second', relativeTo: '1970-01-01' } as Temporal.DurationTotalOf;
const isDuration = (x?: unknown): x is Temporal.Duration => (<any>x)?.[Symbol.toStringTag] === 'Temporal.Duration'
const toMaxAge = (x: number | Temporal.Duration) => (isDuration(x) ? x.total(SECOND) : x).toString()

/**
 * A CORS middleware that gives clients exactly the permissions they ask for, unless constrained by the definitions in `options`.
 * 
 * Note that applying this middleware to your routes isn't enough for non-GET requests.
 * Pre-flight/OPTIONS routes need to be added manually:
 * ```
 * router.options('/your/path', anyCORS(), () => noContent())
 * router.post('/your/path', anyCORS(), (req, {}) => ok())
 * ```
 */
export const cors = (options: CORSOptions = {}) => async <X extends Context>(ax: Awaitable<X>): Promise<X> => {
  const x = await ax;
  const req = x.request;

  x.effects.push(res => {
    const optOrigin = typeof options.origin === 'string'
      ? new URL(options.origin)
      : options.origin;

    res.headers.set(ALLOW_ORIGIN, optOrigin?.origin ?? req.headers.get(ORIGIN) ?? '*');

    const requestedMethod = <Method>req.headers.get(REQUEST_METHOD);
    if (requestedMethod && (options.methods?.includes(requestedMethod) ?? true)) {
      res.headers.append(ALLOW_METHODS, requestedMethod);
    }

    const requestedHeaders = new Set(req.headers.get(REQUEST_HEADERS)?.split(',')?.map(h => h.trim()))
    for (const h of options.headers?.filter(h => requestedHeaders.has(h)) ?? requestedHeaders) {
      res.headers.append(ALLOW_HEADERS, h);
    }

    if (options.credentials)
      res.headers.set(ALLOW_CREDENTIALS, 'true');

    if (options.maxAge)
      res.headers.set('Access-Control-Max-Age', toMaxAge(options.maxAge))

    if (!options.origin) res.headers.append(VARY, ORIGIN)
    if (!options.methods) res.headers.append(VARY, REQUEST_METHOD)
    if (!options.headers) res.headers.append(VARY, REQUEST_HEADERS)

    return res;
  })

  return x;
}

export { cors as anyCORS }

/**
 * A CORS middleware that only grants the permissions defined via `options`.
 * 
 * Note that applying this middleware to your routes isn't enough for non-GET requests.
 * Pre-flight/OPTIONS routes need to be added manually:
 * ```
 * router.options('/your/path', strictCORS({ ... }), () => noContent())
 * router.post('/your/path', strictCORS({ ... }), (req, {}) => ok())
 * ```
 */
export const strictCORS = (options: StrictCORSOptions) => async <X extends Context>(ax: Awaitable<X>): Promise<X> => {
  const x = await ax;
  const req = x.request;

  x.effects.push(res => {
    const optOrigin = typeof options.origin === 'string'
      ? new URL(options.origin)
      : options.origin;

    res.headers.set(ALLOW_ORIGIN, optOrigin.origin);

    const requestedMethod = <Method>req.headers.get(REQUEST_METHOD);
    if (requestedMethod && options.methods.includes(requestedMethod)) {
      for (const m of options.methods) {
        res.headers.append(ALLOW_METHODS, m);
      }
    }

    if (req.headers.get(REQUEST_HEADERS)) {
      for (const h of options.headers) {
        res.headers.append(ALLOW_HEADERS, h);
      }
    }

    if (options.credentials)
      res.headers.set(ALLOW_CREDENTIALS, 'true');

    if (options.maxAge)
      res.headers.set('Access-Control-Max-Age', toMaxAge(options.maxAge))

    return res;
  })

  return x;
}

// deno-lint-ignore-file
import { notAcceptable, unsupportedMediaType } from "https://ghuc.cc/worker-tools/response-creators/index.ts";
import negotiated from 'https://cdn.skypack.dev/negotiated@1.0.2';

import { Awaitable } from './utils/common-types.ts';
import { Context } from './index.ts'

const weightSortFn = <X extends { weight: number }>(a: X, b: X) => a.weight >= b.weight ? a : b;

const ACCEPT          = 'Accept';
const ACCEPT_ENCODING = 'Accept-Encoding';
const ACCEPT_LANGUAGE = 'Accept-Language';
// const ACCEPT_CHARSET = 'Accept-Charset';

const CONTENT_TYPE     = 'Content-Type';
const CONTENT_LANGUAGE = 'Content-Language';
const CONTENT_ENCODING = 'Content-Encoding';
// const CHARSET = 'charset';

const VARY = 'Vary';

export interface ContentType<T> {
  /** The best content type _acceptable to the client_. */
  type: T,
}
export interface ContentLanguage<T> {
  /** The best language _acceptable to the client_. */
  language: T,
}
export interface ContentEncoding<T> {
  /** The best encoding _acceptable to the client_. */
  encoding: T,
}

export interface Accepted<T> {
  /** The request's `Content-Type` header iff acceptable to this endpoint */
  accepted: T,
}
export interface AcceptedLanguage<T> {
  /** The request's `Language` header if (and only if) accepted by this endpoint */
  acceptedLanguage: T,
}
export interface AcceptedEncoding<T> {
  /** The request's `Encoding` header if (and only if) accepted by this endpoint */
  acceptedEncoding: T,
}

/**
 * Performs content negotiation over the content type of the response.
 * @param types The content types _provided_ by this endpoint. 
 */
export function contentTypes<T extends string, TS extends readonly T[]>(
  types: TS
): <X extends Context>(ax: Awaitable<X>) => Promise<X & ContentType<TS[number]>> {
  return async ax => {
    const ctx = await ax;
    const { headers } = ctx.request;

    const type = [...negotiated.mediaTypes(headers.get(ACCEPT)) as any]
      .filter(t => !types || types.includes(t.type))
      .reduce(weightSortFn, { weight: -1 }).type as TS[number]

    if (headers.has(ACCEPT) && types && !type) throw notAcceptable();

    ctx.effects.push(response => {
      response.headers.set(CONTENT_TYPE, type)
      // If the server accepts more than 1 option, we set the vary header for correct caching
      if ((types?.length ?? 0) > 1) response.headers.append(VARY, ACCEPT);
      return response;
    })

    return Object.assign(ctx, { type })
  }
}

/**
 * Performs content negotiation over the content language of the response.
 * @param languages The languages _provided_ by this endpoint. 
 */
export function contentLanguages<T extends string, TS extends readonly T[]>(
  languages: TS
): <X extends Context>(ax: Awaitable<X>) => Promise<X & ContentLanguage<TS[number]>> {
  return async ax => {
    const ctx = await ax;
    const { headers } = ctx.request;

    const language = [...negotiated.languages(headers.get(ACCEPT_LANGUAGE)) as any]
      .filter(l => !languages || languages.includes(l.language))
      .reduce(weightSortFn, { weight: -1 }).language as TS[number]

    if (headers.has(ACCEPT_LANGUAGE) && languages && !language) throw notAcceptable();

    ctx.effects.push(response => {
      response.headers.set(CONTENT_LANGUAGE, language)
      // If the server accepts more than 1 option, we set the vary header for correct caching
      if ((languages?.length ?? 0) > 1) response.headers.append(VARY, ACCEPT_LANGUAGE);
      return response;
    })

    return Object.assign(ctx, { language })
  }
}

/**
 * Performs content negotiation over the content encoding of the response.
 * @param encodings The encodings _provided_ by this endpoint.
 */
export function contentEncodings<T extends string, TS extends readonly T[]>(
  encodings: TS
): <X extends Context>(ax: Awaitable<X>) => Promise<X & ContentEncoding<TS[number]>> {
  return async ax => {
    const ctx = await ax;
    const { headers } = ctx.request;

    const encoding = [...negotiated.encodings(headers.get(ACCEPT_ENCODING)) as any]
      .filter(e => !encodings || encodings.includes(e.encoding))
      .reduce(weightSortFn, { weight: -1 }).encoding as TS[number];

    // TODO: how to handle status errors in middleware??
    if (headers.has(ACCEPT_ENCODING) && encodings && !encoding) throw notAcceptable();

    ctx.effects!.push(response => {
      response.headers.set(CONTENT_ENCODING, encoding)
      // If the server accepts more than 1 option, we set the vary header for correct caching
      if ((encodings?.length ?? 0) > 1) response.headers.append(VARY, ACCEPT_ENCODING);
      return response
    })

    return Object.assign(ctx, { encoding })
  }
}

export { 
  contentTypes as provides,
  contentLanguages as providesLanguages,
  contentEncodings as providesEncodings,
}

/**
 * Determines if a request body content type is _acceptable_ to this endpoint.
 * @param types The content types _acceptable_ to this endpoint.
 */
export function accepts<T extends string, TS extends readonly T[]>(
  types: TS
): <X extends Context>(ax: Awaitable<X>) => Promise<X & Accepted<TS[number]>> {
  return async ax => {
    const ctx = await ax;
    const { headers } = ctx.request;

    const accepted = 
      [...negotiated.mediaTypes(headers.get(CONTENT_TYPE))][0]?.type as TS[number];

    if (types?.length && !types.includes(accepted)) throw unsupportedMediaType();

    return Object.assign(ctx, { accepted })
  }
}

/**
 * Determines if a request body content language is _acceptable_ to this endpoint.
 * @param languages The languages (of the request body) _acceptable_ to this endpoint.
 */
export function acceptsLanguages<T extends string, TS extends readonly T[]>(
  languages: TS
): <X extends Context>(ax: Awaitable<X>) => Promise<X & AcceptedLanguage<TS[number]>> {
  return async ax => {
    const ctx = await ax;
    const { headers } = ctx.request;

    const acceptedLanguage = 
      [...negotiated.languages(headers.get(CONTENT_LANGUAGE)) as any][0]?.language as TS[number];

    if (languages?.length && !languages.includes(acceptedLanguage)) throw notAcceptable();

    return Object.assign(ctx, { acceptedLanguage })
  }
}

/**
 * Determines if a request body content encoding is _acceptable_ to this endpoint.
 * @param encodings The body encodings _acceptable_ to this endpoint. 
 */
export function acceptsEncodings<T extends string, TS extends readonly T[]>(
  encodings: TS
): <X extends Context>(ax: Awaitable<X>) => Promise<X & AcceptedEncoding<TS[number]>> {
  return async ax => {
    const ctx = await ax;
    const { headers } = ctx.request;

    const acceptedEncoding = 
      [...negotiated.encodings(headers.get(CONTENT_ENCODING)) as any][0]?.encoding as TS[number];

    if (encodings?.length && !encodings.includes(acceptedEncoding)) throw notAcceptable();

    return Object.assign(ctx, { acceptedEncoding })
  }
}

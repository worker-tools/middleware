// deno-lint-ignore-file no-explicit-any
import { notAcceptable, unsupportedMediaType } from "https://ghuc.cc/worker-tools/response-creators/index.ts";
import negotiated from 'https://esm.sh/negotiated@1.0.2/negotiated.js';

import { Awaitable } from './utils/common-types.ts';
import { Context } from './index.ts'

const weightSortFn = <X extends { weight: number }>(a: X, b: X) => a.weight >= b.weight ? a : b;

const ACCEPT = 'Accept';
const ACCEPT_ENCODING = 'Accept-Encoding';
const ACCEPT_LANGUAGE = 'Accept-Language';
// const ACCEPT_CHARSET = 'Accept-Charset';

const CONTENT_TYPE = 'Content-Type';
const CONTENT_LANGUAGE = 'Content-Language';
const CONTENT_ENCODING = 'Content-Encoding';
// const CHARSET = 'charset';

const VARY = 'Vary';

export interface ContentNegotiationOptions<
  T extends string,
  A extends string,
  TS extends readonly T[],
  AS extends readonly A[]
  > {
  /** The content types _provided_ by this endpoint. Not to be confused with `accepts`. */
  types?: TS,
  /** The body content types _acceptable_ to this endpoint. Not to be confused with `types`. */
  accepts?: AS,
}

export interface ContentNegotiationResults<T, AT> {
  /** The best content type acceptable _to the client_. */
  type: T,
  /** The request's `Content-Type` header iff acceptable to this endpoint */
  accepted: AT,
}

export interface LanguageNegotiationOptions<
  L extends string,
  A extends string,
  LS extends readonly L[],
  AS extends readonly A[]
  > {
  /** The languages _provided_ by this endpoint. Not to be confused with `acceptsLanguages`. */
  languages?: LS,
  /** The languages (of the request body) _acceptable_ to this endpoint. Not to be confused with `languages`. */
  acceptsLanguages?: AS,
}

export interface LanguageNegotiationResults<L, AL> {
  /** The best language acceptable _to the client_. */
  language: L,
  /** The request's `Language` header if (and only if) accepted by this endpoint */
  acceptedLanguage: AL,
}

export interface EncodingNegotiationOptions<
  E extends string,
  A extends string,
  ES extends readonly E[],
  AS extends readonly A[]
  > {
  /** The encodings _provided_ by this endpoint. Not to be confused with `acceptsEncodings`. */
  encodings?: ES,
  /** The body encodings _acceptable_ to this endpoint. Not to be confused with `encodings`. */
  acceptsEncodings?: AS,
}
export interface EncodingNegotiationResults<E, AE> {
  /** The best encoding acceptable _to the client_. */
  encoding: E,
  /** The request's `Encoding` header if (and only if) accepted by this endpoint */
  acceptedEncoding: AE,
}

export function withContentNegotiation<
  T extends string,
  A extends string,
  TS extends readonly T[],
  AS extends readonly A[]
>(
  opts: ContentNegotiationOptions<T, A, TS, AS> = {}
): <X extends Context>(ax: Awaitable<X>) => Promise<X & ContentNegotiationResults<TS[number], AS[number]>> {
  return async ax => {
    const ctx = await ax;
    const headers = ctx.request.headers;
    const { types, accepts } = opts;

    const resultA = [...negotiated.mediaTypes(headers.get(CONTENT_TYPE))];
    const accepted = resultA[0]?.type as AS[number];

    if (accepts?.length && !accepts.includes(accepted)) throw unsupportedMediaType();

    const resultT = [...negotiated.mediaTypes(headers.get(ACCEPT))]
      .filter(t => !types || types.includes(t.type as TS[number]))
      .reduce(weightSortFn, { weight: -1 } as any)

    const type = resultT.type as TS[number]

    if (headers.has(ACCEPT) && types && !type) throw notAcceptable();
    
    ctx.effects.push(response => {
      // If the server accepts more than 1 option, we set the vary header for correct caching
      if ((types?.length ?? 0) > 1) response.headers.append(VARY, ACCEPT);
      return response;
    })

    return Object.assign(ctx, { type, accepted })
  }
}

export function withLanguageNegotiation<
  L extends string,
  A extends string,
  LS extends readonly L[],
  AS extends readonly A[]
>(
  opts: LanguageNegotiationOptions<L, A, LS, AS> = {}
): <X extends Context>(ax: Awaitable<X>) => Promise<X & LanguageNegotiationResults<LS[number], AS[number]>> {
  return async ax => {
    const ctx = await ax;
    const headers = ctx.request.headers;
    const { languages, acceptsLanguages } = opts;

    const resultA = [...negotiated.languages(headers.get(CONTENT_LANGUAGE))]
    const acceptedLanguage = resultA[0]?.language as AS[number];

    // TODO: make configurable??
    if (acceptsLanguages?.length && !acceptsLanguages.includes(acceptedLanguage)) throw notAcceptable();

    const resultL = [...negotiated.languages(headers.get(ACCEPT_LANGUAGE))]
      .filter(l => !languages || languages.includes(l.language as LS[number]))
      .reduce(weightSortFn, { weight: -1 } as any);

    const language = resultL.language as LS[number];

    // TODO: how to handle status errors in middleware??
    if (headers.has(ACCEPT_LANGUAGE) && languages && !language) throw notAcceptable();

    ctx.effects.push(response => {
      if ((languages?.length ?? 0) > 1) response.headers.append(VARY, ACCEPT_LANGUAGE);
      return response
    })

    return Object.assign(ctx, { language, acceptedLanguage });
  }
}

export function withEncodingNegotiation<
  E extends string,
  A extends string,
  ES extends readonly E[],
  AS extends readonly A[]
>(
  opts: EncodingNegotiationOptions<E, A, ES, AS>
): <X extends Context>(ax: Awaitable<X>) => Promise<X & EncodingNegotiationResults<ES[number], AS[number]>> {
  return async ax => {
    const ctx = await ax;
    const headers = ctx.request.headers;
    const { encodings, acceptsEncodings } = opts;

    const resultA = [...negotiated.encodings(headers.get(CONTENT_ENCODING))];
    const acceptedEncoding = resultA[0]?.encoding as AS[number];

    // TODO: make configurable??
    if (acceptsEncodings?.length && !acceptsEncodings.includes(acceptedEncoding)) throw notAcceptable();

    const resultL = [...negotiated.encodings(headers.get(ACCEPT_ENCODING))]
      .filter(e => !encodings || encodings.includes(e.encoding as ES[number]))
      .reduce(weightSortFn, { weight: -1 } as any);

    const encoding = resultL.encoding as ES[number];

    // TODO: how to handle status errors in middleware??
    if (headers.has(ACCEPT_ENCODING) && encodings && !encoding) throw notAcceptable();

    ctx.effects.push(response => {
      if ((encodings?.length ?? 0) > 1) response.headers.append(VARY, ACCEPT_ENCODING);
      return response
    })

    return Object.assign(ctx, { encoding, acceptedEncoding });
  }
}

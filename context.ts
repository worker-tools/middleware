// deno-lint-ignore-file no-explicit-any
export { pipe as combine } from 'https://cdn.skypack.dev/ts-functional-pipe@3.1.2?dts';
import { ResolvablePromise } from 'https://ghuc.cc/worker-tools/resolvable-promise/index.ts'

import { AppendOnlyList } from "./utils/append-only-list.ts";
import { Awaitable, Callable } from "./utils/common-types.ts";

export type ResponseEffect = (r: Response) => void | Awaitable<Response>

export class EffectsList extends AppendOnlyList<ResponseEffect> {}

export interface Context { 
  /**
   * The original request for use in middleware. Also accessible via first argument to user handler.
   */
  request: Request, 

  /** 
   * A list of effects/transforms applied to the `Response` after the application handler completes.
   * Middleware can add effects to the list. Application handlers should ignore it. 
   * @deprecated Prop might change name
   */
  effects: AppendOnlyList<ResponseEffect>,

  /**
   * TODO
   */
  waitUntil: (f: any) => void,

  /** https://github.com/w3c/ServiceWorker/issues/1397 */
  handled: Promise<void>

  /**
   * The URL pattern match that caused this handler to run. See the URL Pattern API for more.
   */
  match?: URLPatternResult,

  /**
   * Only available if the router is used via `fetchEventListener`.
   * Many Worker Runtimes such as Deno an CF module workers don't provide fetch events. 
   */
  event?: FetchEvent, 

  /** Might be present based on usage */
  env?: any

  /** Might be present based on usage */
  ctx?: any

  /** Might be present based on usage */
  connInfo?: any

  /** Might be present based on usage */
  args?: any[]
}

/**
 * Helper type to get the context type of a given middleware function.
 * 
 * Example:
 * ```ts
 * const mw = combine(basics(), contentTypes(['text/html', 'application/json']))
 * type MWContext = ContextOf<typeof mw>;
 * const handler = (req: Request, context: MWContext) => ok()
 * new WorkerRouter().get('/', mw, handler)
 * ```
 */
export type ContextOf<MW extends (...args: any[]) => Awaitable<Context>> = Awaited<ReturnType<MW>>

/**
 * @deprecated Function might change name
 * @param effects 
 * @param response 
 * @returns 
 */
export function executeEffects(effects: EffectsList, response: Awaitable<Response>) {
  // TODO: to reduce or reduceRight, that is the question...
  // reduceRight matches the behavior of my initial, non-compose friendly middleware model 
  // which was just increasingly deep levels of wrapped function calls.
  // In that model, the effects (post-processes) of the last applied middleware were executed first.
  // Regular reduce matches the order in which middlewares are applied, 
  // which probably is close what users expect to happen, anyway...
  return [...effects].reduceRight(async (response, effect) => effect(await response) ?? response, response) ?? response
}

/** Any record of unknown values */
export type AnyRecord = Record<PropertyKey, unknown>

/**
 * A helper function to create user-defined middleware. 
 * 
 * Its main purpose is to allow developers to create correctly typed middleware without dealing with generics.
 * This is achieved via the `_defaultExt` parameter, which is used to infer the types of the *extension* added to the *context*.
 * As the `_` prefix implies, it is not actually used.
 * The purpose of the default extension object is solely to tell the type checker which additional keys to expect on the context object after this middleware is applied.
 * The job of adding (default) values to the context belongs to the middleware function. 
 * 
 * Here are some example usages. All are valid in JavaScript and TypeScript:
 * 
 * ```ts
 * const fn = createMiddleware({}, _ => _)
 * const gn = createMiddleware({}, async ax => ({ ...await ax }))
 * const hn = createMiddleware({ foo: '' }, async ax => ({ ...await ax, foo: 'star' }))
 * const jn = createMiddleware({ bar: '' }, async ax => { 
 *   const x = await ax;
 *   x.effects.push(resp => {
 *     resp.headers.set('x-middleware', 'jn')
 *   })
 *   return { ...x, bar: 'star' }
 * })
 * const myMW = combine(fn, hn, jn, gn) 
 * //=> Context & { foo: string } & { bar: string }
 * ```
 * 
 * @param _defaultExt The default extension to the current context. Can also be a function that returns the extension object, which is never called (to avoid unnecessary memory allocation).
 * @param middlewareFn A middleware functions: Adds the keys listed in `defaultExt` to the context
 * @returns The provided `middlewareFn` with type annotations inferred based on `defaultExt`
 * @deprecated This feature is unstable. Might remove or rename later.
 */
export function createMiddleware<Etx extends AnyRecord>(_defaultExt: Callable<Etx>, middlewareFn: <Ctx extends Context>(ax: Awaitable<Ctx>) => Awaitable<Ctx & Etx>) {
  return middlewareFn;
}

/** @deprecated Name might change */
export type ErrorContext = Context & { error: Error, response: Response }
/** @deprecated Name might change */
export type Handler<X extends Context> = (request: Request, ctx: X) => Awaitable<Response>;
/** @deprecated Name might change */
export type ErrorHandler<X extends ErrorContext> = (request: Request, ctx: X) => Awaitable<Response>;
/** @deprecated Name might change */
export type Middleware<X extends Context, Y extends Context> = (x: Awaitable<X>) => Awaitable<Y>;

/** @deprecated Name & behavior might change */
export function withMiddleware<X extends Context, EX extends ErrorContext>(middleware: Middleware<Context, X>, handler: Handler<X>, fallback?: ErrorHandler<EX>) {
  return async (request: Request, ...args: any[]) => {
    const handled = new ResolvablePromise<void>()
    const effects = new EffectsList();
    const ctx = { request, effects, handled, args: [request, ...args], waitUntil: () => {} };
    try {
      const usrCtx = await middleware(ctx);
      const userResponse = handler(request, usrCtx);
      const response = await executeEffects(effects, userResponse);
      handled.resolve(Promise.resolve()) // same as queueMicrotask
      return response;
    } catch (err) {
      throw err
      // TODO
      // if (fallback && err instanceof Response) {
      //    fallback(request, Object.assign(ctx, { response: err }))
      // }
    }
  }
}

/**
 * Extends the lifetime of the install and activate events dispatched on the global scope as part of the
 * service worker lifecycle. This ensures that any functional events (like FetchEvent) are not dispatched until it
 * upgrades database schemas and deletes the outdated cache entries. 
 */
export interface ExtendableEvent extends Event {
  waitUntil(f: any): void;
}

export interface ExtendableEventInit extends EventInit {
  new(type: string, eventInitDict?: ExtendableEventInit): ExtendableEvent;
}

export interface FetchEventInit extends ExtendableEventInit {
  new(type: string, eventInitDict: FetchEventInit): FetchEvent;
  clientId?: string;
  preloadResponse?: Promise<any>;
  replacesClientId?: string;
  request: Request;
  resultingClientId?: string;
}

/**
 * This is the event type for fetch events dispatched on the service worker global scope. 
 * It contains information about the fetch, including the request and how the receiver will treat the response. 
 * It provides the event.respondWith() method, which allows us to provide a response to this fetch. 
 */
export interface FetchEvent extends ExtendableEvent {
  readonly clientId: string;
  readonly preloadResponse: Promise<any>;
  readonly replacesClientId: string;
  readonly request: Request;
  readonly resultingClientId: string;
  readonly handled: Promise<void>;
  respondWith(r: Response | Promise<Response>): void;
}

export type URLPatternInput = URLPatternInit | string;

export interface URLPatternInit {
  baseURL?: string;
  username?: string;
  password?: string;
  protocol?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
}

export interface URLPatternResult {
  inputs: [URLPatternInit] | [URLPatternInit, string];
  protocol: URLPatternComponentResult;
  username: URLPatternComponentResult;
  password: URLPatternComponentResult;
  hostname: URLPatternComponentResult;
  port: URLPatternComponentResult;
  pathname: URLPatternComponentResult;
  search: URLPatternComponentResult;
  hash: URLPatternComponentResult;
}

export interface URLPatternComponentResult {
  input: string;
  groups: {
      [key: string]: string | undefined;
  };
}


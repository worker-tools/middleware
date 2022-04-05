import { AppendOnlyList } from "./utils/append-only-list.ts";
import { Awaitable } from "./utils/common-types.ts";
import type { 
  URLPatternInit, URLPatternComponentResult, URLPatternInput, URLPatternResult 
} from 'https://esm.sh/urlpattern-polyfill@3.0.0/dist/index.js';
export type { URLPatternInit, URLPatternComponentResult, URLPatternInput, URLPatternResult }

export type ResponseEffect = (r: Response) => Awaitable<Response>

export class EffectsList extends AppendOnlyList<ResponseEffect> {}

export interface Context { 
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
  waitUntil?: (f: any) => void,

  /**
   * The URL pattern match that caused this handler to run. See the URL Pattern API for more.
   */
  match?: URLPatternResult,

  /**
   * Only available if the router is used via `fetchEventListener`.
   * Many Worker Environments such as Deno an CF module workers don't provide fetch events. 
   */
  event?: FetchEvent, 

  /** Might be present based on environment */
  env?: any

  /** Might be present based on environment */
  ctx?: any

  /** Might be present based on environment */
  connInfo?: any
}

/**
 * @deprecated Function might change name
 * @param effects 
 * @param response 
 * @returns 
 */
export function executeEffects(effects: EffectsList, response: Awaitable<Response>) {
  return [...effects].reduceRight(async (response, effect) => effect(await response), response) ?? response
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
 * This is the event type for fetch events dispatched on the service worker global scope. 
 * It contains information about the fetch, including the request and how the receiver will treat the response. 
 * It provides the event.respondWith() method, which allows us to provide a response to this fetch. 
 */
export interface FetchEvent extends ExtendableEvent {
    readonly clientId: string;
    readonly preloadResponse: Promise<any>;
    readonly replacesClientId: string;
    readonly request: Request;
    readonly resultingClientId: string;
    respondWith(r: Response | Promise<Response>): void;
}


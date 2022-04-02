import { URLPatternComponentResult, URLPatternResult } from "urlpattern-polyfill/dist/url-pattern.interfaces";
import { AppendOnlyList } from "./utils/append-only-list";
import { Awaitable,  } from "./utils/common-types";

export { pipe as combine } from 'ts-functional-pipe';

export type ResponseEffect = (r: Response) => Awaitable<Response>

export class EffectsList extends AppendOnlyList<ResponseEffect> {}

export interface Context { 
  request: Request, 

  /**
   * TODO
   */
  waitUntil: (f: any) => void,

  /** 
   * A list of effects/transforms applied to the `Response` after the application handler completes.
   * Middleware can add effects to the list. Application handlers should ignore it. 
   * @deprecated Prop might change name
   */
  effects?: AppendOnlyList<ResponseEffect>, 

  /**
   * The URL pattern match that caused this handler to run. See the URL Pattern API for more.
   */
  match?: URLPatternResult,

  /**
   * Only available if the router is used via `fetchEventListener`.
   * Many Worker Environments such as Deno an CF module workers don't provide fetch events. 
   */
  event?: FetchEvent

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
  return effects.reduceRight(async (response, effect) => effect(await response), response);
}

export * from './basics';
export * from './content-negotiation';
export * from './body';
export * from './cookies';
export * from './cors';
export * from './session';
export * from './caching';
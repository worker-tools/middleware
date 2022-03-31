import { URLPatternComponentResult, URLPatternResult } from "urlpattern-polyfill/dist/url-pattern.interfaces";
import { AppendOnlyList } from "./utils/append-only-list";
import { Awaitable,  } from "./utils/common-types";

export { pipe as combine } from 'ts-functional-pipe';

export type ResponseEffect = (r: Response) => Awaitable<Response>

export class EffectsList extends AppendOnlyList<ResponseEffect> {}

export interface Context { 
  request: Request, 

  /** 
   * A list of effects (transforms?) applied to the `Response` after the application handler completes.
   * Middleware can add effects to the list, but application handlers should ignore it. 
   * @deprecated Prop might change name
   */
  effects: AppendOnlyList<ResponseEffect>, 

  /**
   * The URL pattern match that caused this handler to run. See the URL Pattern API for more.
   */
  match?: URLPatternResult,

  /**
   * Only present if the worker environment supports it. Might be a noop in certain cases.
   */
  waitUntil?: (f: any) => void,

  /**
   * Only available if the router is used via `fetchEventCallback`.
   * Many Worker Environments such as Deno an CF module workers don't provide fetch events. 
   */
  event?: FetchEvent
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
export * from './cookies';
export * from './cors';
export * from './session';
export * from './caching';
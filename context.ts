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

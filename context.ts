import { AppendOnlyList } from "./utils/append-only-list.ts";
import { Awaitable } from "./utils/common-types.ts";

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

declare interface URLPatternInit {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  baseURL?: string;
}

declare interface URLPatternComponentResult {
  input: string;
  groups: Record<string, string>;
}

interface URLPatternResult {
  /** The inputs provided when matching. */
  inputs: [URLPatternInit] | [URLPatternInit, string];

  /** The matched result for the `protocol` matcher. */
  protocol: URLPatternComponentResult;
  /** The matched result for the `username` matcher. */
  username: URLPatternComponentResult;
  /** The matched result for the `password` matcher. */
  password: URLPatternComponentResult;
  /** The matched result for the `hostname` matcher. */
  hostname: URLPatternComponentResult;
  /** The matched result for the `port` matcher. */
  port: URLPatternComponentResult;
  /** The matched result for the `pathname` matcher. */
  pathname: URLPatternComponentResult;
  /** The matched result for the `search` matcher. */
  search: URLPatternComponentResult;
  /** The matched result for the `hash` matcher. */
  hash: URLPatternComponentResult;
}

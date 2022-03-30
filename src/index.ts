import { URLPatternComponentResult } from "urlpattern-polyfill/dist/url-pattern.interfaces";
import { AppendOnlyList } from "./utils/append-only-list";
import { Awaitable,  } from "./utils/common-types";

export { pipe as combine } from 'ts-functional-pipe';

export interface Context { 
  request: Request, 

  /** 
   * A list of effects (transforms?) applied to the `Response` after the application handler completes.
   * Middleware can add effects to the list, but application handlers should ignore it. 
   * @deprecated Prop might change name
   */
  effects: AppendOnlyList<ResponseEffect>, 

  /**
   * The matched pathname
   */
  match?: URLPatternComponentResult,

  /**
   * TODO
   */
  waitUntil?: (f: any) => void,
}

export type ResponseEffect = (r: Response) => Awaitable<Response>
export class EffectsList extends AppendOnlyList<ResponseEffect> {}

/**
 * @deprecated Function might change names
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
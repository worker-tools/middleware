export { pipe as combine } from 'https://cdn.skypack.dev/ts-functional-pipe@3.1.2?dts';
import { ResolvablePromise } from 'https://ghuc.cc/worker-tools/resolvable-promise/index.ts'
import type { Awaitable } from "./utils/common-types.ts";
import type { Context } from "./index.ts";

class FlushCallbackStream<T> extends TransformStream<T, T> { 
  constructor(flushCallback: () => void) { 
    super({ flush() { flushCallback() } }) 
  } 
}

export interface FlushedContext {
  /** 
   * A promise that resolves when the entire response body has been written to the wire, 
   * or if the stream has been closed for any other reason.
   * Most likely useful when combined with streaming responses.
   */
  flushed: Promise<Response>
}

export const flushed = () => async <X extends Context>(ax: Awaitable<X>): Promise<X & FlushedContext> => {
  const x = await ax;
  const flush = new ResolvablePromise<Response>()
  const flushed = Promise.resolve(flush)
  x.effects.push(res => {
    const ref: { res?: Response } = {}
    const cb = () => flush.resolve(ref.res!)
    const { status, statusText, headers, body } = res;
    ref.res = new Response(body != null
      ? body.pipeThrough(new FlushCallbackStream(cb)) 
      : (x.handled.then(cb), null), { status, statusText, headers }) 
    return ref.res;
  })
  return Object.assign(x, { flushed })
}
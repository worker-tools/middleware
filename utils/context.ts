import { ResolvablePromise } from 'https://ghuc.cc/worker-tools/resolvable-promise/index.ts'

class ClosedStream<T> extends TransformStream<T, T> { 
  constructor(close: ResolvablePromise<void>) { 
    super({ flush() { close.resolve() } }) 
  } 
}

/** @deprecated Do not use */
export const closedResponse = (close: ResolvablePromise<void>, res: Response) => {
  return new Response(res.body != null
    ? res.body.pipeThrough(new ClosedStream(close)) 
    : (() => (close.resolve(), null))(), res) // if body is null for some reason, ensure that the promise isn't dangling
}

/** @deprecated Do not use */
export const providePromises = () => {
  const [handle, close] = [new ResolvablePromise<Response>(), new ResolvablePromise<void>()]
  const [handled, closed] = [Promise.resolve(handle), Promise.resolve(close)]
  return [{ handled, closed }, { handle, close }] as const
}

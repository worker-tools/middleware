import { AggregateError } from "./aggregate-error";

export const isFulfilled = <T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> => {
  return r.status === 'fulfilled';
}
export const isRejected = <T>(r: PromiseSettledResult<T>): r is PromiseRejectedResult => {
  return r.status === 'rejected';
}

/**
 * Helper function that unwinds `Promise.allSettled`: 
 * Takes the promise returned and throws a `CombinedError` iff at least one promise settled with a rejection. 
 * Otherwise returns the list of fulfilled values.
 * @param allSettledPromise A promise returned by `Promise.allSettled`
 * @returns List of fulfilled values
 */
export const unsettle = async <T>(allSettledPromise: Promise<PromiseSettledResult<T>[]>): Promise<T[]> => {
  const rs = await allSettledPromise;
  if (rs.every(isFulfilled)) return rs.map(r => r.value)
  throw new AggregateError(rs.filter(isRejected).map(r => r.reason), "One or more Promises in 'unsettle' were rejected"); 
}

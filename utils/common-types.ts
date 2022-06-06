export type Repeatable<T> = T | T[];
export type Awaitable<T> = T | PromiseLike<T>;
export type Callable<T> = T | (() => T);
export type Primitive = null | undefined | boolean | number | string | bigint | symbol;
export type ToString = { toString(...args: any[]): string }

export type TypedEventListener<E extends Event> = (evt: E) => void | Promise<void>;
export type TypedEventListenerObject<E extends Event> = { handleEvent(evt: E): void | Promise<void>; }
export type TypedEventListenerOrEventListenerObject<E extends Event> = TypedEventListener<E> | TypedEventListenerObject<E>;

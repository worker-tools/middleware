// deno-lint-ignore-file
import { 
  CookieStore, CookieListItem, CookieInit, CookieList, CookieStoreDeleteOptions, CookieStoreGetOptions
} from "https://ghuc.cc/worker-tools/request-cookie-store/index.ts";
import { ExtendablePromise } from "https://ghuc.cc/worker-tools/extendable-promise/index.ts";
import { Cookies, cookiesFrom } from "../cookies.ts";

const encode = encodeURIComponent;
function decodeItem<Item extends CookieListItem | null>(item: Item) {
  if (item) {
    item.name = decodeURIComponent(item.name);
    item.value = decodeURIComponent(item.value);
  }
  return item;
}

/**
 * A more opinionated cookie store implementation that 
 * - URI-(en|de)codes cookie values and 
 * - provides a promise that resolves when all async operations associated with this store have settled.
 */
export class MiddlewareCookieStore implements CookieStore {
  #promise: ExtendablePromise<void>;
  #store: CookieStore;
  constructor(store: CookieStore, requestDuration: Promise<void>) {
    this.#store = store;
    this.#promise = new ExtendablePromise<void>(requestDuration);
  }
  get(name?: string): Promise<CookieListItem | null>;
  get(options?: CookieStoreGetOptions): Promise<CookieListItem | null>;
  async get(options?: any): Promise<CookieListItem | null> {
    return decodeItem(await this.#store.get(options));
  }
  getAll(name?: string): Promise<CookieList>;
  getAll(options?: CookieStoreGetOptions): Promise<CookieList>;
  async getAll(options?: any): Promise<CookieList> {
    return (await this.#store.getAll(options)).map(decodeItem);
  }
  set(name: string, value: string): Promise<void>;
  set(options: CookieInit): Promise<void>;
  set(name: string | CookieInit, value?: string): Promise<void> {
    let res: Promise<void>;
    if (typeof name === 'string' && typeof value === 'string') {
      res = this.#store.set(encode(name), encode(value));
    } else if (name && typeof name === 'object') {
      const options = name;
      options.name = encode(options.name)
      options.value = encode(options.value)
      res = this.#store.set(options);
    } else throw Error('Illegal invocation');
    this.#promise.waitUntil(res);
    return res;
  }
  delete(name: string): Promise<void>;
  delete(options: CookieStoreDeleteOptions): Promise<void>;
  delete(options: any): Promise<void> {
    const res = this.#store.delete(options)
    this.#promise.waitUntil(res);
    return res;
  }

  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: any, callback: any, options?: any): void {
    this.#store.addEventListener(type, callback, options);
  }
  dispatchEvent(event: Event): boolean;
  dispatchEvent(event: any): boolean {
    return this.#store.dispatchEvent(event);
  }
  removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: any, callback: any, options?: any): void {
    this.#store.removeEventListener(type, callback, options);
  }

  /** @deprecated Name of this property might change */
  get settled() { return this.#promise.settled }
  /** @deprecated Name of this property might change */
  get allSettledPromise() { return Promise.resolve(this.#promise) }

  /**
   * If you've made changes to the store and would like to access the current cookies as an object, 
   * it is provided as a promise here (TODO:)
   * @deprecated This method might change names
   */
  get updatedCookies(): Promise<Cookies> {
    return cookiesFrom(this)
  }
}

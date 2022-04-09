import { CookieStore, RequestCookieStore } from "https://ghuc.cc/worker-tools/request-cookie-store/index.ts";
import { SignedCookieStore, DeriveOptions } from "https://ghuc.cc/worker-tools/signed-cookie-store/index.ts";
import { EncryptedCookieStore } from "https://ghuc.cc/worker-tools/encrypted-cookie-store/index.ts";
import { ResolvablePromise } from 'https://ghuc.cc/worker-tools/resolvable-promise/index.ts';
import { forbidden } from "https://ghuc.cc/worker-tools/response-creators/index.ts";

import { Awaitable } from "./utils/common-types.ts";
import { MiddlewareCookieStore } from "./utils/middleware-cookie-store.ts";
import { headersSetCookieFix } from './utils/headers-set-cookie-fix.ts'
import { unsettle } from "./utils/unsettle.ts";
import { Context } from "./index.ts";

export async function cookiesFrom(cookieStore: CookieStore): Promise<Cookies> {
  return Object.fromEntries((await cookieStore.getAll()).map(({ name, value }) => [name, value]));
}

/**
 * An object of the cookies sent with this request.
 * It is for reading convenience only.
 * To make changes, use the associated cookie store instead (provided by the middleware along with this object)
 */
export type Cookies = { readonly [key: string]: string };

interface AnyCookiesContext {
  cookieStore: CookieStore, 
  cookies: Cookies, 
}
export interface UnsignedCookiesContext extends AnyCookiesContext { 
  unsignedCookieStore: CookieStore, 
  unsignedCookies: Cookies 
}
export interface SignedCookiesContext extends AnyCookiesContext { 
  signedCookieStore: CookieStore, 
  signedCookies: Cookies,
  error?: { kind: 'forbidden' }
}
export interface EncryptedCookiesContext extends AnyCookiesContext { 
  encryptedCookieStore: CookieStore, 
  encryptedCookies: Cookies,
  error?: { kind: 'forbidden' }
}

export interface CookiesOptions extends DeriveOptions {
  keyring?: readonly CryptoKey[];
};

export const unsignedCookies = () => async <X extends Context>(ax: Awaitable<X>): Promise<X & UnsignedCookiesContext> => {
  const x = await ax;
  const cookieStore = new RequestCookieStore(x.request);
  const requestDuration = new ResolvablePromise<void>();
  const unsignedCookieStore = new MiddlewareCookieStore(cookieStore, requestDuration)
  const unsignedCookies = await cookiesFrom(unsignedCookieStore);
  const nx = Object.assign(x, { 
    cookieStore: unsignedCookieStore, 
    cookies: unsignedCookies, 
    unsignedCookieStore, 
    unsignedCookies, 
  })
  x.effects.push(response => {
    requestDuration.resolve();
    response.headers.append('VARY', 'Cookie')
    return new Response(response.body, {
      ...response,
      headers: [
        ...headersSetCookieFix(response.headers),
        ...cookieStore.headers,
      ],
    });
  })
  return nx;
}

export const signedCookies = (opts: CookiesOptions) => {
  // TODO: options to provide own cryptokey??
  // TODO: What if secret isn't known at initialization (e.g. Cloudflare Workers)
  if (!opts.secret) throw TypeError('Secret missing');

  const keyPromise = SignedCookieStore.deriveCryptoKey(opts);

  return async <X extends Context>(ax: Awaitable<X>): Promise<X & SignedCookiesContext> => {
    const x = await ax;
    const request = x.request;
    const cookieStore = new RequestCookieStore(request);
    const requestDuration = new ResolvablePromise<void>();
    const signedCookieStore = new MiddlewareCookieStore(new SignedCookieStore(cookieStore, await keyPromise, {
      keyring: opts.keyring
    }), requestDuration);

    let signedCookies: Cookies;
    try {
      signedCookies = await cookiesFrom(signedCookieStore);
    } catch {
      throw forbidden();
    }

    const nx = Object.assign(x, {
      cookieStore: signedCookieStore,
      cookies: signedCookies,
      signedCookieStore,
      signedCookies,
    })

    x.effects.push(async response => {
      // Wait for all set cookie promises to settle
      requestDuration.resolve();
      await unsettle(signedCookieStore.allSettledPromise);

      response.headers.append('VARY', 'Cookie')

      return new Response(response.body, {
        ...response,
        headers: [
          ...headersSetCookieFix(response.headers),
          ...cookieStore.headers,
        ],
      })
    })

    return nx;
  };
}

export const encryptedCookies = (opts: CookiesOptions) => {
  // TODO: options to provide own cryptokey??
  // TODO: What if secret isn't known at initialization (e.g. Cloudflare Workers)
  if (!opts.secret) throw TypeError('Secret missing');

  const keyPromise = EncryptedCookieStore.deriveCryptoKey(opts);

  return async <X extends Context>(ax: Awaitable<X>): Promise<X & EncryptedCookiesContext> => {
    const x = await ax;
    const request = x.request;
    const cookieStore = new RequestCookieStore(request);
    const requestDuration = new ResolvablePromise<void>();
    const encryptedCookieStore = new MiddlewareCookieStore(new EncryptedCookieStore(cookieStore, await keyPromise, {
      keyring: opts.keyring
    }), requestDuration);

    let encryptedCookies: Cookies;
    try {
      encryptedCookies = await cookiesFrom(encryptedCookieStore);
    } catch {
      throw forbidden();
    }

    const nx = Object.assign(x, {
      cookieStore: encryptedCookieStore,
      cookies: encryptedCookies,
      encryptedCookieStore,
      encryptedCookies,
    })

    x.effects.push(async response => {
      // Wait for all set cookie promises to settle
      requestDuration.resolve();
      await unsettle(encryptedCookieStore.allSettledPromise);

      response.headers.append('VARY', 'Cookie')

      return new Response(response.body, {
        ...response,
        headers: [
          ...headersSetCookieFix(response.headers),
          ...cookieStore.headers,
        ],
      })
    })

    return nx;
  };
}
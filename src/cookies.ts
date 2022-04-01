import { CookieStore, RequestCookieStore } from "@worker-tools/request-cookie-store";
import { SignedCookieStore, DeriveOptions } from "@worker-tools/signed-cookie-store";
import { EncryptedCookieStore } from "@worker-tools/encrypted-cookie-store";
import { ResolvablePromise } from '@worker-tools/resolvable-promise';
import { forbidden } from "@worker-tools/response-creators";

import { Awaitable } from "./utils/common-types";
import { MiddlewareCookieStore } from "./utils/middleware-cookie-store";
import { headersSetCookieFix } from './utils/headers-set-cookie-fix'
import { unsettle } from "./utils/unsettle";

import { Context } from "./index";

export async function cookiesFrom(cookieStore: CookieStore): Promise<Cookies> {
  return Object.fromEntries((await cookieStore.getAll()).map(({ name, value }) => [name, value]));
}

/**
 * An object of the cookies sent with this request.
 * It is for reading convenience only.
 * To make changes, use the associated cookie store instead (provided by the middleware along with this object)
 */
export type Cookies = { readonly [key: string]: string };

interface withUnsignedCookies {
  cookieStore: CookieStore, 
  cookies: Cookies, 
}
export interface UnsignedCookiesContext extends withUnsignedCookies { 
  unsignedCookieStore: CookieStore, 
  unsignedCookies: Cookies 
};
export interface SignedCookiesContext extends withUnsignedCookies { 
  signedCookieStore: CookieStore, 
  signedCookies: Cookies,
};
export interface EncryptedCookiesContext extends withUnsignedCookies { 
  encryptedCookieStore: CookieStore, 
  encryptedCookies: Cookies,
};

export interface CookiesOptions extends DeriveOptions {
  keyring?: readonly CryptoKey[];
};

export const withUnsignedCookies = () => async <X extends Context>(ax: Awaitable<X>): Promise<X & UnsignedCookiesContext> => {
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
  x.effects!.push(response => {
    const { status, statusText, body, headers } = response;
    requestDuration.resolve();
    return new Response(body, {
      status,
      statusText,
      headers: [
        ...headersSetCookieFix(headers),
        ...cookieStore.headers,
      ],
    });
  })
  return nx;
}

export const withSignedCookies = (opts: CookiesOptions) => {
  // TODO: options to provide own cryptokey??
  // TODO: What if secret isn't known at initialization (e.g. Cloudflare Workers)
  if (!opts.secret) throw Error('Secret missing');

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

    x.effects!.push(async response => {
      // Wait for all set cookie promises to settle
      requestDuration.resolve();
      await unsettle(signedCookieStore.allSettledPromise);

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

export const withEncryptedCookies = (opts: CookiesOptions) => {
  // TODO: options to provide own cryptokey??
  // TODO: What if secret isn't known at initialization (e.g. Cloudflare Workers)
  if (!opts.secret) throw Error('Secret missing');

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

    x.effects!.push(async response => {
      // Wait for all set cookie promises to settle
      requestDuration.resolve();
      await unsettle(encryptedCookieStore.allSettledPromise);

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
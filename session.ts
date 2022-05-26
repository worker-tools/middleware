// deno-lint-ignore-file no-explicit-any
import type { StorageArea } from 'https://ghuc.cc/qwtel/kv-storage-interface/index.d.ts';
import { UUID } from 'https://ghuc.cc/qwtel/uuid-class/index.ts';
import { Base64Decoder, Base64Encoder } from 'https://ghuc.cc/qwtel/base64-encoding/index.ts';

import { Encoder as BinaryEncoder, Decoder as BinaryDecoder } from 'https://cdn.skypack.dev/msgpackr@1.5.5?dts';

import type { Context, UnsignedCookiesContext, SignedCookiesContext } from './index.ts';
import type { Awaitable } from './utils/common-types.ts';
import type { EncryptedCookiesContext } from './cookies.ts';

const shortenId = (x: Uint8Array) => new Base64Encoder().encode(x);
const parseUUID = (x?: string | null) => x != null ? new UUID(new Base64Decoder().decode(x)) : null

type Rec = Record<PropertyKey, any>;
type CookieContext = Context & (EncryptedCookiesContext | SignedCookiesContext | UnsignedCookiesContext);

interface SessionContext<S extends Rec = Rec> { 
  session: S 
}
export interface CookieSessionContext<S extends Rec = Rec> extends SessionContext<S> {
  cookieSession: S
}
export interface StorageSessionContext<S extends Rec = Rec> extends SessionContext<S> {
  storageSession: S
}

export interface CookieSessionOptions<S extends Rec = Rec> {
  /** The name of the session cookie. Defaults to `sid`. */
  cookieName?: string,

  /** Session expiration time in seconds. Defaults to five minutes. */
  expirationTtl?: number,

  /** TODO */
  defaultSession?: S,
}

export interface StorageSessionOptions<S extends Rec = Rec> extends CookieSessionOptions<S> {
  /** The storage area where to persist the session objects. */
  storage: StorageArea,
}

/**
 * Cookie session middleware for worker runtimes. 
 * 
 * Requires a cookie store, preferably encrypted or signed.
 * 
 * Important: This will serialize the entire session data and store it in a cookie. It is sent with every request!
 * Only applicable for small session objects. Use `withStorageSession` for a traditional, KV store-backed session.
 */
export function cookieSession<S extends Rec = Rec>(
  { defaultSession = {}, cookieName = 'session', expirationTtl = 5 * 60 }: CookieSessionOptions = {}
): <X extends CookieContext>(ax: Awaitable<X>) => Promise<X & CookieSessionContext<S>> {
  return async ax => {
    const ctx = await ax;
    const { cookieStore, cookies } = ctx;
    // const { encryptedCookies, encryptedCookieStore } = ctx as EncryptedCookiesContext;
    // const { signedCookies, signedCookieStore } = ctx as SignedCookiesContext;
    // const { unsignedCookies, unsignedCookieStore } = ctx as UnsignedCookiesContext;
    // const cookieStore = encryptedCookieStore ?? signedCookieStore ?? unsignedCookieStore;
    // const cookies = encryptedCookies ?? signedCookies ?? unsignedCookies;

    const controller = new AbortController();

    const [, cookieSession, flags] = await getCookieSessionProxy<S>(cookies[cookieName], ctx, {
      cookieName,
      expirationTtl,
      defaultSession,
      signal: controller.signal,
    });

    const newContext =  Object.assign(ctx, { session: cookieSession, cookieSession })

    ctx.effects.push(response => {
      // Indicate that cookie session can no longer be modified.
      controller.abort();

      if (flags.dirty) {
        cookieStore.set({
          name: cookieName,
          value: stringifySessionCookie(cookieSession),
          expires: new Date(Date.now() + expirationTtl * 1000),
          sameSite: 'lax',
          httpOnly: true,
        });
      }

      return response;
    })

    return newContext;
  };
}

/**
 * Session middleware for worker runtimes.
 * 
 * Need to provide a `StorageArea` to persist the session between requests. 
 * See `@worker-tools/kv-storage`.
 * 
 */
// FIXME: Will "block" until session object is retrieved from KV => provide "unyielding" version that returns a promise?
export function storageSession<S extends Rec = Rec>(
  options: StorageSessionOptions
): <X extends CookieContext>(ax: Awaitable<X>) => Promise<X & StorageSessionContext<S>> {
    return async ax => {
      const ctx = await ax;
      const { cookies, cookieStore } = ctx;
      const { storage, defaultSession = {}, cookieName = 'sid', expirationTtl = 5 * 60 } = options

      const [id, session, flag] = await getStorageSessionProxy<S>(cookies[cookieName], {
        storage,
        cookieName,
        expirationTtl,
        defaultSession,
      });

      const newContext = Object.assign(ctx, { session, storageSession: session })

      ctx.effects.push(response => {
        if (!cookies[cookieName]) {
          // no await necessary
          cookieStore.set({
            name: cookieName,
            value: shortenId(id),
            expires: new Date(Date.now() + expirationTtl * 1000),
            sameSite: 'lax',
            httpOnly: true,
          });
        }

        if (flag.dirty) {
          ctx.waitUntil((async () => {
            await ctx.handled
            await storage.set(id, session, { expirationTtl });
          })())
        }

        return response;
      })

      return newContext;
    };
  }

const stringifySessionCookie = <T>(value: T) => 
  new Base64Encoder({ url: true }).encode(new BinaryEncoder({ structuredClone: true }).encode(value));

const parseSessionCookie = <T>(value: string) => 
  <T>new BinaryDecoder({ structuredClone: true }).decode(new Base64Decoder().decode(value));

function getCookieSessionProxy<S extends Rec = Rec>(
  cookieVal: string | null | undefined,
  _ctx: { waitUntil?: (f: any) => void },
  { defaultSession, signal }: CookieSessionOptions & { signal: AbortSignal },
): Promise<[null, S, { dirty: boolean }]> {
  const obj = (cookieVal && parseSessionCookie<S>(cookieVal)) || defaultSession;

  const flags = { dirty: false };

  return Promise.resolve([null, new Proxy(<any>obj, {
    set(target, prop, value) {
      if (signal.aborted)
        throw Error('Headers already sent, cookie session can no longer be modified. Use storage session instead to remove this limitation.');
      flags.dirty = true;
      target[prop] = value;
      return true;
    },

    deleteProperty(target, prop) {
      if (signal.aborted)
        throw Error('Headers already sent, cookie session can no longer be modified. Use storage session instead to remove this limitation.');
      flags.dirty = true;
      delete target[prop];
      return true;
    },
  }), flags]);
}

async function getStorageSessionProxy<S extends Rec = Rec>(
  cookieVal: string | null | undefined,
  { storage, defaultSession }: Required<StorageSessionOptions<S>>,
): Promise<[UUID, S, { dirty: boolean }]> {
  const sessionId = parseUUID(cookieVal) ?? new UUID();
  const obj = (await storage.get<S>(sessionId)) ?? defaultSession;

  const flags = { dirty: false };

  return [sessionId, new Proxy(<any>obj, {
    set(target, prop, value) {
      flags.dirty = true;
      target[prop] = value;
      return true;
    },
    deleteProperty(target, prop) {
      flags.dirty = true;
      delete target[prop];
      return true;
    },
  }), flags];
}

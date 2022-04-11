// deno-lint-ignore-file no-explicit-any
import type { StorageArea } from 'https://ghuc.cc/qwtel/kv-storage-interface/index.d.ts';
import { UUID } from 'https://ghuc.cc/qwtel/uuid-class/index.ts';
import { Base64Decoder, Base64Encoder } from 'https://ghuc.cc/qwtel/base64-encoding/index.ts';

import { Encoder as BinaryEncoder, Decoder as BinaryDecoder } from 'https://cdn.skypack.dev/msgpackr@1.5.5';
// import { Encoder as BinaryEncoder, Decoder as BinaryDecoder } from 'cbor-x';

import type { Context, UnsignedCookiesContext, SignedCookiesContext } from './index.ts';
import type { Awaitable } from './utils/common-types.ts';
import type { EncryptedCookiesContext } from './cookies.ts';

const shortenId = (x: Uint8Array) => new Base64Encoder().encode(x);
const parseUUID = (x?: string | null) => x != null ? new UUID(new Base64Decoder().decode(x)) : null

type AnyRecord = Record<PropertyKey, any>;

export type AnyCookieContext = Context & (EncryptedCookiesContext | SignedCookiesContext | UnsignedCookiesContext);

interface SessionContext<S extends AnyRecord = AnyRecord> { 
  session: S 
}
export interface CookieSessionContext<S extends AnyRecord = AnyRecord> extends SessionContext<S> {
  cookieSession: S
}
export interface StorageSessionContext<S extends AnyRecord = AnyRecord> extends SessionContext<S> {
  storageSession: S
}

export interface CookieSessionOptions<S extends AnyRecord = AnyRecord> {
  /** The name of the session cookie. Defaults to `sid`. */
  cookieName?: string,

  /** Session expiration time in seconds. Defaults to five minutes. */
  expirationTtl?: number,

  /** TODO */
  defaultSession?: S,
}

export interface StorageSessionOptions<S extends AnyRecord = AnyRecord> extends CookieSessionOptions<S> {
  /** The storage area where to persist the session objects. */
  storage: StorageArea,
}

/**
 * Cookie session middleware for worker environments. 
 * 
 * Requires a cookie store, preferably encrypted or signed.
 * 
 * Important: This will serialize the entire session data and store it in a cookie. It is sent with every request!
 * Only applicable for small session objects. Use `withStorageSession` for a traditional, KV store-backed session.
 */
export function withCookieSession<S extends AnyRecord = AnyRecord>(
  { defaultSession = {}, cookieName = 'session', expirationTtl = 5 * 60 }: CookieSessionOptions = {}
): <X extends AnyCookieContext>(ax: Awaitable<X>) => Promise<X & CookieSessionContext> {
  return async ax => {
    const ctx = await ax;
    const { encryptedCookies, encryptedCookieStore } = ctx as EncryptedCookiesContext;
    const { signedCookies, signedCookieStore } = ctx as SignedCookiesContext;
    const { unsignedCookies, unsignedCookieStore } = ctx as UnsignedCookiesContext;

    // TODO: make preference configurable?
    const cookieStore = encryptedCookieStore ?? signedCookieStore ?? unsignedCookieStore;
    const cookies = encryptedCookies ?? signedCookies ?? unsignedCookies;

    const controller = new AbortController();

    const [, session, flag] = await getCookieSessionProxy<S>(cookies[cookieName], ctx, {
      cookieName,
      expirationTtl,
      defaultSession,
      signal: controller.signal,
    });

    const newContext =  Object.assign(ctx, { session, cookieSession: session })

    ctx.effects.push(response => {
      // Indicate that cookie session can no longer be modified.
      controller.abort();

      // no await necessary
      if (flag.dirty) cookieStore.set({
        name: cookieName,
        value: stringifySessionCookie(session),
        expires: new Date(Date.now() + expirationTtl * 1000),
        sameSite: 'lax',
        httpOnly: true,
      });

      return response;
    })

    return newContext;
  };
}

/**
 * Session middleware for worker environments.
 * 
 * Need to provide a `StorageArea` to persist the session between requests. 
 * There are implementations for both browsers (IndexedDB-backed) and Cloudflare Workers (KV storage backed) available.
 * 
 */
// FIXME: Will "block" until session object is retrieved from KV => provide "unyielding" version that returns a promise?
export function withStorageSession<S extends AnyRecord = AnyRecord>(
  { storage, defaultSession = {}, cookieName = 'sid', expirationTtl = 5 * 60 }: StorageSessionOptions
): <X extends AnyCookieContext>(ax: Awaitable<X>) => Promise<X & StorageSessionContext> {
    return async ax => {
      const ctx = await ax;
      const { encryptedCookies, encryptedCookieStore } = ctx as EncryptedCookiesContext;
      const { cookies: signedCookies, cookieStore: signedCookieStore } = ctx as SignedCookiesContext;
      const { unsignedCookies, unsignedCookieStore } = ctx as UnsignedCookiesContext;
      const cookieStore = encryptedCookieStore || signedCookieStore || unsignedCookieStore;
      const cookies = encryptedCookies || signedCookies || unsignedCookies;

      const [id, session, flag] = await getStorageSessionProxy<S>(cookies[cookieName], ctx, {
        storage,
        cookieName,
        expirationTtl,
        defaultSession,
      });

      const newContext = Object.assign(ctx, { session, storageSession: session })

      ctx.effects.push(response => {
        // no await necessary
        if (!cookies[cookieName]) cookieStore.set({
          name: cookieName,
          value: shortenId(id),
          expires: new Date(Date.now() + expirationTtl * 1000),
          sameSite: 'lax',
          httpOnly: true,
        });

        // if (flag.dirty) {
        //   event.waitUntil((async () => {
        //     await storage.set(id, session, { expirationTtl });
        //   })())
        // }

        return response;
      })

      return newContext;
    };
  }

// TODO: make configurable
// const stringifySessionCookie = <T>(value: T) => new Base64Encoder({ url: true }).encode(new CBOREncoder({ structuredClone: true }).encode(value));
// const parseSessionCookie = <T>(value: string) => <T>new CBORDecoder({ structuredClone: true }).decode(new Base64Decoder().decode(value));
const stringifySessionCookie = <T>(value: T) => 
  new Base64Encoder({ url: true }).encode(new BinaryEncoder({ structuredClone: true }).encode(value));

const parseSessionCookie = <T>(value: string) => 
  <T>new BinaryDecoder({ structuredClone: true }).decode(new Base64Decoder().decode(value));

function getCookieSessionProxy<S extends AnyRecord = AnyRecord>(
  cookieVal: string | null | undefined,
  _ctx: { waitUntil?: (f: any) => void },
  { defaultSession, signal }: CookieSessionOptions & { signal: AbortSignal },
): Promise<[null, S, { dirty: boolean }]> {
  const obj = (cookieVal && parseSessionCookie<S>(cookieVal)) || defaultSession;

  const flag = { dirty: false };

  return Promise.resolve([null, new Proxy(<any>obj, {
    set(target, prop, value) {
      if (signal.aborted)
        throw Error('Headers already sent, session can no longer be modified!');
      flag.dirty = true;
      target[prop] = value;
      return true;
    },

    deleteProperty(target, prop) {
      if (signal.aborted)
        throw Error('Headers already sent, session can no longer be modified!');
      flag.dirty = true;
      delete target[prop];
      return true;
    },
  }), flag]);
}

async function getStorageSessionProxy<S extends AnyRecord = AnyRecord>(
  cookieVal: string | null | undefined,
  ctx: { waitUntil?: (f: any) => void },
  { storage, expirationTtl, defaultSession }: Required<StorageSessionOptions<S>>,
): Promise<[UUID, S, { dirty: boolean }]> {
  const sessionId = parseUUID(cookieVal) ?? new UUID();
  const obj = (await storage.get<S>(sessionId)) ?? defaultSession;

  const flag = { dirty: false };

  // HACK: Batch calls within the same micro task
  // TODO: Do once at the end of the handler instead. 
  // Writing to KV Storage is a HTTP request, can't have too many of those in CF workers...
  let nr = 0;
  const persist = () => {
    const capturedNr = ++nr;
    ctx.waitUntil?.((async () => {
      await new Promise(r => setTimeout(r)); // await end of microtask
      if (capturedNr === nr) { // no other invocations since
        await storage.set(sessionId, obj, { expirationTtl });
      }
    })());
  }

  return [sessionId, new Proxy(<any>obj, {
    set(target, prop, value) {
      // flag.dirty = true;
      persist();
      target[prop] = value;
      return true;
    },

    deleteProperty(target, prop) {
      // flag.dirty = true;
      persist();
      delete target[prop];
      return true;
    },
  }), flag];
}

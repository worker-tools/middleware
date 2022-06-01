// deno-lint-ignore-file no-explicit-any
import type { StorageArea } from 'https://ghuc.cc/qwtel/kv-storage-interface/index.d.ts';
import { WebUUID } from 'https://ghuc.cc/qwtel/web-uuid/index.ts';
import { Base64Decoder, Base64Encoder } from 'https://ghuc.cc/qwtel/base64-encoding/index.ts';

import { createDraft, finishDraft, enableMapSet } from 'https://cdn.skypack.dev/immer@9.0.14?dts';
import { Encoder as BinaryEncoder, Decoder as BinaryDecoder } from 'https://cdn.skypack.dev/msgpackr@1.5.5?dts';

import type { Context } from './context.ts';
import type { Awaitable } from './utils/common-types.ts';
import type { UnsignedCookiesContext, SignedCookiesContext, EncryptedCookiesContext } from './cookies.ts';
import type { FlushedContext } from './flushed.ts';

enableMapSet();

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

  /** Provide a record that serves as the default session object. Also used for type inference. */
  defaultSession?: S,
}

export interface StorageSessionOptions<S extends Rec = Rec> extends CookieSessionOptions<S> {
  /** The storage area where to persist the session objects. */
  storage: StorageArea,
}

const stringifySessionCookie = <T>(value: T) => 
  new Base64Encoder({ url: true }).encode(new BinaryEncoder({ structuredClone: true }).encode(value));

const parseSessionCookie = <T>(value: string) => 
  <T>new BinaryDecoder({ structuredClone: true }).decode(new Base64Decoder().decode(value));

/**
 * Cookie session middleware for worker runtimes. 
 * 
 * Requires a cookie store, preferably encrypted or signed.
 * 
 * Important: This will serialize the entire session data and store it in a cookie. It is sent with every request!
 * Only applicable for small session objects. Use `storageSession` for a traditional, KV store-backed session.
 */
export function cookieSession<S extends Rec = Rec>(
  options: CookieSessionOptions<S> = {}
): <X extends CookieContext>(ax: Awaitable<X>) => Promise<X & CookieSessionContext<S>> {
  return async ax => {
    const ctx = await ax;
    const { cookieStore, cookies } = ctx;
    const { defaultSession, cookieName = 'obj', expirationTtl = 5 * 60 } = options

    const cookieVal = cookies[cookieName]
    const original = cookieVal ? parseSessionCookie<S>(cookieVal) : defaultSession ?? <S>{};
    const session = createDraft(original)

    const newContext =  Object.assign(ctx, { session, cookieSession: session })

    ctx.effects.push(() => {
      const next: S = finishDraft(session)
      if (next !== original) {
        cookieStore.set({
          name: cookieName,
          value: stringifySessionCookie(next),
          expires: new Date(Date.now() + expirationTtl * 1000),
          sameSite: 'lax',
          httpOnly: true,
        });
      }
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
  options: StorageSessionOptions<S>
): <X extends CookieContext & Partial<FlushedContext>>(ax: Awaitable<X>) => Promise<X & StorageSessionContext<S>> {
    return async ax => {
      const ctx = await ax;
      const { cookies, cookieStore } = ctx;
      const { storage, defaultSession, cookieName = 'sid', expirationTtl = 5 * 60 } = options

      const cookieVal = cookies[cookieName]
      const sid = cookieVal ? new WebUUID(cookieVal) : WebUUID.v4()
      const original = (await storage.get<S>(sid)) ?? defaultSession ?? <S>{};
      const session = createDraft(original)

      const newContext = Object.assign(ctx, { session, storageSession: session })

      ctx.waitUntil((async () => {
        await ctx.handled;
        await ctx.flushed;
        const next: S = finishDraft(session)
        if (next !== original) {
          await storage.set(sid, next, { expirationTtl });
        }
      })())

      if (!cookieVal) {
        ctx.effects.push(() => {
          cookieStore.set({
            name: cookieName,
            value: sid.id,
            expires: new Date(Date.now() + expirationTtl * 1000),
            sameSite: 'lax',
            httpOnly: true,
          });
        });
      }

      return newContext;
    };
  }

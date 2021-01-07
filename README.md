# @werker/middleware

Placeholder for a future middleware solutions that work in worker environments such as Cloudflare Workers.

In the meantime, here is a TypeScript-safe pattern you can use.

```ts
// Handlers can be sync or async functions. This type helps:
export type Awaitable<T> = T | Promise<T>;

// Only requirement for users is that they provde an object with an `event` field
export type BaseArg = { event: FetchEvent };

// Our example middleware will add a `cookieStore` field to the argument.
export type CookiesArgs = { cookieStore: CookieStore };
export type CookiesHandler<A extends BaseArg> = (args: A & CookiesArgs) => Awaitable<Response>;

export interface CookiesOptions { /* user-provided options for middleware */}
```

This is the actual middleware: A function that wraps the original request handler.

```ts
export const cookiesMiddleware = (opts: CookiesOptions = {}) => 
  <A extends BaseArg>(handler: CookiesHandler<A>) => 
    async (args: A) => {
      // Do work before
      const cookieStore = new RequestCookieStore(args.event.request);
      
      // Invoke user handler (with augemented args)
      const response = await handler({ ...args, cookieStore });
      
      // Do work after
      const { body, status, statusText, headers } = response;
      return new Response(body, { 
        status, statusText, headers: [...headers, ...cookieStore.headers],
      });
    };
```

## Usage
What's good about this pattern is that all the weird type-foo goes into the middleware itself. Users, for the most part, needn't
concern themselves with types. Their editor just "magicially" picks up the correct types for `event`  and `cookieStore`. 


```ts
self.addEventListener('fetch', event => event.respondWith(handleEvent({ event })))

const handleEvent = cookiesMiddleware(/* no opts */)(async ({ event, cookieStore }) => {
  await cookieStore.set('hello', 'Hello World!');
  return new Response((await cookieStore.get('hello'))?.value ?? 'Reload page!');
});
```

Because the middleware is written in a defensive way (`<A extends BaseArg>`), middlewares can be mixed and matched.
For example, the following works assuming `myOtherMiddleware` follows the the same pattern as `cookieMiddleware`:

```ts
self.addEventListener('fetch', event => event.respondWith(handleEvent({ event })))

// We can separate the options application:
const withCookies = cookiesMiddleware(/* no opts */)
const withOther = myOtherMiddleware();

const handleEvent = withCookies(withOther(async ({ event, cookieStore }) => {
  await cookieStore.set('hello', 'Hello World!');
  return new Response((await cookieStore.get('hello'))?.value ?? 'Reload page!');
}));
```

## Limitations
Unfortunately, this pattern isn't perfect: Adding an extra field (without creating a seaprate middleware) requires specifying type paramters by the user:

```ts
self.addEventListener('fetch', event => event.respondWith(handleEvent({
  event, 
  url: new URL(event.request.url), // an additional field...
})));

const withCookies = cookiesMiddleware(/* no opts */);
const withOther = myOtherMiddleware();

// ...needs to be specified here:
const handleEvent = withCookies<BaseArg & { url: URL }>(withOther(async ({ event, url, cookieStore }) => {
  return new Response('Hello World');
}));
```

There's also no easy way to pre-combine multipe middlewares, without creating a new middleware itself
— which requires a lot of type-specification and generics to get right.

For these reasons, this remains a placeholder repo for now. Perhaps these quircks can be worked out and made more user-friendly in the future.


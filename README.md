# Worker Middleware

A suite of standalone HTTP server middlewares for Worker Runtimes.

***

__Work In Progress__

***

It is meant to be used with [Worker Router](../router), but can also be used with simple request handlers.


## What's Included?
### Cookies
Supports singed, unsigned and encrypted cookies. 

Signed and encrypted cookies use the Web Cryptography API internally to en/decrypt sign and verify cookies. 

```js
router.get('/', withSignedCookies({ secret: 'password123' }), (request, { cookies, cookieStore }) => {
  cookieStore.set('foo', 'bar') // no await necessary
  return ok(cookie.foo === 'bar' ? 'Welcome back!' : 'Welcome!')
})
```

The `cookieStore` property implements the web's Cookie Store API for maximum standard compatibility. 
For better DX, the middleware also provides a read-optimized `cookies` property, which are the request's cookies parsed into a plain JS object. 

Modifying cookies is done via the cookie store. While the cookie store API is async, there is no need to await every result, as the cookie store keeps track of all operations and awaits them internally before sending the headers.

### Session
There are two session middlewares. The cookie session encodes the entire session object into a cookie and is meant for prototyping and small use cases. 
The storage session uses a KV Storage API-compatible storage object to persist the session object between requests. Worker Tools provides storage adapters for Cloudflare's KV storage and SQLite/Postgres for Deno.

The session is a plain JavaScript object that is serialized/deserialized via the Structured Clone Algorithm, i.e. it behaves largely the same as storing an object in IndexedDB. In other words, you can add Maps, Sets, and ArrayBuffers to it. 

```js
router.get('/', combine(
  signedCookies({ 
    secret: 'password123'
  }),
  cookieSession({ 
    // Type is inferred from default session.
    defaultSession: { id: '', iv: new Uint8Array([]) }
  }) 
), (request, { session }) => {
  if (!session.id) {
    session.id = crypto.randomUUID();
    session.iv = crypto.getRandomValues(new Uint8Array(32))
  }
  return ok()
})
```

The session object is persisted at the end of the request.  

### Body Parser
Because Worker Runtimes already provide helpers like `.json()` and `.formData()` in the Request type, the need for a body parser is less pronounced. The value of Middleware's body parser mainly comes from content negotiation:

```js
router.any('/form', bodyParser(), (request, { accepted, ...ctx }) => {
  switch (accepted) {
    case 'application/x-www-form-urlencoded': {
      ctx.form // instanceof URLSearchParams
      ctx.formParams // { [name: string]: string } 
      return ok()
    }
    case 'multipart/form-data': {
      ctx.formData // instanceof FormData
      ctx.formParams // { [name: string]: string } 
      ctx.files // { [name: string]: File }
      return ok()
    }
    case 'application/octet-stream':
    case 'application/binary': { // commonly used non-standard mime type
      ctx.blob // instanceof Blob
      ctx.buffer // instanceof ArrayBuffer
      return ok()
    }
    default: {
      // application/json, text/html, text/plain
      return ok()
    }
  }

  return ok()
})
```

You can also limit what is acceptable to the endpoint by combining the content negotiation middleware (see below) and `bodyParserStandalone`.

### Content Negotiation
Provides generic content negotiation for HTTP endpoints.   

Another use case is to combine with the body parser to limit what the body parser accepts:

```js
router.any('/form', combine(
  accepts({ accepts: ['application/x-www-form-urlencoded', 'multipart/form-data'] }),
  bodyParserExCn()
), (request, { accepted, ...ctx }) => {
  // Accepted property are now limited to forms.
  // Endpoint will not accept other types
}
```

NOTE: It's currently only possible to limit what the body parser accepts.

The `contentTypes` middleware lets you specify what content types the endpoint *can* provide. For example, we can build a mini deno.land that either serves raw JavaScript or a HTML page documenting the function:

```js
router.get('/form', combine(
  contentTypes({ types: ['text/html', 'application/javascript'] })
), (request, { type }) => {
  // `type` is either 'text/html' or 'application/json',
  // depending on the client's `Accept` header (best match)
  switch (type) {
    case 'application/javascript': 
      return ok('function foo() {}', { 
        headers: { 'content-type': type } 
      })
    case 'text/html': 
      return ok('HTML documentation for JS', {
        headers: { 'content-type': type } 
      })
  }
}
```

### Caching

### Basics

## Use with Netlify Functions
```ts
import { Context } from "netlify:edge"
import { 
  withMiddleware, 
  combine, 
  signedCookies, 
  cookieSession, 
} from 'https://ghuc.cc/worker-tools/middleware/index.ts';

export default withMiddleware(
  combine(
    signedCookies({ secret: 'password123' }), 
    cookieSession(),
  ), 
  async (req, { cookies, body, args: [, _context] }) => {
    const context = _context as Context
    return await context.next()
  }
)
```

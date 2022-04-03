import { URLPatternComponentResult, URLPatternResult } from "https://esm.sh/urlpattern-polyfill@3.0.0/dist/index.js?module";
export { pipe as combine } from 'https://esm.sh/ts-functional-pipe@3.1.2/ts-functional-pipe.js?module';

export * from './context.ts'

export * from './basics.ts';
export * from './content-negotiation.ts';
export * from './body-parser.ts';
export * from './cookies.ts';
export * from './cors.ts';
export * from './session.ts';
export * from './caching.ts';

declare global {
  /**
   * Extends the lifetime of the install and activate events dispatched on the global scope as part of the
   * service worker lifecycle. This ensures that any functional events (like FetchEvent) are not dispatched until it
   * upgrades database schemas and deletes the outdated cache entries. 
   */
  interface ExtendableEvent extends Event {
      waitUntil(f: any): void;
  }

  interface ExtendableEventInit extends EventInit {
      new(type: string, eventInitDict?: ExtendableEventInit): ExtendableEvent;
  }

  interface FetchEventInit extends ExtendableEventInit {
      new(type: string, eventInitDict: FetchEventInit): FetchEvent;
      clientId?: string;
      preloadResponse?: Promise<any>;
      replacesClientId?: string;
      request: Request;
      resultingClientId?: string;
  }

  /**
   * This is the event type for fetch events dispatched on the service worker global scope. 
   * It contains information about the fetch, including the request and how the receiver will treat the response. 
   * It provides the event.respondWith() method, which allows us to provide a response to this fetch. 
   */
  interface FetchEvent extends ExtendableEvent {
      readonly clientId: string;
      readonly preloadResponse: Promise<any>;
      readonly replacesClientId: string;
      readonly request: Request;
      readonly resultingClientId: string;
      respondWith(r: Response | Promise<Response>): void;
  }

  interface Window {
      FetchEvent: new (type: string, eventInitDict: FetchEventInit) => FetchEvent;
  }
}
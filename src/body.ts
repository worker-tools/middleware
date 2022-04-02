import type { Awaitable } from "./utils/common-types";
import { combine, Context } from "./index";
import { ContentNegotiationResults, withContentNegotiation } from './content-negotiation'
import { withAccepts, AcceptedType } from './content-negotiation-2'

interface BodyParserOptions<T = any> {
  defaultJSON?: T
}

export const JSON = 'application/json';
export const FORM = 'application/x-www-form-urlencoded'
export const FORM_DATA = 'multipart/form-data';
/** Standard MIME type for binary data */
export const BINARY = 'application/octet-stream';
/** Non standard MIME type for binary data */
export const X_BINARY = 'application/binary';
export const TEXT_HTML  = 'text/html'
export const TEXT_PLAIN  = 'text/plain'

export type BodyParsable =
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'application/json'
  | 'application/octet-stream'
  | 'application/binary'
  | `text/${string}`

export const accepts: BodyParsable[] = [
  FORM,
  FORM_DATA,
  JSON,
  BINARY,
  X_BINARY,
  TEXT_HTML,
  TEXT_PLAIN,
]

export interface BodyJSONContext<J = any> {
  accepted: 'application/json',
  json: J
}

export interface BodyFormContext {
  accepted: 'application/x-www-form-urlencoded',
  bodyParams: { [key: string]: string }
  form: URLSearchParams
}

export interface BodyFormDataContext {
  accepted: 'multipart/form-data',
  bodyParams: { [key: string]: string }
  formData: FormData
  files: { [key: string]: File }
}

export interface BodyBinaryContext {
  accepted: 'application/octet-stream' | 'application/binary',
  buffer: ArrayBuffer
  blob: Blob,
}

export interface BodyTextContext {
  accepted: `text/${string}`,
  text: string
}

// export interface BodyGenericBinaryContext {
//   accepted: `application/${string}` ,
//   text: string
// }
// NOT working because TS lacks a "any string except 'json', 'x-www-form-urlencoded' and 'octet-stream'" type,
// which we need to make this work. Progress here: https://github.com/microsoft/TypeScript/pull/29317

export type BodyContext<J> =
  | BodyJSONContext<J>
  | BodyBinaryContext
  | BodyFormContext
  | BodyFormDataContext
  | BodyTextContext
// Not possible to provide a fallback rn: https://github.com/microsoft/TypeScript/issues/48073

const isString = (x: [string, FormDataEntryValue]): x is [string, string] => !(x[1] instanceof File)
const isFile = (x: [string, FormDataEntryValue]): x is [string, File] => x[1] instanceof File

export type BodyParserDeps = Context & AcceptedType<BodyParsable>

export const bodyParserAccepts = withAccepts({ accepts })

export const withBodyParser = <J = any>(
  _opt: BodyParserOptions<J> = {},
) => async <X extends BodyParserDeps>(
  ax: Awaitable<X>
): Promise<X & BodyContext<J>> => {
    const x = await ax;
    const nx = x as X & BodyContext<J>;

    switch (nx.accepted) {
      case JSON: {
        nx.json = await x.request.json()
        return nx;
      }
      case FORM: {
        const form = new URLSearchParams(await x.request.text())
        nx.bodyParams = Object.fromEntries(form);
        return nx;
      }
      case FORM_DATA: {
        const formData = nx.formData = await x.request.formData();
        const tuples = [...formData];
        nx.bodyParams = Object.fromEntries(tuples.filter(isString));
        nx.files = Object.fromEntries(tuples.filter(isFile));
        return nx;
      }
      case BINARY: {
        nx.buffer = await x.request.arrayBuffer();
        nx.blob = new Blob([nx.buffer]) // TODO: does this copy??
        return nx;
      }
      case X_BINARY: {
        nx.buffer = await x.request.arrayBuffer();
        nx.blob = new Blob([nx.buffer]) // TODO: does this copy??
        return nx;
      }
      default: {
        if (nx.accepted?.startsWith('text/')) {
          nx.text = await x.request.text();
        } else {
          (<any>nx).buffer = await x.request.arrayBuffer();
          (<any>nx).blob = new Blob([(<any>nx).buffer])
          return nx;
        }
        return nx;
      }
    }
  }

export const withAnyBody = <J>(opts: BodyParserOptions<J>) => combine(withAccepts({ accepts }), withBodyParser(opts));

(async () => {
  const ctx = { request: new Request('/'), waitUntil: () => { }, effects: [] as any } as Context

  const x = await withBodyParser({})(withAccepts({ accepts: [...accepts, 'text/foo'] })(ctx))
  if (x.accepted === 'application/x-www-form-urlencoded') {
    x.bodyParams
    x.form
  }
  else if (x.accepted === 'multipart/form-data') {
    x.formData
    x.bodyParams
    x.files
  } else if (x.accepted === 'application/octet-stream' || x.accepted === 'application/binary') {
    x.buffer
    x.blob
  } else if (x.accepted === 'text/foobar') {
    x.text
  }
})


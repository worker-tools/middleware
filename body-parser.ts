// deno-lint-ignore-file no-explicit-any
import type { Awaitable } from "./utils/common-types.ts";
import { combine, Context } from "./context.ts";
import { accepts, Accepted } from './content-negotiation.ts'
import { payloadTooLarge } from 'https://ghuc.cc/worker-tools/response-creators/index.ts'

export const JSON = 'application/json';
export const FORM = 'application/x-www-form-urlencoded'
export const FORM_DATA = 'multipart/form-data';
export const TEXT_HTML = 'text/html'
export const TEXT_PLAIN = 'text/plain'
/** Standard MIME type for binary data */
export const BINARY = 'application/octet-stream';
/** Non-standard MIME type for binary data. Sometimes used, so included anyway. */
export const X_BINARY = 'application/x-binary';

export interface BodyParserOptions<J> {
  defaultJSON?: J,
  maxSize?: number
}

export type BodyParsable =
  | typeof FORM
  | typeof FORM_DATA
  | typeof JSON
  | typeof BINARY
  | typeof X_BINARY
  | `application/${string}+json`
  | `text/${string}`

export const defaultBody: BodyParsable[] = [
  FORM,
  FORM_DATA,
  JSON,
  BINARY,
  X_BINARY,
  TEXT_HTML,
  TEXT_PLAIN,
]

export interface BodyJSONContext<J = any> {
  accepted: typeof JSON,
  body: J
  json: J
}

export interface BodyVendorJSONContext<J = any> {
  accepted: `application/${string}+json`,
  body: J
  json: J
}

export interface BodyFormContext {
  accepted: typeof FORM,
  body: URLSearchParams,
  form: URLSearchParams,
  // form: { [key: string]: string }
}

export interface BodyFormDataContext {
  accepted: typeof FORM_DATA,
  body: FormData
  formData: FormData
  // form: { [key: string]: string }
  // files: { [key: string]: File }
}

export interface BodyBinaryContext {
  accepted: typeof BINARY | typeof X_BINARY
  body: ArrayBuffer,
  arrayBuffer: ArrayBuffer,
  blob: Blob,
}

// export interface BodyVendorBinaryContext {
//   accepted: `application/vnd.${string}`,
//   body: ArrayBuffer,
//   buffer: ArrayBuffer,
//   blob: Blob,
// }

export interface BodyTextContext {
  accepted: `text/${string}`,
  body: string,
  text: string,
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
  | BodyVendorJSONContext<J>
// Not possible to provide a fallback rn: https://github.com/microsoft/TypeScript/issues/48073

const _isString = (x: [string, FormDataEntryValue]): x is [string, string] => !(x[1] instanceof File)
const _isFile = (x: [string, FormDataEntryValue]): x is [string, File] => x[1] instanceof File

export type BodyParserDeps = Context & Accepted<BodyParsable>

const isBodyTextContext = <J = any>(nx: BodyContext<J>): nx is BodyTextContext =>
  nx.accepted?.startsWith('text/')

const isBodyVendorJSONContext = <J = any>(nx: BodyContext<J>): nx is BodyVendorJSONContext<J> =>
  nx.accepted?.startsWith('application/') && nx.accepted.endsWith('+json')

// const isBodyVendorBinaryContext = <J = any>(nx: BodyContext<J>): nx is BodyVendorBinaryContext => 
//   nx.accepted?.startsWith('application/vnd.')

const MB = 1024**2

async function checkSize(req: Request, maxSize: number) {
  let size = 0;
  await req.clone().body!.pipeTo(
    new WritableStream({
      write(chunk, ctrl) {
        size += chunk.byteLength
        if (size > maxSize) {
          ctrl.error(new Error('Payload too large'))
        }
      }
    }))
  return size > maxSize
}

export const bodyParser = <J = any>(
  opts: BodyParserOptions<J> = {},
) => async <X extends BodyParserDeps>(
  ax: Awaitable<X>
): Promise<X & BodyContext<J>> => {
    const x = await ax;
    const nx = x as X & BodyContext<J>;

    const ok = await checkSize(x.request, opts.maxSize ?? 1 * MB)
    if (!ok) throw payloadTooLarge()

    switch (nx.accepted) {
      case JSON: {
        nx.body = nx.json = await x.request.json()
        return nx;
      }
      case FORM: {
        const _form = nx.body = nx.form = new URLSearchParams(await x.request.text())
        // FIXME: Multiple values per key??
        // nx.form = Object.fromEntries(form);
        return nx;
      }
      case FORM_DATA: {
        const _formData = nx.body = nx.formData = await x.request.formData();
        // FIXME: Multiple values per key??
        // const tuples = [...formData];
        // nx.form = Object.fromEntries(tuples.filter(isString));
        // nx.files = Object.fromEntries(tuples.filter(isFile));
        return nx;
      }
      case BINARY:
      case X_BINARY: {
        nx.body = nx.arrayBuffer = await x.request.arrayBuffer();
        nx.blob = new Blob([nx.arrayBuffer]) // TODO: does this copy??
        return nx;
      }
      default: {
        if (isBodyTextContext(nx)) {
          nx.body = nx.text = await x.request.text();
        } else if (isBodyVendorJSONContext(nx)) {
          nx.body = nx.json = await x.request.json()
          return nx;
        // } else if (isBodyVendorBinaryContext(nx)) {
        //   nx.body = nx.buffer = await x.request.arrayBuffer();
        //   nx.blob = new Blob([nx.buffer]) // TODO: does this copy??
        //   return nx;
        } else {
          // Anything else gets the binary treatment (outside of scope of type system)
          (<any>nx).body = (<any>nx).buffer = await x.request.arrayBuffer();
          (<any>nx).blob = new Blob([(<any>nx).buffer])
          return nx;
        }
        return nx;
      }
    }
  }

export const defaultBodyParser = <J = any>(options?: BodyParserOptions<J>) =>
  combine(accepts(defaultBody), bodyParser(options));

// type ErrorOf<T> = T extends { error?: infer E } ? E : never

// (async () => {
//   const ctx: Context = { request: new Request('/'), effects: [], waitUntil: (_f: any) => {}, handled: Promise.resolve(null as any) }
//   const z = provides([])(accepts([])(ctx))


//   const x = await parseBody()(accepts(['text/x-foo', 'application/vnd.github.v3+json', FORM, FORM_DATA])(ctx))
//   if (x.accepted === 'application/vnd.github.v3+json') {
//     x.body
//   } else if (x.accepted === 'text/x-foo') {
//     x.body
//   } else if (x.accepted === 'application/x-www-form-urlencoded') {
//     x.body
//   }

//   const y = await bodyParser()(ctx)
//   if (y.accepted === 'application/x-www-form-urlencoded') {
//     y.bodyParams
//     y.body
//   }
//   if (y.accepted === 'multipart/form-data') {
//     y.formData
//     y.body
//   }
//   if (y.accepted === 'application/foobar+json') {
//     y.json
//     y.body
//   }
//   // if (x.accepted === 'application/x-www-form-urlencoded') {
//   //   x.body
//   //   x.bodyParams
//   //   x.form
//   // }
//   // else if (x.accepted === 'multipart/form-data') {
//   //   x.formData
//   //   x.form
//   //   x.files
//   // } else if (x.accepted === 'application/octet-stream' || x.accepted === 'application/x-binary') {
//   //   x.buffer
//   //   x.blob
//   // } else if (x.accepted === 'application/vnd.github.v3+json') {

//   // } else if (x.accepted === 'text/foo') {
//   //   x.text
//   // }
// })


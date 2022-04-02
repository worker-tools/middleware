import type { Method } from "tiny-request-router";
import type { Awaitable } from "./utils/common-types";
import type { Context } from "./index";

export interface BasicsContext { 
  request: Request,
  headers: Headers, 
  url: URL, 
  method: Method, 
  pathname: string, 
  searchParams: URLSearchParams,
  userAgent: string,
  params: { [key: string]: string }
  query: { [key: string]: string }
  ip?: string
}

// const mk = (s: URL) => {
//   const { dirname, filename } = s.pathname.match(/^(?<dirname>.*)\/(?<filename>.*)$/) ?? { dirname: '', filename: '' };
//   return [dirname, filename]
// }

export const withBasics = () => async <X extends Context>(ax: Awaitable<X>): Promise<X & BasicsContext> => {
  const x = await ax;
  const { request, match } = x;
  const { headers } = request;
  const method = <Method>request.method;
  const url = new URL(request.url)
  const { pathname, searchParams } = url;
  const userAgent = headers.get('user-agent') ?? '';
  const ip = headers.get('x-forwarded-for') ?? x.connInfo?.remoteAddr?.hostname ?? '';
  const params = match?.pathname.groups ?? {};
  const query = Object.fromEntries(searchParams)
  return Object.assign(x, { headers, method, url, pathname, searchParams, userAgent, ip, params, query })
}

import type { Awaitable } from "./utils/common-types.ts";
import type { Context } from "./index.ts";
import type { Method } from "./cors.ts"

export interface BasicsContext { 
  request: Request,
  headers: Headers, 
  url: URL, 
  method: Method, 
  pathname: string, 
  // dirname: string,
  // filename: string,
  searchParams: URLSearchParams,
  userAgent: string,
  params: { [key: string]: string | undefined }
  ip?: string
}

const _extract = (s: URL) => {
  const result = s.pathname.match(/^(.*)\/(.*)$/);
  return result 
    ? { dirname: result[1], filename: result[2] } 
    : { dirname: '', filename: '' }
}

export const basics = () => async <X extends Context>(ax: Awaitable<X>): Promise<X & BasicsContext> => {
  const x = await ax;
  const { request, match } = x;
  const { headers } = request;
  const method = <Method>request.method;
  const url = new URL(request.url)
  const { pathname, searchParams } = url;
  const userAgent = headers.get('user-agent') ?? '';
  const ip = headers.get('x-forwarded-for') ?? <string>x.connInfo?.remoteAddr?.hostname ?? '';
  const params = match?.pathname.groups ?? {};
  return Object.assign(x, { headers, method, url, pathname, searchParams, userAgent, ip, params });
}

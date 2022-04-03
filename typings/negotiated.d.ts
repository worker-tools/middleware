declare module 'https://esm.sh/v74/negotiated@1.0.2/negotiated.js' {
  export function mediaTypes(h?: string|null): IterableIterator<{ type: string, params: string, weight: number, extensions: string }>
  export function charsets(h?: string|null): IterableIterator<{ charset: string, weight: number }>
  export function encodings(h?: string|null): IterableIterator<{ encoding: string, weight: number }>
  export function languages(h?: string|null): IterableIterator<{ language: string, weight: number }>
  export function transferEncodings(h?: string|null): IterableIterator<{ encoding: string, params: string, weight: number }>
  export function parameters(p?: string|null): IterableIterator<{ key: string, value: string }>
}

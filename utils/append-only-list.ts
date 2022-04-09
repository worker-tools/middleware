const _arr = new WeakMap<AppendOnlyList<unknown>, unknown>();

export class AppendOnlyList<T> {
  constructor() {
    _arr.set(this, []);
  }
  get length(): number {
    return (<T[]>_arr.get(this)!).length;
  }
  toString(): string {
    return (<T[]>_arr.get(this)!).toString();
  }
  toLocaleString(): string {
    return (<T[]>_arr.get(this)!).toLocaleString();
  }
  push(...items: T[]): number {
    return (<T[]>_arr.get(this)!).push(...items);
  }
  entries(): IterableIterator<[number, T]> {
    return (<T[]>_arr.get(this)!).entries()
  }
  keys(): IterableIterator<number> {
    return (<T[]>_arr.get(this)!).keys()
  }
  values(): IterableIterator<T> {
    return (<T[]>_arr.get(this)!).values()
  }
  [Symbol.iterator](): IterableIterator<T> {
    return (<T[]>_arr.get(this)!)[Symbol.iterator]();
  }
  [Symbol.unscopables](): { copyWithin: boolean; entries: boolean; fill: boolean; find: boolean; findIndex: boolean; keys: boolean; values: boolean; } {
    throw new Error('Method not implemented.');
  }
}

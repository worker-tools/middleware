export class AppendOnlyList<T> {
  #arr: T[];
  constructor() {
    this.#arr = [];
  }
  get length() {
    return this.#arr.length;
  }
  toString(): string {
    return this.#arr.toString();
  }
  toLocaleString(): string {
    return this.#arr.toLocaleString();
  }
  push(...items: T[]): number {
    return this.#arr.push(...items);
  }
  entries(): IterableIterator<[number, T]> {
    return this.#arr.entries()
  }
  keys(): IterableIterator<number> {
    return this.#arr.keys()
  }
  values(): IterableIterator<T> {
    return this.#arr.values()
  }
  [Symbol.iterator](): IterableIterator<T> {
    return this.#arr[Symbol.iterator]();
  }
  [Symbol.unscopables](): { copyWithin: boolean; entries: boolean; fill: boolean; find: boolean; findIndex: boolean; keys: boolean; values: boolean; } {
    throw new Error('Method not implemented.');
  }
}

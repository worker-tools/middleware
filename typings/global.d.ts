interface Headers {
    [Symbol.iterator](): IterableIterator<[string, string]>;
    /** Returns an iterator allowing to go through all key/value pairs contained in this object. */
    entries(): IterableIterator<[string, string]>;
    /** Returns an iterator allowing to go through all keys of the key/value pairs contained in this object. */
    keys(): IterableIterator<string>;
    /** Returns an iterator allowing to go through all values of the key/value pairs contained in this object. */
    values(): IterableIterator<string>;
}
interface FormData {
    [Symbol.iterator](): IterableIterator<[string, FormDataEntryValue]>;
    /** Returns an iterator allowing to go through all key/value pairs contained in this object. */
    entries(): IterableIterator<[string, FormDataEntryValue]>;
    /** Returns an iterator allowing to go through all keys of the key/value pairs contained in this object. */
    keys(): IterableIterator<string>;
    /** Returns an iterator allowing to go through all values of the key/value pairs contained in this object. */
    values(): IterableIterator<FormDataEntryValue>;
}

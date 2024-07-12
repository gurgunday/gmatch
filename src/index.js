import { Writable } from "node:stream";
import { Buffer } from "node:buffer";

const Match = class extends Writable {
  #index = -1;
  #count = 0;
  #processedBytes = 0;
  #lookbehindSize = 0;
  #lookbehind;
  #table;
  #pattern;

  /**
   * @param {string} pattern - The pattern to search for.
   * @param {object} [options] - The options for the Writable stream.
   */
  constructor(pattern, options) {
    if (typeof pattern !== "string") {
      throw new TypeError("Pattern must be a string");
    }

    if (pattern.length === 0 || pattern.length >= 257) {
      throw new RangeError("Pattern length must be between 1 and 256");
    }

    super(options);
    this.#pattern = Buffer.from(pattern);
    this.#table = Match.table(this.#pattern);
    this.#lookbehind = new Uint8Array(this.#pattern.length - 1);
  }

  _write(chunk, encoding, callback) {
    this.#search(chunk);
    callback();
  }

  _final(callback) {
    this.#processedBytes += this.#lookbehindSize;
    callback();
  }

  #search(chunk) {
    const buffer = Buffer.concat([
      this.#lookbehind.subarray(0, this.#lookbehindSize),
      chunk,
    ]);

    const pattern = this.#pattern;
    const patternLength = pattern.length;

    const difference = buffer.length - patternLength;

    if (difference < 0) {
      this.#lookbehind.set(buffer);
      this.#lookbehindSize = buffer.length;
      return;
    }

    const table = this.#table;
    const processedBytes = this.#processedBytes;
    const patternLastIndex = patternLength - 1;

    for (let i = 0; i <= difference; ) {
      let j = patternLastIndex;

      while (j !== -1 && buffer[i + j] === pattern[j]) {
        --j;
      }

      if (j === -1) {
        ++this.#count;
        this.#index = processedBytes + i;
        this.emit("match", this.#index);
        i += patternLength;
        continue;
      }

      i += table[buffer[patternLength + i]];
    }

    if (this.#index === difference) {
      this.#lookbehindSize = 0;
      this.#processedBytes += buffer.length;
      return;
    }

    this.#lookbehindSize = this.#lookbehind.length;
    this.#processedBytes += difference + 1;
    this.#lookbehind.set(buffer.subarray(difference + 1));
  }

  get pattern() {
    return this.#pattern.toString();
  }

  get lookbehind() {
    return Buffer.from(
      this.#lookbehind.subarray(0, this.#lookbehindSize),
    ).toString();
  }

  get processedBytes() {
    return this.#processedBytes;
  }

  get count() {
    return this.#count;
  }

  get index() {
    return this.#index;
  }

  static table(pattern) {
    const patternLength = pattern.length;
    const table = new Uint8Array(256).fill(patternLength + 1);

    for (let i = 0; i !== patternLength; ++i) {
      table[pattern[i]] = patternLength - i;
    }

    return table;
  }
};

export { Match };

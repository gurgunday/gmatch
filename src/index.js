import { Writable } from "node:stream";
import { Buffer } from "node:buffer";

const Match = class extends Writable {
  #index = -1;
  #count = 0;
  #searchStartPosition = 0;
  #lookbehindSize = 0;
  #lookbehind;
  #table;
  #pattern;

  /**
   * @param {string} pattern - The pattern to search for.
   * @param {object} [options] - The options for the Writable stream.
   * @throws {TypeError}
   * @throws {RangeError}
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

  #search(chunk) {
    const table = this.#table;
    const pattern = this.#pattern;
    const patternLength = pattern.length;
    const patternLastIndex = patternLength - 1;
    const totalLength = this.#lookbehindSize + chunk.length;
    const difference = totalLength - patternLength;

    if (difference < 0) {
      this.#lookbehind.set(chunk, this.#lookbehindSize);
      this.#lookbehindSize = totalLength;
      return;
    }

    const count = this.#count;
    let searchStartPosition = this.#searchStartPosition;

    for (let i = 0; i <= difference; ) {
      let j = patternLastIndex;

      while (j !== -1 && this.#getByte(i + j, chunk) === pattern[j]) {
        --j;
      }

      if (j === -1) {
        ++this.#count;
        this.#index = searchStartPosition + i;
        this.emit("match", this.#index);
        i += patternLength;
        continue;
      }

      i += table[this.#getByte(patternLength + i, chunk)];
    }

    searchStartPosition = difference + 1;
    const newSearchPosition = this.#index + patternLength;

    if (this.#count !== count && newSearchPosition > searchStartPosition) {
      if (newSearchPosition >= totalLength) {
        this.#lookbehindSize = 0;
        this.#searchStartPosition += totalLength;
        return;
      }

      for (let i = 0; i !== this.#lookbehind.length; ++i) {
        this.#lookbehind[i] = this.#getByte(newSearchPosition + i, chunk);
      }

      this.#lookbehindSize = totalLength - newSearchPosition;
      this.#searchStartPosition += newSearchPosition;

      return;
    }

    for (let i = 0; i !== this.#lookbehind.length; ++i) {
      this.#lookbehind[i] = this.#getByte(searchStartPosition + i, chunk);
    }

    this.#lookbehindSize = patternLastIndex;
    this.#searchStartPosition += searchStartPosition;
  }

  #getByte(index, chunk) {
    if (index < this.#lookbehindSize) {
      return this.#lookbehind[index];
    }

    return chunk[index - this.#lookbehindSize];
  }

  get pattern() {
    return this.#pattern.toString();
  }

  get lookbehind() {
    return Buffer.from(
      this.#lookbehind.subarray(0, this.#lookbehindSize),
    ).toString();
  }

  get searchStartPosition() {
    return this.#searchStartPosition;
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

"use strict";

const bufferFrom = (string) => {
  const buffer = new Uint8Array(string.length);

  for (let i = 0; i !== string.length; ++i) {
    buffer[i] = string.charCodeAt(i);
  }

  return buffer;
};

const Match = class {
  #index = -1;
  #count = 0;
  #searchStartPosition = 0;
  #lookbehindSize = 0;
  #lookbehind;
  #table;
  #pattern;
  #callback;

  /**
   * @param {string} pattern - The pattern to search for.
   * @param {Function} callback - The callback function to be called when there's a match.
   * @throws {TypeError}
   * @throws {RangeError}
   */
  constructor(pattern, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function");
    }

    if (typeof pattern !== "string") {
      throw new TypeError("Pattern must be a string");
    }

    if (pattern.length === 0 || pattern.length >= 257) {
      throw new RangeError("Pattern length must be between 1 and 256");
    }

    this.#callback = callback;
    this.#pattern = bufferFrom(pattern);
    this.#table = Match.table(this.#pattern);
    this.#lookbehind = new Uint8Array(this.#pattern.length - 1);
  }

  write(chunk) {
    this.#search(chunk instanceof Uint8Array ? chunk : bufferFrom(`${chunk}`));
  }

  #search(chunk) {
    const table = this.#table;
    const pattern = this.#pattern;
    const lookbehind = this.#lookbehind;
    const lengthTotal = this.#lookbehindSize + chunk.length;
    const lengthDifference = lengthTotal - pattern.length;

    if (lengthDifference < 0) {
      lookbehind.set(chunk, this.#lookbehindSize);
      this.#lookbehindSize = lengthTotal;
      return;
    }

    const patternLastIndex = pattern.length - 1;

    for (let i = 0; i <= lengthDifference; ) {
      let j = patternLastIndex;

      while (j !== -1 && this.#getByte(i + j, chunk) === pattern[j]) {
        --j;
      }

      if (j === -1) {
        ++this.#count;
        this.#index = this.#searchStartPosition + i;
        this.#callback(this.#index);
        i += pattern.length;
        continue;
      }

      i += table[this.#getByte(i + pattern.length, chunk)];
    }

    const processedBytes = lengthDifference + 1;

    if (this.#index >= this.#searchStartPosition) {
      const processedBytes2 =
        this.#index - this.#searchStartPosition + pattern.length;

      if (processedBytes2 > processedBytes) {
        const patternLastIndex2 = lengthTotal - processedBytes2;

        for (let i = 0; i !== patternLastIndex2; ++i) {
          lookbehind[i] = this.#getByte(processedBytes2 + i, chunk);
        }

        this.#lookbehindSize = patternLastIndex2;
        this.#searchStartPosition += processedBytes2;

        return;
      }
    }

    for (let i = 0; i !== patternLastIndex; ++i) {
      lookbehind[i] = this.#getByte(processedBytes + i, chunk);
    }

    this.#lookbehindSize = patternLastIndex;
    this.#searchStartPosition += processedBytes;
  }

  #getByte(index, chunk) {
    return index < this.#lookbehindSize
      ? this.#lookbehind[index]
      : chunk[index - this.#lookbehindSize];
  }

  get pattern() {
    return String.fromCharCode.apply(null, this.#pattern);
  }

  get lookbehindSize() {
    return this.#lookbehindSize;
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
    const table = new Uint8Array(256).fill(pattern.length + 1);

    for (let i = 0; i !== pattern.length; ++i) {
      table[pattern[i]] = pattern.length - i;
    }

    return table;
  }
};

module.exports.Match = Match;

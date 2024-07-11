import { Writable } from "node:stream";
import { Buffer } from "node:buffer";

const Match = class extends Writable {
  #matches = 0;
  #processedBytes = 0;
  #lookbehindSize = 0;
  #lookbehind;
  #pattern;
  #patternTable;

  /**
   * @param {string} pattern - The pattern to search for.
   * @param {object} [options] - The options for the Writable stream.
   * @throws {TypeError} - The pattern must be a string.
   * @throws {RangeError} - The pattern length must be between 1 and 256.
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
    this.#patternTable = Match.buildTable(this.#pattern);
    this.#lookbehind = Buffer.alloc(this.#pattern.length - 1);
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
      buffer.copy(this.#lookbehind);
      this.#lookbehindSize = buffer.length;
      return;
    }

    const processedBytes = this.#processedBytes;
    const patternTable = this.#patternTable;
    const patternLastIndex = patternLength - 1;

    for (let i = 0; i <= difference; ) {
      let j = patternLastIndex;

      while (j !== -1 && buffer[i + j] === pattern[j]) {
        --j;
      }

      if (j === -1) {
        ++this.#matches;
        this.emit("match", processedBytes + i);
        i += patternLength;
        continue;
      }

      i += patternTable[buffer[patternLength + i]];
    }

    buffer.copy(this.#lookbehind, 0, difference + 1);
    this.#lookbehindSize = this.#lookbehind.length;
    this.#processedBytes += difference + 1;
  }

  get processedBytes() {
    return this.#processedBytes;
  }

  get matches() {
    return this.#matches;
  }

  static buildTable(pattern) {
    const patternLength = pattern.length;
    const table = new Uint8Array(256).fill(patternLength + 1);

    for (let i = 0; i !== patternLength; ++i) {
      table[pattern[i]] = patternLength - i;
    }

    return table;
  }
};

export { Match };

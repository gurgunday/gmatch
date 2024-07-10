import { Writable } from "node:stream";
import { Buffer } from "node:buffer";

const Match = class extends Writable {
  #buffer = Buffer.alloc(0);
  #processedBytes = 0;
  #pattern;
  #table;

  /**
   * @param {string} pattern - The pattern to search for.
   * @param {object} [options] - The options for the Writable stream.
   * @throws {Error} - If the pattern is not a string, or if its length is less than 1 or more than 256 bytes.
   */
  constructor(pattern, options) {
    if (typeof pattern !== "string") {
      throw new TypeError("Pattern must be a string");
    }

    if (pattern.length === 0 || pattern.length >= 257) {
      throw new RangeError("Pattern must be between 1 and 256 bytes");
    }

    super(options);
    this.#pattern = Buffer.from(pattern);
    this.#table = Match.buildTable(this.#pattern);
  }

  _write(chunk, encoding, callback) {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    this.#search();
    callback();
  }

  _final(callback) {
    this.#processedBytes = this.#buffer.length;
    callback();
  }

  #search() {
    const buffer = this.#buffer;
    const table = this.#table;
    const pattern = this.#pattern;
    const bufferLength = buffer.length;
    const patternLength = pattern.length;
    const difference = bufferLength - patternLength;

    if (difference < 0) {
      return;
    }

    const processedBytes = this.#processedBytes;
    const patternLastIndex = patternLength - 1;

    for (let i = processedBytes; i <= difference; ) {
      let j = patternLastIndex;

      while (j >= 0 && buffer[i + j] === pattern[j]) {
        --j;
      }

      if (j < 0) {
        this.emit("match", i);
        i += patternLength;
        continue;
      }

      i += table[buffer[patternLength + i]];
    }

    this.#processedBytes = difference + 1;
  }

  get buffer() {
    return this.#buffer;
  }

  get processedBytes() {
    return this.#processedBytes;
  }

  static buildTable(pattern) {
    const patternLength = pattern.length;
    const table = new Uint8Array(256).fill(patternLength + 1);

    for (let i = 0; i < patternLength; ++i) {
      table[pattern[i]] = patternLength - i;
    }

    return table;
  }
};

export { Match };

"use strict";

const bufferTextEncoder = new TextEncoder();

const bufferFrom = (string) => {
  return bufferTextEncoder.encode(string);
};

const bufferCompare = (buffer1, offset1, buffer2, offset2, length) => {
  for (let i = 0; i !== length; ++i) {
    if (buffer1[offset1 + i] !== buffer2[offset2 + i]) {
      return false;
    }
  }

  return true;
};

const Match = class {
  #from;
  #callback;
  #pattern;
  #skip;
  #lookbehind;
  #lookbehindSize;
  #matches;

  /**
   * @param {string} pattern pattern
   * @param {Function} callback callback
   * @param {Function} from from
   * @throws {TypeError}
   * @throws {RangeError}
   */
  constructor(pattern, callback, from = bufferFrom) {
    if (typeof from !== "function") {
      throw new TypeError("From must be a Function");
    }

    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a Function");
    }

    if (typeof pattern !== "string") {
      throw new TypeError("Pattern must be a string");
    }

    if (!pattern.length || pattern.length >= 257) {
      throw new RangeError("Pattern length must be between 1 and 256");
    }

    this.#from = from;
    this.#callback = callback;
    this.#pattern = this.#from(pattern);
    this.#skip = Match.#table(this.#pattern);
    this.#lookbehind = new Uint8Array(this.#pattern.length - 1);
    this.#lookbehindSize = 0;
    this.#matches = 0;
  }

  get lookbehindSize() {
    return this.#lookbehindSize;
  }

  get matches() {
    return this.#matches;
  }

  destroy() {
    if (this.#lookbehindSize) {
      this.#callback(false, this.#lookbehind, 0, this.#lookbehindSize, false);
    }

    this.reset();
  }

  reset() {
    this.#lookbehindSize = 0;
    this.#matches = 0;
  }

  /**
   * @param {Uint8Array|ArrayBuffer|string} chunk chunk
   */
  write(chunk) {
    const buffer =
      chunk instanceof Uint8Array
        ? chunk
        : chunk instanceof ArrayBuffer
          ? new Uint8Array(chunk)
          : this.#from(String(chunk));
    let offset = 0;

    while (offset !== buffer.length) {
      offset = this.#search(buffer, offset);
    }
  }

  #search(buffer, offset) {
    const patternLastCharIndex = this.#pattern.length - 1;
    const end = buffer.length - this.#pattern.length;
    let position = -this.#lookbehindSize;

    if (position < 0) {
      while (position < 0 && position <= end) {
        const char = buffer[position + patternLastCharIndex];

        if (
          char === this.#pattern[patternLastCharIndex] &&
          this.#patternCompare(buffer, position, patternLastCharIndex)
        ) {
          ++this.#matches;

          if (-position === this.#lookbehindSize) {
            this.#callback(true, null, 0, 0, false);
          } else {
            this.#callback(
              true,
              this.#lookbehind,
              0,
              position + this.#lookbehindSize,
              false,
            );
          }

          this.#lookbehindSize = 0;

          return position + this.#pattern.length;
        }

        position += this.#skip[char];
      }

      if (position < 0) {
        const bytesToCutOff = position + this.#lookbehindSize;

        if (bytesToCutOff) {
          this.#callback(false, this.#lookbehind, 0, bytesToCutOff, false);
          this.#lookbehindSize -= bytesToCutOff;
          this.#lookbehind.set(
            this.#lookbehind.subarray(bytesToCutOff, this.#lookbehindSize),
          );
        }

        this.#lookbehind.set(buffer, this.#lookbehindSize);
        this.#lookbehindSize += buffer.length;

        return buffer.length;
      }

      this.#callback(false, this.#lookbehind, 0, this.#lookbehindSize, false);
      this.#lookbehindSize = 0;
    }

    position += offset;

    while (position <= end) {
      const char = buffer[position + patternLastCharIndex];

      if (
        char === this.#pattern[patternLastCharIndex] &&
        bufferCompare(this.#pattern, 0, buffer, position, patternLastCharIndex)
      ) {
        ++this.#matches;

        if (!position) {
          this.#callback(true, null, 0, 0, false);
        } else {
          this.#callback(true, buffer, offset, position, true);
        }

        return position + this.#pattern.length;
      }

      position += this.#skip[char];
    }

    if (position !== offset) {
      this.#callback(false, buffer, offset, position, true);
    }

    if (position !== buffer.length) {
      this.#lookbehind.set(buffer.subarray(position));
      this.#lookbehindSize = buffer.length - position;
    }

    return buffer.length;
  }

  #patternCompare(buffer, position, length) {
    for (let i = 0; i !== length; ++i) {
      const char =
        position < 0
          ? this.#lookbehind[position + this.#lookbehindSize]
          : buffer[position];

      if (char !== this.#pattern[i]) {
        return false;
      }

      ++position;
    }

    return true;
  }

  static #table = (pattern) => {
    const table = new Uint8Array(256).fill(pattern.length);

    for (let i = 0, length = pattern.length - 1; i !== length; ++i) {
      table[pattern[i]] = length - i;
    }

    return table;
  };
};

module.exports.Match = Match;

"use strict";

const bufferTextEncoder = new TextEncoder();

const bufferFrom = (string) => bufferTextEncoder.encode(string);

const bufferCompare = (buffer1, offset1, buffer2, offset2, length) => {
  for (let i = 0; i !== length; ++i) {
    if (buffer1[offset1 + i] !== buffer2[offset2 + i]) {
      return false;
    }
  }

  return true;
};

const skipTable = (buffer) => {
  const table = new Uint8Array(256).fill(buffer.length);
  const length = buffer.length - 1;

  for (let i = 0; i !== length; ++i) {
    table[buffer[i]] = length - i;
  }

  return table;
};

const Match = class {
  #pattern;
  #patternLastCharIndex;
  #patternLastChar;
  #callback;
  #from;
  #skip;
  #lookbehind;
  #lookbehindSize;
  #matches;

  /**
   * @param {Uint8Array|string} pattern pattern
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

    this.#pattern =
      pattern instanceof Uint8Array ? pattern : from(`${pattern}`);

    if (this.#pattern.length === 0) {
      throw new RangeError("Pattern length must not be 0");
    }

    this.#patternLastCharIndex = this.#pattern.length - 1;
    this.#patternLastChar = this.#pattern[this.#patternLastCharIndex];

    this.#callback = callback;
    this.#from = from;
    this.#skip = skipTable(this.#pattern);
    this.#lookbehind = new Uint8Array(this.#patternLastCharIndex);
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
    if (this.#lookbehindSize !== 0) {
      this.#callback(false, this.#lookbehind, 0, this.#lookbehindSize, false);
    }

    this.reset();
  }

  reset() {
    this.#lookbehindSize = 0;
    this.#matches = 0;
  }

  /**
   * @param {Uint8Array|string} chunk chunk
   */
  write(chunk) {
    const buffer = chunk instanceof Uint8Array ? chunk : this.#from(`${chunk}`);
    let offset = 0;

    while (offset !== buffer.length) {
      offset = this.#search(buffer, offset);
    }
  }

  #search(buffer, offset) {
    const end = buffer.length - this.#pattern.length;
    let position = -this.#lookbehindSize;

    if (position < 0) {
      while (position < 0 && position <= end) {
        const char = buffer[position + this.#patternLastCharIndex];

        if (
          char === this.#patternLastChar &&
          this.#patternCompare(buffer, position, this.#patternLastCharIndex)
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

        if (bytesToCutOff !== 0) {
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
      const char = buffer[position + this.#patternLastCharIndex];

      if (
        char === this.#patternLastChar &&
        bufferCompare(
          this.#pattern,
          0,
          buffer,
          position,
          this.#patternLastCharIndex,
        )
      ) {
        ++this.#matches;

        if (position === 0) {
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
};

module.exports.Match = Match;

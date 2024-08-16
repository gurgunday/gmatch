const bufferFrom = (string) => {
  const buffer = new Uint8Array(string.length);

  for (let i = 0; i !== string.length; ++i) {
    buffer[i] = string.charCodeAt(i);
  }

  return buffer;
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
  #matches = 0;
  #lookbehindSize = 0;
  #lookbehind;
  #skip;
  #pattern;
  #callback;
  #from;

  /**
   * @param {string} pattern - The pattern to search for.
   * @param {Function} callback - The function to be called when there's a match or when a chunk of data is processed.
   * @param {Function} from - Native or custom `Buffer.from` implementation for runtimes like Node.js.
   * @throws {TypeError}
   * @throws {RangeError}
   */
  constructor(pattern, callback, from = bufferFrom) {
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
  }

  reset() {
    this.#lookbehindSize = 0;
    this.#matches = 0;
  }

  destroy() {
    if (this.#lookbehindSize) {
      this.#callback(false, 0, this.#lookbehindSize, this.#lookbehind, null);
    }

    this.reset();
  }

  write(chunk) {
    const buffer =
      chunk instanceof Uint8Array ? chunk : this.#from(String(chunk));
    let offset = 0;

    while (offset !== buffer.length) {
      offset = this.#search(buffer, offset);
    }
  }

  #search(buffer, offset) {
    const patternLastCharIndex = this.#pattern.length - 1;
    const patternLastChar = this.#pattern[patternLastCharIndex];
    const end = buffer.length - this.#pattern.length;
    let position = -this.#lookbehindSize;

    if (position < 0) {
      while (position < 0 && position <= end) {
        const char = buffer[position + patternLastCharIndex];

        if (
          char === patternLastChar &&
          this.#matchPattern(buffer, position, patternLastCharIndex)
        ) {
          ++this.#matches;

          if (-position === this.#lookbehindSize) {
            this.#callback(true, 0, 0, null, null);
          } else {
            this.#callback(
              true,
              0,
              position + this.#lookbehindSize,
              this.#lookbehind,
              null,
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
          this.#callback(false, 0, bytesToCutOff, this.#lookbehind, null);
          this.#lookbehindSize -= bytesToCutOff;
          this.#lookbehind.set(
            this.#lookbehind.subarray(bytesToCutOff, this.#lookbehindSize),
          );
        }

        this.#lookbehind.set(buffer, this.#lookbehindSize);
        this.#lookbehindSize += buffer.length;

        return buffer.length;
      }

      this.#callback(false, 0, this.#lookbehindSize, this.#lookbehind, null);
      this.#lookbehindSize = 0;
    }

    position += offset;

    while (position <= end) {
      const char = buffer[position + patternLastCharIndex];

      if (
        char === patternLastChar &&
        bufferCompare(this.#pattern, 0, buffer, position, patternLastCharIndex)
      ) {
        ++this.#matches;

        if (!position) {
          this.#callback(true, 0, 0, null, null);
        } else {
          this.#callback(true, offset, position, null, buffer);
        }

        return position + this.#pattern.length;
      }

      position += this.#skip[char];
    }

    if (position !== offset) {
      this.#callback(false, offset, position, null, buffer);
    }

    if (position !== buffer.length) {
      this.#lookbehind.set(buffer.subarray(position));
      this.#lookbehindSize = buffer.length - position;
    }

    return buffer.length;
  }

  #matchPattern(buffer, position, length) {
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

  get matches() {
    return this.#matches;
  }

  static #table(buffer) {
    const table = new Uint8Array(256).fill(buffer.length);
    const length = buffer.length - 1;

    for (let i = 0; i !== length; ++i) {
      table[buffer[i]] = length - i;
    }

    return table;
  }
};

export { Match };

const bufferFrom = globalThis.process?.versions?.node
  ? globalThis.Buffer.from
  : (string) => {
      const buffer = new Uint8Array(string.length);

      for (let i = 0; i !== string.length; ++i) {
        buffer[i] = string.charCodeAt(i);
      }

      return buffer;
    };

const bufferCompare = (buffer1, index1, buffer2, index2, length) => {
  for (let i = 0; i !== length; ++i) {
    if (buffer1[index1 + i] !== buffer2[index2 + i]) {
      return false;
    }
  }

  return true;
};

const Match = class {
  #matches = 0;
  #bufferIndex = 0;
  #lookbehindSize = 0;
  #lookbehind;
  #skip;
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
      throw new TypeError("Callback must be a Function");
    }

    if (typeof pattern !== "string") {
      throw new TypeError("Pattern must be a string");
    }

    if (!pattern.length || pattern.length >= 257) {
      throw new RangeError("Pattern length must be between 1 and 256");
    }

    this.#callback = callback;
    this.#pattern = bufferFrom(pattern);
    this.#skip = Match.#skipTable(this.#pattern);
    this.#lookbehind = new Uint8Array(this.#pattern.length - 1);
  }

  reset() {
    this.#matches = 0;
    this.#bufferIndex = 0;
    this.#lookbehindSize = 0;
  }

  destroy() {
    if (this.#lookbehindSize) {
      this.#callback(false, this.#lookbehind, null, 0, this.#lookbehindSize);
    }

    this.reset();
  }

  write(chunk) {
    if (!(chunk instanceof Uint8Array)) {
      chunk = bufferFrom(String(chunk));
    }

    this.#bufferIndex = 0;
    let result = -1;

    do {
      result = this.#search(chunk);
    } while (result !== chunk.length);

    return result;
  }

  #search(buffer) {
    let index = -this.#lookbehindSize;
    const patternLastCharIndex = this.#pattern.length - 1;
    const end = buffer.length - this.#pattern.length;

    if (index < 0) {
      while (index < 0 && index <= end) {
        const nextIndex = index + patternLastCharIndex;
        const char =
          nextIndex < 0
            ? this.#lookbehind[this.#lookbehindSize + nextIndex]
            : buffer[nextIndex];

        if (
          char === this.#pattern[patternLastCharIndex] &&
          this.#matchPattern(buffer, index, patternLastCharIndex)
        ) {
          ++this.#matches;
          this.#lookbehindSize = 0;

          if (index > 0) {
            this.#callback(
              true,
              this.#lookbehind,
              null,
              0,
              this.#lookbehindSize + index,
            );
          } else {
            this.#callback(true, null, null, 0, 0);
          }

          this.#bufferIndex = index + this.#pattern.length;

          return this.#bufferIndex;
        }

        index += this.#skip[char];
      }

      while (
        index < 0 &&
        !this.#matchPattern(buffer, index, buffer.length - index)
      ) {
        ++index;
      }

      if (index < 0) {
        const bytesToCutOff = this.#lookbehindSize + index;

        if (bytesToCutOff > 0) {
          this.#callback(false, this.#lookbehind, null, 0, bytesToCutOff);
        }

        this.#lookbehindSize -= bytesToCutOff;
        this.#lookbehind.set(this.#lookbehind.subarray(bytesToCutOff));
        this.#lookbehind.set(buffer, this.#lookbehindSize);
        this.#lookbehindSize += buffer.length;
        this.#bufferIndex = buffer.length;

        return this.#bufferIndex;
      }

      this.#callback(false, this.#lookbehind, null, 0, this.#lookbehindSize);

      this.#lookbehindSize = 0;
    }

    index += this.#bufferIndex;

    while (index <= end) {
      const char = buffer[index + patternLastCharIndex];

      if (
        char === this.#pattern[patternLastCharIndex] &&
        buffer[index] === this.#pattern[0] &&
        bufferCompare(this.#pattern, 0, buffer, index, patternLastCharIndex)
      ) {
        ++this.#matches;

        if (index > 0) {
          this.#callback(true, null, buffer, this.#bufferIndex, index);
        } else {
          this.#callback(true, null, null, 0, 0);
        }

        this.#bufferIndex = index + this.#pattern.length;

        return this.#bufferIndex;
      }

      index += this.#skip[char];
    }

    while (
      index < buffer.length &&
      (buffer[index] !== this.#pattern[0] ||
        !bufferCompare(buffer, index, this.#pattern, 0, buffer.length - index))
    ) {
      ++index;
    }

    if (index < buffer.length) {
      this.#lookbehind.set(buffer.subarray(index));
      this.#lookbehindSize = buffer.length - index;
    }

    if (index > 0) {
      this.#callback(
        false,
        null,
        buffer,
        this.#bufferIndex,
        index < buffer.length ? index : buffer.length,
      );
    }

    this.#bufferIndex = buffer.length;

    return this.#bufferIndex;
  }

  #matchPattern(buffer, index, length) {
    for (let i = 0; i < length; ++i) {
      const char =
        index < 0
          ? this.#lookbehind[this.#lookbehindSize + index]
          : buffer[index];

      if (char !== this.#pattern[i]) {
        return false;
      }

      ++index;
    }

    return true;
  }

  get matches() {
    return this.#matches;
  }

  static #skipTable(buffer) {
    const skipTable = new Uint8Array(256).fill(buffer.length);

    for (let i = 0, lastIndex = buffer.length - 1; i !== lastIndex; ++i) {
      skipTable[buffer[i]] = lastIndex - i;
    }

    return skipTable;
  }
};

export { Match };

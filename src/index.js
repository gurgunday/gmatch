const bufferFrom = (string) => {
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
    this.#bufferIndex = 0;
    this.#matches = 0;
  }

  destroy() {
    if (this.#lookbehindSize) {
      this.#callback(false, 0, this.#lookbehindSize, this.#lookbehind, null);
    }

    this.reset();
  }

  write(chunk) {
    const buffer = chunk instanceof Uint8Array ? chunk : this.#from(`${chunk}`);
    this.#bufferIndex = 0;

    while (this.#bufferIndex !== buffer.length) {
      this.#bufferIndex = this.#search(buffer);
    }

    return this.#bufferIndex;
  }

  #search(buffer) {
    const patternLastCharIndex = this.#pattern.length - 1;
    const patternLastChar = this.#pattern[patternLastCharIndex];
    const end = buffer.length - this.#pattern.length;
    let index = -this.#lookbehindSize;

    if (index < 0) {
      while (index < 0 && index <= end) {
        const char = buffer[index + patternLastCharIndex];

        if (
          char === patternLastChar &&
          this.#matchPattern(buffer, index, patternLastCharIndex)
        ) {
          ++this.#matches;
          this.#callback(true, 0, 0, null, null);
          this.#lookbehindSize = 0;
          this.#bufferIndex = index + this.#pattern.length;
          return this.#bufferIndex;
        }

        index += this.#skip[char];
      }

      if (index < 0) {
        const bytesToCutOff = this.#lookbehindSize + index;

        if (bytesToCutOff > 0) {
          this.#callback(false, 0, bytesToCutOff, this.#lookbehind, null);
        }

        this.#lookbehind.set(this.#lookbehind.subarray(bytesToCutOff));
        this.#lookbehind.set(buffer, this.#lookbehindSize - bytesToCutOff);
        this.#lookbehindSize += buffer.length;
        this.#bufferIndex = buffer.length;
        return this.#bufferIndex;
      }

      this.#callback(false, 0, this.#lookbehindSize, this.#lookbehind, null);
      this.#lookbehindSize = 0;
    }

    index += this.#bufferIndex;

    while (index <= end) {
      const char = buffer[index + patternLastCharIndex];

      if (
        char === patternLastChar &&
        bufferCompare(this.#pattern, 0, buffer, index, patternLastCharIndex)
      ) {
        ++this.#matches;

        if (index) {
          this.#callback(true, this.#bufferIndex, index, null, buffer);
        } else {
          this.#callback(true, 0, 0, null, null);
        }

        this.#bufferIndex = index + this.#pattern.length;
        return this.#bufferIndex;
      }

      index += this.#skip[char];
    }

    if (index < buffer.length) {
      this.#lookbehind.set(buffer.subarray(index));
      this.#lookbehindSize = buffer.length - index;

      if (index) {
        this.#callback(false, this.#bufferIndex, index, null, buffer);
      }
    } else {
      this.#callback(false, this.#bufferIndex, buffer.length, null, buffer);
    }

    this.#bufferIndex = buffer.length;
    return this.#bufferIndex;
  }

  #matchPattern(buffer, index, length) {
    for (let i = 0; i !== length; ++i) {
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

  static #table(buffer) {
    const table = new Uint8Array(256).fill(buffer.length);
    const bufferLastCharIndex = buffer.length - 1;

    for (let i = 0; i !== bufferLastCharIndex; ++i) {
      table[buffer[i]] = bufferLastCharIndex - i;
    }

    return table;
  }
};

export { Match };

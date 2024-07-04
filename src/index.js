"use strict";

const { Writable } = require("node:stream");
const { Buffer } = require("node:buffer");

const Match = class extends Writable {
  /**
   * @param {string} pattern - The pattern to search for.
   * @param {object} [options] - The options for the Writable stream.
   * @throws {TypeError} - If the pattern is not a string.
   * @throws {RangeError} - If the pattern is not between 1 and 256 bytes.
   */
  constructor(pattern, options) {
    if (typeof pattern !== "string") {
      throw new TypeError("Pattern must be a string");
    }

    if (pattern.length === 0 || pattern.length >= 257) {
      throw new RangeError("Pattern must be between 1 and 256 bytes");
    }

    super(options);
    this.pattern = Buffer.from(pattern);
    this.table = Match.buildTable(256, this.pattern);
    this.buffer = Buffer.alloc(0);
    this.processedBytes = 0;
  }

  static buildTable(size, pattern) {
    const patternLength = pattern.length;
    const table = new Uint8Array(size).fill(patternLength + 1);

    for (let i = 0; i < patternLength; ++i) {
      table[pattern[i]] = patternLength - i;
    }

    return table;
  }

  _write(chunk, encoding, callback) {
    if (!chunk.length) {
      callback();
      return;
    }

    this.buffer = Buffer.concat([this.buffer, chunk]);
    this._search();

    callback();
  }

  _final(callback) {
    this.processedBytes += this.buffer.length;
    this.buffer = null;

    callback();
  }

  _search() {
    const { buffer, pattern } = this;
    const bufferLength = buffer.length;
    const patternLength = pattern.length;

    if (bufferLength < patternLength) {
      return;
    }

    const { table, processedBytes } = this;
    const difference = bufferLength - patternLength;
    const patternLastIndex = patternLength - 1;

    for (let i = 0; i <= difference; ) {
      let j = patternLastIndex;

      while (j >= 0 && pattern[j] === buffer[i + j]) {
        --j;
      }

      if (j < 0) {
        this.emit("match", processedBytes + i);
        i += patternLength;
        continue;
      }

      i += table[buffer[patternLength + i]];
    }

    this.processedBytes += difference + 1;
    this.buffer =
      patternLength === 1
        ? Buffer.alloc(0) // No need to keep the buffer if the pattern is a single byte
        : buffer.subarray(-patternLastIndex); // Keep the last ${patternLength - 1} bytes for potential match
  }
};

module.exports.Match = Match;

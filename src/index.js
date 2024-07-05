"use strict";

const { Writable } = require("node:stream");
const { Buffer } = require("node:buffer");

const Match = class extends Writable {
  /**
   * @param {string} pattern - The pattern to search for.
   * @param {object} [options] - The options for the Writable stream.
   * @throws {TypeError} - If the pattern is not a string.
   * @throws {RangeError} - If the pattern length is not in the range [1, 256].
   */
  constructor(pattern, options) {
    if (typeof pattern !== "string") {
      throw new TypeError("Pattern must be a string");
    }

    if (pattern.length === 0 || pattern.length >= 257) {
      throw new RangeError("Pattern must be between 1 and 256 bytes");
    }

    super(options);
    this.processedBytes = 0;
    this.buffer = Buffer.alloc(0);
    this.pattern = Buffer.from(pattern);
    this.table = Match.buildTable(this.pattern);
  }

  static buildTable(pattern) {
    const patternLength = pattern.length;
    const table = new Uint8Array(256).fill(patternLength + 1);

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
    const difference = bufferLength - patternLength;

    if (difference < 0) {
      return;
    }

    const { table, processedBytes } = this;
    const patternLastIndex = patternLength - 1;

    for (let i = 0; i <= difference; ) {
      let j = patternLastIndex;

      while (j >= 0 && buffer[i + j] === pattern[j]) {
        --j;
      }

      if (j < 0) {
        this.emit("match", processedBytes + i);
        i += patternLength;
        continue;
      }

      i += table[buffer[patternLength + i]];
    }

    this.buffer =
      patternLength === 1
        ? Buffer.alloc(0) // No need to keep the buffer if the pattern is a single byte
        : buffer.subarray(-patternLastIndex); // Keep the last `patternLength - 1` bytes for potential future matches
    this.processedBytes += difference + 1;
  }
};

module.exports.Match = Match;

"use strict";

const { Writable } = require("node:stream");
const { Buffer } = require("node:buffer");

/**
 * Uses BMHS2 algorithm to search for a pattern in a stream of data.
 */
const Match = class extends Writable {
  /**
   * @param {string} pattern - The pattern to search for.
   * @param {object} [options] - The options for the Writable stream.
   */
  constructor(pattern, options) {
    if (typeof pattern !== "string") {
      throw new TypeError("Pattern must be a string");
    }

    if (pattern.length <= 1 || pattern.length >= 257) {
      throw new RangeError("Pattern length must be between 1 and 257");
    }

    super(options);
    this.pattern = Buffer.from(pattern);
    this.buffer = Buffer.alloc(0);
    this.table = Match.buildTable(256, this.pattern);
    this.totalBytesProcessed = 0;
  }

  static buildTable(size, pattern) {
    const patternLength = pattern.length;
    const table = new Array(size);

    for (let i = 0; i < size; ++i) {
      table[i] = new Uint8Array(size).fill(patternLength);
    }

    for (let i = 0; i < patternLength - 1; ++i) {
      table[pattern[i]][pattern[i + 1]] = patternLength - i - 1;
    }

    return table;
  }

  _write(chunk, encoding, callback) {
    const patternLength = this.pattern.length;
    this.buffer = Buffer.concat([this.buffer, chunk]);

    this._search();

    if (this.buffer.length > patternLength - 1) {
      const processedLength = this.buffer.length - (patternLength - 1);
      this.totalBytesProcessed += processedLength;
      this.buffer = this.buffer.subarray(-patternLength + 1);
    }

    callback();
  }

  _final(callback) {
    this._search();

    this.totalBytesProcessed += this.buffer.length;

    this.buffer = null;

    callback();
  }

  _search() {
    const patternLength = this.pattern.length;
    const lastIndexOfPattern = patternLength - 1;
    let i = 0;

    while (i <= this.buffer.length - patternLength) {
      let j = lastIndexOfPattern;

      while (j >= 0 && this.pattern[j] === this.buffer[i + j]) {
        j--;
      }

      if (j < 0) {
        const matchPosition = this.totalBytesProcessed + i;
        this.emit("match", matchPosition);
        i += patternLength;
      } else {
        i +=
          this.table[this.buffer[i + lastIndexOfPattern]][
            this.buffer[i + patternLength]
          ];
      }
    }
  }
};

module.exports.Match = Match;

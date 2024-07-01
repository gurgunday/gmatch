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

    if (pattern.length === 0 || pattern.length >= 257) {
      throw new RangeError("Pattern length must be between 0 and 257");
    }

    super(options);
    this.pattern = Buffer.from(pattern);
    this.buffer = Buffer.alloc(0);
    this.table = Match.buildTable(256, this.pattern);
    this.totalBytesProcessed = 0;
  }

  static buildTable(size, pattern) {
    const patternLength = pattern.length;
    const table = new Uint8Array(size).fill(patternLength);

    for (let i = 0; i < patternLength - 1; ++i) {
      table[pattern[i]] = patternLength - 1 - i;
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
      this.buffer =
        patternLength === 1
          ? Buffer.alloc(0)
          : this.buffer.subarray(-patternLength + 1);
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
    let i = 0;

    while (i <= this.buffer.length - patternLength) {
      let j = patternLength - 1;

      while (j >= 0 && this.pattern[j] === this.buffer[i + j]) {
        j--;
      }

      if (j < 0) {
        const matchPosition = this.totalBytesProcessed + i;
        this.emit("match", matchPosition);
        i += patternLength;
      } else {
        i += this.table[this.buffer[patternLength - 1 + i]];
      }
    }
  }
};

module.exports.Match = Match;

"use strict";

const { Writable } = require("node:stream");
const { Buffer } = require("node:buffer");

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
    this.totalBytes = 0;
  }

  static buildTable(size, pattern) {
    const patternLength = pattern.length;
    const patternLastIndex = patternLength - 1;
    const table = new Uint8Array(size).fill(patternLength);

    for (let i = 0; i < patternLastIndex; ++i) {
      table[pattern[i]] = patternLastIndex - i;
    }

    return table;
  }

  _write(chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    this._search();

    if (this.buffer.length > this.pattern.length - 1) {
      this.totalBytes += this.buffer.length - (this.pattern.length - 1);
      this.buffer =
        this.pattern.length === 1
          ? Buffer.alloc(0)
          : this.buffer.subarray(-this.pattern.length + 1);
    }

    callback();
  }

  _final(callback) {
    this._search();

    this.totalBytes += this.buffer.length;

    this.buffer = null;

    callback();
  }

  _search() {
    const { table, buffer, pattern, totalBytes } = this;
    const bufferLength = buffer.length;
    const patternLength = pattern.length;
    let i = 0;

    while (i <= bufferLength - patternLength) {
      let j = patternLength - 1;

      while (j >= 0 && pattern[j] === buffer[i + j]) {
        j--;
      }

      if (j < 0) {
        const matchPosition = totalBytes + i;
        this.emit("match", matchPosition);
        i += patternLength;
      } else {
        i += table[buffer[patternLength - 1 + i]];
      }
    }
  }
};

module.exports.Match = Match;

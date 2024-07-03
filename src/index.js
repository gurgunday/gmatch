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
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this._search();

    if (this.buffer.length >= this.pattern.length) {
      this.processedBytes += this.buffer.length - (this.pattern.length - 1);
      this.buffer =
        this.pattern.length === 1
          ? Buffer.alloc(0)
          : this.buffer.subarray(-(this.pattern.length - 1));
    }

    callback();
  }

  _final(callback) {
    this._search();

    this.processedBytes += this.buffer.length;
    this.buffer = null;

    callback();
  }

  _search() {
    const { table, buffer, pattern, processedBytes } = this;
    const bufferLength = buffer.length;
    const patternLength = pattern.length;
    const patternLastIndex = patternLength - 1;
    let i = 0;

    while (i <= bufferLength - patternLength) {
      let j = patternLastIndex;

      while (j >= 0 && pattern[j] === buffer[i + j]) {
        --j;
      }

      if (j < 0) {
        const matchPosition = processedBytes + i;
        this.emit("match", matchPosition);
        i += patternLength;
      } else {
        i += table[buffer[i + patternLength]];
      }
    }
  }
};

module.exports.Match = Match;

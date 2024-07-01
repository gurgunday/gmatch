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
    this.patternLength = this.pattern.length;
    this.totalBytesProcessed = 0;
    this.buffer = Buffer.alloc(0);
    this.allMatches = [];
    this.currentMatches = [];
    this.table = this._buildTable(256);
  }

  _buildTable(size) {
    const table = new Array(size);

    for (let i = 0; i < size; ++i) {
      table[i] = new Uint32Array(size);
      table[i].fill(this.patternLength);
    }

    for (let i = 0; i < this.patternLength - 1; ++i) {
      table[this.pattern[i]][this.pattern[i + 1]] = this.patternLength - i - 1;
    }

    for (let i = 0; i < size; ++i) {
      if (table[this.pattern[0]][i] === this.patternLength + 1) {
        table[this.pattern[0]][i] = this.patternLength;
      }
    }

    return table;
  }

  _write(chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    this._search();

    if (this.buffer.length > this.patternLength - 1) {
      const processedLength = this.buffer.length - (this.patternLength - 1);
      this.totalBytesProcessed += processedLength;
      this.buffer = this.buffer.subarray(-this.patternLength + 1);
    }

    callback();
  }

  _final(callback) {
    this._search();

    this.totalBytesProcessed += this.buffer.length;

    this.buffer = Buffer.alloc(0);

    callback();
  }

  _search() {
    let i = 0;

    while (i <= this.buffer.length - this.patternLength) {
      let j = this.patternLength - 1;

      while (j >= 0 && this.pattern[j] === this.buffer[i + j]) {
        j--;
      }

      if (j < 0) {
        const matchPosition = this.totalBytesProcessed + i;
        this.allMatches.push(matchPosition);
        this.emit("match", matchPosition);
        i += this.patternLength;
      } else {
        i +=
          this.table[this.buffer[i + this.patternLength - 1]][
            this.buffer[i + this.patternLength]
          ];
      }
    }
  }
};

module.exports.Match = Match;

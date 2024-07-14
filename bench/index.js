/* eslint-disable unicorn/no-array-push-push */

"use strict";

const { Bench } = require("tinybench");
const { Match } = require("../src/index.js");
const StreamSearch = require("streamsearch");

const bench = new Bench({ time: 2500 });
const pattern = "example";
const longText =
  `This is a long text with multiple occurrences of the word example. ` +
  `It repeats the word example several times to ensure we have enough ${"data for the benchmark. Here's another example.".repeat(
    1000,
  )}`;

let gmatchMatches;
let streamsearchMatches;

bench
  .add("gmatch", () => {
    return new Promise((resolve) => {
      const search = new Match(pattern);
      const matches = [];
      search.on("match", (m) => {
        return matches.push(m);
      });
      search.write(longText);
      search.write(longText);
      search.write(longText);
      search.end(() => {
        gmatchMatches = matches.length;
        resolve(matches);
      });
    });
  })
  .add("streamsearch", () => {
    return new Promise((resolve) => {
      const matches = [];
      const search = new StreamSearch(pattern, (isMatch, data, start) => {
        if (isMatch) {
          matches.push(start);
        }
      });
      search.push(longText);
      search.push(longText);
      search.push(longText);
      streamsearchMatches = matches.length;
      resolve(matches);
    });
  });

(async () => {
  await bench.warmup();
  await bench.run();

  console.table(bench.table());
  console.warn("gmatch matches:", gmatchMatches);
  console.warn("streamsearch matches:", streamsearchMatches);
})();

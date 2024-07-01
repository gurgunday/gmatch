"use strict";

const { Match } = require("../src/index");
const StreamSearch = require("streamsearch");
const { Bench } = require("tinybench");

const bench = new Bench({ time: 1000 });

const pattern = "example";
const longText =
  `This is a long text with multiple occurrences of the word example. ` +
  `It repeats the word example several times to ensure we have enough ${"data for the benchmark. Here's another example.".repeat(
    1000,
  )}`;

let gmatchMatches;
let streamsearchMatches;

bench
  .add("gmatch", async () => {
    return new Promise((resolve) => {
      const search = new Match(pattern);
      const matches = [];
      search.on("match", (m) => {
        return matches.push(m);
      });
      search.write(longText, () => {
        search.end(() => {
          gmatchMatches = matches.length;
          resolve(matches);
        });
      });
    });
  })
  .add("streamsearch", async () => {
    return new Promise((resolve) => {
      const matches = [];
      const search = new StreamSearch(
        Buffer.from(pattern),
        (isMatch, data, start) => {
          if (isMatch) {
            matches.push(start);
          }
        },
      );
      search.push(Buffer.from(longText), null);
      streamsearchMatches = matches.length;
      resolve(matches);
    });
  });

bench
  .run()
  .then(() => {
    console.table(bench.table());
    console.warn("gmatch matches:", gmatchMatches);
    console.warn("streamsearch matches:", streamsearchMatches);
  })
  .catch(console.error);

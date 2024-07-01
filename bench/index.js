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
      resolve(matches);
    });
  });

bench
  .run()
  .then(() => {
    console.table(bench.table());
  })
  .catch(console.error);

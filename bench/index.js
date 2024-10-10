/* eslint-disable unicorn/no-array-push-push */
"use strict";

const { Match } = require("../src/index.js");
const StreamSearch = require("streamsearch");
const { Bench } = require("tinybench");

(async () => {
  const bench = new Bench({ time: 5000 });
  const pattern = "exampleexampleexampleexampleexampleexample";
  const longText =
    `This is a long text with multiple occurrences of the word example. ` +
    `It repeats the word exampleexampleexampleexampleexampleexample several times to ensure we have enough ${"data for the benchmark. Here's another exampleexampleexampleexampleexampleexample.".repeat(
      5,
    )}`;
  let gmatchMatches;
  let streamsearchMatches;

  bench
    .add("gmatch", () => {
      const matches = [];
      const search = new Match(
        pattern,
        (isMatch, data, start, end) => {
          if (isMatch) {
            matches.push(end);
          }
        },
        Buffer.from,
      );

      search.write("exampleexampleexampleexample");
      search.write("fexampleexampleexampleexampleexample");
      search.write(
        "exampleexampleexampleexampleexampleexampleexampleexampleexampleexampleexampleexample",
      );
      search.write("exampleexampleexampleexample");
      search.write("fexampleexampleexampleexampleexample");
      search.write(
        "exampleexampleexampleexampleexampleexampleexampleexampleexampleexampleexampleexample",
      );
      search.write(longText);
      search.write(pattern);

      gmatchMatches = matches.length;
    })
    .add("streamsearch", () => {
      const matches = [];
      const search = new StreamSearch(pattern, (isMatch, data, start, end) => {
        if (isMatch) {
          matches.push(end);
        }
      });

      search.push("exampleexampleexampleexample");
      search.push("fexampleexampleexampleexampleexample");
      search.push(
        "exampleexampleexampleexampleexampleexampleexampleexampleexampleexampleexampleexample",
      );
      search.push("exampleexampleexampleexample");
      search.push("fexampleexampleexampleexampleexample");
      search.push(
        "exampleexampleexampleexampleexampleexampleexampleexampleexampleexampleexampleexample",
      );
      search.push(longText);
      search.push(pattern);

      streamsearchMatches = matches.length;
    });

  await bench.warmup();
  await bench.run();

  console.table(bench.table());
  console.log("gmatch matches:", gmatchMatches);
  console.log("streamsearch matches:", streamsearchMatches);
})();

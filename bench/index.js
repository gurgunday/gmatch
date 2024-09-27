/* eslint-disable unicorn/no-array-push-push */

import { Match } from "../src/index.js";
import StreamSearch from "streamsearch";
import { Bench } from "tinybench";
import { Buffer } from "node:buffer";

const bench = new Bench({ time: 5000 });
const pattern = "exampleexampleexampleexampleexampleexample";
const longText =
  `This is a long text with multiple occurrences of the word example. ` +
  `It repeats the word example several times to ensure we have enough ${"data for the benchmark. Here's another exampleexampleexampleexampleexampleexample.".repeat(
    10,
  )}`;

let gmatchMatches;
let streamsearchMatches;

bench
  .add("gmatch", () => {
    const matches = [];
    const search = new Match(
      pattern,
      (isMatch, data, start) => {
        if (isMatch) {
          matches.push(start);
        }
      },
      Buffer.from,
    );

    search.write("exampleexampleexampleexampleexample");
    search.write("exampleexampleexampgeexampleexampleexample");
    search.write("exampleexampleexampgeexampleexampleexample");
    search.write(longText);
    search.write(pattern);

    gmatchMatches = matches.length;
  })
  .add("streamsearch", () => {
    const matches = [];
    const search = new StreamSearch(pattern, (isMatch, data, start) => {
      if (isMatch) {
        matches.push(start);
      }
    });

    search.push("exampleexampleexampleexampleexample");
    search.push("exampleexampleexampgeexampleexampleexample");
    search.push("exampleexampleexampgeexampleexampleexample");
    search.push(longText);
    search.push(pattern);

    streamsearchMatches = matches.length;
  });

(async () => {
  await bench.warmup();
  await bench.run();

  globalThis.console.table(bench.table());
  globalThis.console.warn("gmatch matches:", gmatchMatches);
  globalThis.console.warn("streamsearch matches:", streamsearchMatches);
})();

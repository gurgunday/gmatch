/* eslint-disable unicorn/no-array-push-push */
import { Match } from "../src/index.js";
import StreamSearch from "streamsearch";
import { Bench } from "tinybench";
import { Buffer } from "node:buffer";

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
      (isMatch, data, start) => {
        if (isMatch) {
          matches.push(start);
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
    const search = new StreamSearch(pattern, (isMatch, data, start) => {
      if (isMatch) {
        matches.push(start);
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

globalThis.console.table(bench.table());
globalThis.console.log("gmatch matches:", gmatchMatches);
globalThis.console.log("streamsearch matches:", streamsearchMatches);

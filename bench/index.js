/* eslint-disable unicorn/no-array-push-push */
import { Bench } from "tinybench";

import StreamSearch from "streamsearch";
import { Match } from "../src/index.js";

const bench = new Bench({ time: 2500 });
const pattern = "exampleexampleexampleexampleexampleexampleexample";
const longText =
  `This is a long text wiexampleexampleexampleexampleexampleexampleexampleth multiple asdasdoccurrences of theltiple asdasdoccurrences of theltiple asdasdoccurrences of theltiple asdasdoccurrences of the word example. ` +
  `It repeats the word example several times to ensure we have enough ${"data for the benchmark. Here's another example.".repeat(
    10,
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
      search.write("great");
      search.write(longText);
      gmatchMatches = matches.length;
      resolve(matches);
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
      search.push("great");
      search.push(longText);
      streamsearchMatches = matches.length;
      resolve(matches);
    });
  });

await bench.warmup();
await bench.run();

console.table(bench.table());
console.warn("gmatch matches:", gmatchMatches);
console.warn("streamsearch matches:", streamsearchMatches);

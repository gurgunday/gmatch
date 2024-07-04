streamin**gmatch** lets you search a pattern in a stream, as fast as JavaScriptly possible.

## Installation

```sh
npm i gmatch
```

## API

### `Match`

The `Match` class extends the Node.js `Writable` stream and implements the BMHS pattern matching algorithm.

#### Events

- `'match'`: Emitted when a match is found. The event handler receives the position of the match as an argument.

## Usage

Here's a basic example of how to use the gmatch library:

```js
const { Match } = require("gmatch");
const fs = require("fs");

// Create a new Match instance
const matcher = new Match("example");

// Set up the match event handler
matcher.on("match", (position) => {
  console.log(`Match found at position: ${position}`);
});

// Pipe a readable stream to the matcher
fs.createReadStream("path/to/your/file").pipe(matcher);

// Handle the end of the stream
matcher.on("finish", () => {
  console.log("Finished processing the stream");
});
```

In this example, the `Match` instance searches for the pattern 'example' in the content of the file. Every time a match is found, it logs the position of the match.

## Advanced Usage

You can also use the `Match` class with other types of streams or manually write chunks to it:

```js
const { Match } = require("gmatch");

const matcher = new Match("pattern");

matcher.on("match", (position) => {
  console.log(`Match found at position: ${position}`);
});

matcher.write("Some text with a pattern in it");
matcher.write(" and more pattern here");

matcher.end();
```

This approach allows you to use gmatch with any source of data, not just file streams.

## Benchmarks

Here are the benchmark results comparing gmatch with streamsearch:

```sh
┌─────────┬────────────────┬─────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Task Name      │ ops/sec │ Average Time (ns)  │ Margin   │ Samples │
├─────────┼────────────────┼─────────┼────────────────────┼──────────┼─────────┤
│ 0       │ 'gmatch'       │ '4,686' │ 213380.5135250256  │ '±3.93%' │ 4695    │
│ 1       │ 'streamsearch' │ '3,862' │ 258882.21589438233 │ '±5.35%' │ 3863    │
└─────────┴────────────────┴─────────┴────────────────────┴──────────┴─────────┘
gmatch matches: 1002
streamsearch matches: 1002
```

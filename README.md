streamin**gmatch** lets you search for a pattern in a stream, as fast as JavaScriptly possible.

`string.indexOf()` is fine, but what if the data is coming in chunks and a search needs to be done with constant memory usage?

![gmatch.gif](./gmatch.gif)

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
const fs = require("node:fs");

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

You can also use the `Match` class with other types of streams or manually write chunks to it:

```js
const { Match } = require("gmatch");

const matcher = new Match("pattern");

matcher.on("match", (position) => {
  console.log(`Match found at position: ${position}`);
});

matcher.write("Some text with a pattern in it and more pat");
matcher.write("tern and more pattern here");

matcher.end();
```

## Benchmarks

Here are the benchmark results comparing gmatch with streamsearch:

```sh
┌─────────┬────────────────┬──────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Task Name      │ ops/sec  │ Average Time (ns)  │ Margin   │ Samples │
├─────────┼────────────────┼──────────┼────────────────────┼──────────┼─────────┤
│ 0       │ 'gmatch'       │ '15,640' │ 63935.284760759554 │ '±0.46%' │ 39103   │
│ 1       │ 'streamsearch' │ '9,728'  │ 102786.26217982951 │ '±0.13%' │ 24323   │
└─────────┴────────────────┴──────────┴────────────────────┴──────────┴─────────┘
gmatch matches: 1002
streamsearch matches: 1002
```

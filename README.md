streamin**gmatch** lets you search a pattern in a stream.

## Installation

```sh
npm i gmatch
```

## API Reference

### `Match` class

The `Match` class extends the Node.js `Writable` stream and implements the BMHS pattern matching algorithm.

#### Constructor

```js
new Match(pattern[, options])
```

- `pattern` (string): The pattern to search for.
- `options` (object, optional): Options for the Writable stream.

Throws:

- `TypeError`: If the pattern is not a string.
- `RangeError`: If the pattern length is 0 or greater than or equal to 257.

#### Events

- `'match'`: Emitted when a match is found. The event handler receives the position of the match as an argument.

#### Methods

The `Match` class inherits all methods from the `Writable` stream class.

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

As shown in the benchmark results, gmatch performs approximately 21% faster than streamsearch in terms of operations per second.

The benchmark script is located under `bench/index.js`. Users can run their own benchmarks to verify these results or test performance in their specific use cases.

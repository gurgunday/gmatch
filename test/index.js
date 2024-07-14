"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Buffer } = require("node:buffer");
const { Match: StreamingSearch } = require("../src/index.js");

test("constructor throws error for invalid pattern", () => {
  assert.throws(
    () => {
      return new StreamingSearch("");
    },
    {
      name: "RangeError",
    },
  );
  assert.throws(
    () => {
      return new StreamingSearch(123);
    },
    {
      name: "TypeError",
    },
  );
});

test("single write with immediate match", async () => {
  const search = new StreamingSearch("test");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write("This is a test", () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, [10]);
});

test("single write with a match (pattern length is 1)", async () => {
  const search = new StreamingSearch("t");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write(`test and ${"tttt"}`, () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, [0, 3, 9, 10, 11, 12]);
});

test("single write with a match (pattern length is 256)", async () => {
  const search = new StreamingSearch("t".repeat(256));
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write(`test and ${"t".repeat(256)}`, () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, [9]);
});

test("multiple writes with matches", async () => {
  const search = new StreamingSearch("pattern");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write("This is a ");
    search.write("pattern and another patt");
    search.write("ern", () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, [10, 30]);
});

test("pattern spanning multiple chunks", async () => {
  const search = new StreamingSearch("split");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write("This is a sp");
    search.write("lit pattern", () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, [10]);
});

test("multiple matches in a single chunk", async () => {
  const search = new StreamingSearch("aa");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write("aabaabbaa", () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, [0, 3, 7]);
});

test("no matches", async () => {
  const search = new StreamingSearch("xyz");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write("This is a test without any matches", () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, []);
});

test("no matches /2", async () => {
  const search = new StreamingSearch("xyzxyz");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write("test", () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, []);
});

test("match at the end of stream", async () => {
  const search = new StreamingSearch("end");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write("This is the ");
    search.write("end", () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, [12]);
});

test("overlapping patterns", async () => {
  const search = new StreamingSearch("aa");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write("aaa", () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, [0]);
});

test("large input stream", async () => {
  const search = new StreamingSearch("needle");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  const largeHaystack = `${"hay".repeat(1000000)}needle${"hay".repeat(1000000)}`;

  await new Promise((resolve) => {
    const chunkSize = 1024;
    for (let i = 0; i < largeHaystack.length; i += chunkSize) {
      search.write(largeHaystack.slice(i, i + chunkSize));
    }
    search.end(resolve);
  });

  assert.deepEqual(matches, [3000000]);
});

test("empty writes", async () => {
  const search = new StreamingSearch("test");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write("");
    search.write("test");
    search.write("", () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, [0]);
});

test("short writes", () => {
  const search = new StreamingSearch("test");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  search.write("s");

  assert.deepEqual(matches, []);
  assert.equal(search.searchStartPosition, 0);

  search.write("sss");
  assert.equal(search.searchStartPosition, 1);
});

test("short writes /2", () => {
  const search = new StreamingSearch("test");
  assert.equal(search.pattern, "test");

  const matches = [];

  search.on("match", (m) => {
    return matches.push(m);
  });

  search.write("tes");

  assert.deepEqual(matches, []);
  assert.equal(search.searchStartPosition, 0);

  search.write("t");
  assert.equal(search.searchStartPosition, 4);

  search.write("t");
  assert.equal(search.searchStartPosition, 4);
  assert.equal(search.index, 0);
  assert.equal(search.count, 1);

  search.write("ttt");
  assert.equal(search.searchStartPosition, 5);
  assert.equal(search.index, 0);
  assert.equal(search.count, 1);
});

test("short writes /3", () => {
  const search = new StreamingSearch("test");
  assert.equal(search.pattern, "test");

  const matches = [];

  search.on("match", (m) => {
    return matches.push(m);
  });

  search.write("testy");
  assert.equal(search.searchStartPosition, 4);
  assert.equal(search.searchStartPosition, 4);
  assert.deepEqual(search.lookbehindSize, 1);
});

test("short writes /3", () => {
  const search = new StreamingSearch("testtesttesttesttesttesttesttesttest");
  assert.equal(search.pattern, "testtesttesttesttesttesttesttesttest");

  const matches = [];

  search.on("match", (m) => {
    return matches.push(m);
  });

  search.write("testtesttesttesttesttesttesttesttestwoahman");
  assert.equal(search.searchStartPosition, 36);
  assert.equal(search.lookbehindSize, 7);
  assert.equal(search.count, 1);
  assert.deepEqual(matches, [0]);
});

test("short writes /3", () => {
  const search = new StreamingSearch("testt");
  assert.equal(search.pattern, "testt");

  const matches = [];

  search.on("match", (m) => {
    return matches.push(m);
  });

  search.write("test");
  search.write("ttt");
  assert.equal(search.searchStartPosition, 5);
  assert.equal(search.lookbehindSize, 2);
  assert.equal(search.count, 1);
  assert.deepEqual(matches, [0]);
});

test("Buffer writes", async () => {
  const search = new StreamingSearch("test");
  const matches = [];
  search.on("match", (m) => {
    return matches.push(m);
  });

  await new Promise((resolve) => {
    search.write("");
    search.write("test");
    search.write(Buffer.from("test"));
    search.write("", () => {
      search.end(resolve);
    });
  });

  assert.deepEqual(matches, [0, 4]);
  assert.equal(search.searchStartPosition, 8);
  assert.equal(search.count, 2);
});

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Match: StreamingSearch } = require("../src/index.js");

test("constructor throws error for invalid pattern", () => {
  assert.throws(
    () => {
      return new StreamingSearch("", () => {});
    },
    {
      name: "RangeError",
    },
  );
  assert.throws(
    () => {
      return new StreamingSearch(123, () => {});
    },
    {
      name: "TypeError",
    },
  );
});

test("constructor throws error for invalid function", () => {
  assert.throws(
    () => {
      return new StreamingSearch("test", null);
    },
    {
      name: "TypeError",
    },
  );
});

test("single write with immediate match", () => {
  const matches = [];
  const search = new StreamingSearch("test", (index) => {
    matches.push(index);
  });

  search.write("This is a test");

  assert.deepEqual(matches, [10]);
});

test("single write with a match (pattern length is 1)", () => {
  const matches = [];
  const search = new StreamingSearch("t", (index) => {
    matches.push(index);
  });

  search.write("test and tttt");

  assert.deepEqual(matches, [0, 3, 9, 10, 11, 12]);
});

test("single write with a match (pattern length is 256)", () => {
  const matches = [];
  const search = new StreamingSearch("t".repeat(256), (index) => {
    matches.push(index);
  });

  search.write(`test and ${"t".repeat(256)}`);

  assert.deepEqual(matches, [9]);
});

test("multiple writes with matches", () => {
  const matches = [];
  const search = new StreamingSearch("pattern", (index) => {
    matches.push(index);
  });

  search.write("This is a ");
  search.write("pattern and another patt");
  search.write("ern");

  assert.deepEqual(matches, [10, 30]);
});

test("pattern spanning multiple chunks", () => {
  const matches = [];
  const search = new StreamingSearch("split", (index) => {
    matches.push(index);
  });

  search.write("This is a sp");
  search.write("lit pattern");

  assert.deepEqual(matches, [10]);
});

test("multiple matches in a single chunk", () => {
  const matches = [];
  const search = new StreamingSearch("aa", (index) => {
    matches.push(index);
  });

  search.write("aabaabbaa");

  assert.deepEqual(matches, [0, 3, 7]);
});

test("no matches", () => {
  const matches = [];
  const search = new StreamingSearch("xyz", (index) => {
    matches.push(index);
  });

  search.write("This is a test without any matches");

  assert.deepEqual(matches, []);
});

test("no matches /2", () => {
  const matches = [];
  const search = new StreamingSearch("xyzxyz", (index) => {
    matches.push(index);
  });

  search.write("test");

  assert.deepEqual(matches, []);
});

test("match at the end of stream", () => {
  const matches = [];
  const search = new StreamingSearch("end", (index) => {
    matches.push(index);
  });

  search.write("This is the ");
  search.write("end");

  assert.deepEqual(matches, [12]);
});

test("overlapping patterns", () => {
  const matches = [];
  const search = new StreamingSearch("aa", (index) => {
    matches.push(index);
  });

  search.write("aaa");

  assert.deepEqual(matches, [0]);
});

test("large input stream", () => {
  const matches = [];
  const search = new StreamingSearch("needle", (index) => {
    matches.push(index);
  });

  const largeHaystack = `${"hay".repeat(1000000)}needle${"hay".repeat(1000000)}`;

  for (let i = 0; i < largeHaystack.length; i += 1024) {
    search.write(largeHaystack.slice(i, i + 1024));
  }

  assert.deepEqual(matches, [3000000]);
});

test("empty writes", () => {
  const matches = [];
  const search = new StreamingSearch("test", (index) => {
    matches.push(index);
  });

  search.write("");
  search.write("test");
  search.write("");

  assert.deepEqual(matches, [0]);
});

test("short writes", () => {
  const matches = [];
  const search = new StreamingSearch("test", (index) => {
    matches.push(index);
  });

  search.write("s");

  assert.deepEqual(matches, []);
  assert.equal(search.searchStartPosition, 0);

  search.write("sss");
  assert.equal(search.searchStartPosition, 1);
});

test("short writes /2", () => {
  const matches = [];
  const search = new StreamingSearch("test", (index) => {
    matches.push(index);
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
  const matches = [];
  const search = new StreamingSearch("test", (index) => {
    matches.push(index);
  });

  search.write("testy");
  assert.equal(search.searchStartPosition, 4);
  assert.equal(search.index, 0);
  assert.equal(search.count, 1);
  assert.equal(search.lookbehindSize, 1);
});

test("short writes /4", () => {
  const matches = [];
  const search = new StreamingSearch(
    "testtesttesttesttesttesttesttesttest",
    (index) => {
      matches.push(index);
    },
  );

  search.write("testtesttesttesttesttesttesttesttestwoahman");
  assert.equal(search.searchStartPosition, 36);
  assert.equal(search.lookbehindSize, 7);
  assert.equal(search.count, 1);
  assert.deepEqual(matches, [0]);
});

test("short writes /5", () => {
  const matches = [];
  const search = new StreamingSearch("testt", (index) => {
    matches.push(index);
  });

  search.write("test");
  search.write("ttt");
  assert.equal(search.searchStartPosition, 5);
  assert.equal(search.lookbehindSize, 2);
  assert.equal(search.count, 1);
  assert.deepEqual(matches, [0]);
});

test("Buffer writes", () => {
  const matches = [];
  const search = new StreamingSearch("test", (index) => {
    matches.push(index);
  });

  assert.equal(search.pattern, "test");

  search.write("");
  search.write("test");
  search.write(Buffer.from("test"));
  search.write("");

  assert.deepEqual(matches, [0, 4]);
  assert.equal(search.searchStartPosition, 8);
  assert.equal(search.count, 2);
});

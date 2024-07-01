const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { Match: StreamingSearch } = require("..");

describe("StreamingSearch", () => {
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
      return matches.push(...m);
    });

    await new Promise((resolve) => {
      search.write("This is a test without any matches", () => {
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
});

import { Match } from "../src/index.js";
import { Buffer } from "node:buffer";
import { test } from "node:test";
import assert from "node:assert/strict";

test("Match constructor should create a Match instance with valid input", () => {
  const match = new Match("test", () => {});
  assert(match instanceof Match);
});

test("Match constructor should throw TypeError for non-function callback", () => {
  assert.throws(() => {
    return new Match("test", "not a function");
  }, TypeError);
});

test("Match constructor should throw TypeError for non-string pattern", () => {
  assert.throws(() => {
    return new Match(123, () => {});
  }, TypeError);
});

test("Match constructor should throw RangeError for empty pattern", () => {
  assert.throws(() => {
    return new Match("", () => {});
  }, RangeError);
});

test("Match constructor should throw RangeError for pattern longer than 256 characters", () => {
  const longPattern = "a".repeat(257);
  assert.throws(() => {
    return new Match(longPattern, () => {});
  }, RangeError);
});

test("reset method should reset internal state", () => {
  const match = new Match("test", () => {});
  match.write("test");
  assert.strictEqual(match.matches, 1);
  match.reset();
  assert.strictEqual(match.matches, 0);
});

test("destroy method should call callback with remaining data", (t, done) => {
  const match = new Match("test", (isMatch, start, end, lookbehind) => {
    if (!isMatch) {
      assert.strictEqual(end, 3);
      assert(lookbehind instanceof Uint8Array);
      assert.deepStrictEqual(lookbehind, new Uint8Array([116, 101, 115]));
      done();
    }
  });
  match.write("tes");
  match.destroy();
});

test("write method should find matches in a single write", (t, done) => {
  let matches = 0;
  const match = new Match("test", (isMatch) => {
    if (isMatch) {
      matches++;
    }
    if (matches === 2) {
      done();
    }
  });
  match.write("this is a test string with another test");
});

test("write method should find matches across multiple writes", (t, done) => {
  let matches = 0;
  const match = new Match("test", (isMatch) => {
    if (isMatch) {
      matches++;
    }
    if (matches === 2) {
      done();
    }
  });
  match.write("this is a te");
  match.write("st string with another te");
  match.write("st");
});

test("write method should handle Uint8Array input", (t, done) => {
  const match = new Match("test", (isMatch) => {
    if (isMatch) {
      done();
    }
  });
  match.write(new Uint8Array(Buffer.from("this is a test")));
});

test("matches property should return correct number of matches", () => {
  const match = new Match("test", () => {});
  match.write("test test test");
  assert.strictEqual(match.matches, 3);
});

test("should handle pattern at the beginning of input", (t, done) => {
  const match = new Match("test", (isMatch, start, end) => {
    if (isMatch) {
      assert.strictEqual(start, 0);
      assert.strictEqual(end, 0);
      done();
    }
  });
  match.write("test string");
});

test("should handle pattern at the end of input", (t, done) => {
  const match = new Match("test", (isMatch, start, end) => {
    if (isMatch) {
      assert.strictEqual(start, 0);
      assert.strictEqual(end, 7);
      done();
    }
  });
  match.write("string test");
});

test("should handle overlapping patterns", (t, done) => {
  let matches = 0;
  const match = new Match("aa", (isMatch) => {
    if (isMatch) {
      matches++;
    }
    if (matches === 2) {
      done();
    }
  });
  match.write("aaaa");
});

test("should handle unicode characters", (t, done) => {
  const match = new Match("🚀", (isMatch) => {
    if (isMatch) {
      done();
    }
  });
  match.write("Hello 🌍🚀");
});

test("bufferCompare false", (t, done) => {
  const match = new Match("great", (isMatch) => {
    if (!isMatch) {
      done();
    }
  });
  match.write("gleat");
});

test("lookbehind match", (t, done) => {
  let call = 0;

  const match = new Match("great", () => {
    ++call;
    if (call === 3) {
      done();
    }
  });
  match.write("gre");
  match.write("al this is great this!");
});

test("lookbehind append", (t, done) => {
  let call = 0;

  const match = new Match("thisisalongpattern", () => {
    ++call;
    if (call === 1) {
      done();
    }
  });
  match.write("thisisalong");
  match.write("longpatlig");
});

test("lookbehind matchPattern pass", (t, done) => {
  let call = 0;

  const match = new Match("thisisalongpattern", () => {
    ++call;
    if (call === 1) {
      done();
    }
  });

  match.write("thisisalong");
  match.write("pattern");
});

test("lookbehind matchPattern fail", (t, done) => {
  let call = 0;

  const match = new Match("great", (isMatch) => {
    if (!isMatch) {
      ++call;
      if (call === 2) {
        done();
      }
    }
  });

  match.write("gre");
  match.write("lt");
});

test("lookbehind bufferCompare with null", (t, done) => {
  const match = new Match(
    "great",
    (isMatch, start, end, lookbehind, buffer) => {
      if (isMatch === true) {
        assert.strictEqual(start, 0);
        assert.strictEqual(end, 0);
        assert.strictEqual(lookbehind, null);
        assert.strictEqual(buffer, null);
        done();
      }
    },
  );

  match.write("great");
});

test("lookbehind test", (t, done) => {
  let count = 0;

  const match = new Match(
    "greatTest",
    (isMatch, start, end, lookbehind, buffer) => {
      ++count;

      if (count === 1) {
        assert.strictEqual(isMatch, false);
        assert.strictEqual(start, 0);
        assert.strictEqual(end, 7);
        assert.strictEqual(buffer, null);
      }

      if (count === 2) {
        assert.strictEqual(isMatch, false);
        assert.strictEqual(start, 0);
        assert.strictEqual(end, 4);
        assert.strictEqual(lookbehind, null);
        done();
      }
    },
  );

  match.write("great");
  match.write("Te");
  match.write("failgreat");
});

test("pattern test", (t, done) => {
  let count = 0;

  const match = new Match("Hello, World!", (isMatch, start, end, l, b) => {
    ++count;

    if (count === 1) {
      assert.strictEqual(isMatch, false);
      assert.strictEqual(start, 0);
      assert.strictEqual(end, 1);
      assert.strictEqual(String.fromCharCode(l[0]), "s");
      assert.strictEqual(b, null);
    }

    if (count === 2) {
      assert.strictEqual(isMatch, true);
      assert.strictEqual(start, 0);
      assert.strictEqual(end, 0);
      assert.strictEqual(l, null);
      assert.strictEqual(b, null);
      done();
    }
  });

  match.write("sHello, ");
  match.write("World!");
});

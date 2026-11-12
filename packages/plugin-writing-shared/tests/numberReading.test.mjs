import assert from "node:assert/strict";
import test from "node:test";
import { numberToJapaneseReading as read } from "../src/numberReading.ts";

test("数字 0〜9 は指定した日本語の読みになる", () => {
  const expected = ["ぜろ","いち","に","さん","よん","ご","ろく","なな","はち","きゅう"];
  expected.forEach((name, i) => assert.equal(read(String(i)), name));
});

test("十の位と一の位をまとめて読み、100 は ひゃく", () => {
  const examples = {
    10: "じゅう",
    11: "じゅういち",
    19: "じゅうきゅう",
    20: "にじゅう",
    21: "にじゅういち",
    25: "にじゅうご",
    40: "よんじゅう",
    47: "よんじゅうなな",
    70: "ななじゅう",
    89: "はちじゅうきゅう",
    90: "きゅうじゅう",
    99: "きゅうじゅうきゅう",
    100: "ひゃく",
  };
  for (const [number, reading] of Object.entries(examples)) {
    assert.equal(read(number), reading);
  }
});

test("0〜100 の全101種類は重複がなく、かなだけで表される", () => {
  const all = Array.from({ length: 101 }, (_, n) => read(String(n)));
  assert.equal(new Set(all).size, 101);
  all.forEach((value) => assert.match(value, /^[ぁ-ゖ]+$/u));
});

test("対応範囲外や不正な文字列は勝手に読み替えない", () => {
  for (const input of ["101", "-1", "01", "1.5", "2a", ""]) {
    assert.equal(read(input), input);
  }
});

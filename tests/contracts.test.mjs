import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateDecodeCase } from "../web/contracts/validate.js";

const fixtures = JSON.parse(readFileSync(new URL("./fixtures/decode-fixture.json", import.meta.url)));

test("v2 fixtures are synthetic and recompute Quick and truth from the same inputs", () => {
  assert.deepEqual(fixtures.map(data => data.behavior), ["continuous", "intermittent"]);
  for (const data of fixtures) {
    assert.equal(data.fixture, true);
    assert.equal(validateDecodeCase(data), data);
    const { advanced, quick } = data.levels;
    for (const [r, c] of quick.cells.map(({ row, col }) => [row, col])) {
      const block = advanced.cells.filter(cell => Math.floor(cell.row / 2) === r && Math.floor(cell.col / 2) === c);
      const expected = block.some(cell => cell.value === null) ? null :
        block.reduce((sum, cell) => sum + cell.value, 0) / (data.behavior === "continuous" ? 4 : 1);
      assert.equal(quick.cells[r * 4 + c].value, expected);
    }
    for (const grid of [advanced, quick]) {
      const truth = grid.cells.flatMap(cell => cell.value !== null && cell.value >= grid.truth.threshold ?
        [[cell.row, cell.col]] : []);
      assert.deepEqual(grid.truth.present, truth);
    }
    assert.equal(advanced.cells[0].value, null);
    assert.equal(quick.cells[0].status, "missing");
    assert.equal(advanced.cells[1].value, 0);
    assert.equal(advanced.cells[1].status, "below_threshold");
  }
});

test("v2 validation rejects corrupt cases with field-specific errors", () => {
  const corruptions = [
    [data => { data.schema = "earthpulse.decode/1"; }, /schema/],
    [data => { data.levels.quick.rows = 4; }, /dimensions/],
    [data => { data.levels.advanced.cells.reverse(); }, /row-major/],
    [data => { data.levels.advanced.cells[1].lat += 1; }, /WGS84/],
    [data => { data.levels.advanced.cells[1].value = NaN; }, /value\/status/],
    [data => { data.levels.advanced.cells[0].value = 0; }, /value\/status/],
    [data => { data.levels.advanced.cells[1].eventCount = 1.5; }, /eventCount/],
    [data => { data.levels.advanced.truth.present[0] = [9, 9]; }, /truth.present/],
    [data => { data.levels.advanced.truth.present[0] = [0, 1]; }, /truth.present does not match/],
    [data => { data.levels.quick.cells[1].value++; data.levels.quick.cells[1].eventCount++; }, /2x2 aggregation/],
    [data => { data.levels.quick.aggregation = "hand drawn"; }, /aggregation/],
    [data => { data.visualLink.relation = "MATCHED"; }, /visualLink.relation/],
    [data => { data.visualLink.relation = "SAME_DATA"; }, /fixture provenance/],
    [data => { data.source.time.start = "2000-02-30T00:00:00Z"; }, /source.time/],
  ];
  for (const [mutate, failure] of corruptions) {
    const candidate = structuredClone(fixtures[1]);
    mutate(candidate);
    assert.throws(() => validateDecodeCase(candidate), failure);
  }
});

test("Decode shell provides one interactive mount, an inert visual layer and one live region", () => {
  const html = readFileSync(new URL("../web/decode.html", import.meta.url), "utf8");
  assert.equal([...html.matchAll(/id="decode-grid"/g)].length, 1);
  assert.match(html, /id="decode-visual" aria-hidden="true" inert/);
  assert.match(html, /#decode-visual\s*\{\s*pointer-events: none/);
  assert.equal([...html.matchAll(/aria-live="polite"/g)].length, 1);
});

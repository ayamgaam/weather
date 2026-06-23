// Offline unit tests for the MOS-lite arithmetic (no network).
// Run with: npm test
import { mean, round1, biasAndMae, applyBias, alignByDate } from "../lib/correction";
import { toUnit } from "../lib/format";

let passed = 0;
let failed = 0;

function approx(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps;
}

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name} ${detail}`);
  }
}

// mean / round1
check("mean basic", approx(mean([1, 2, 3]), 2));
check("round1 rounds to one decimal", round1(1.249) === 1.2 && round1(1.25) === 1.3);

// Constant +2 deg warm bias: forecast is always 2 deg above actual.
{
  const forecast = [12, 15, 18, 20, 22];
  const actual = [10, 13, 16, 18, 20];
  const r = biasAndMae(forecast, actual);
  check("constant bias = +2", approx(r.bias, 2), `got ${r.bias}`);
  check("constant MAE = 2", approx(r.mae, 2), `got ${r.mae}`);
  check("sample count = 5", r.n === 5);
  // corrected = raw - bias
  check("applyBias removes the warm bias", applyBias(25, r.bias) === 23);
}

// Mixed/noisy errors: bias should be the signed mean, MAE the abs mean.
{
  const forecast = [10, 12, 14, 16];
  const actual = [9, 13, 13, 17]; // diffs: +1, -1, +1, -1
  const r = biasAndMae(forecast, actual);
  check("zero net bias on symmetric errors", approx(r.bias, 0), `got ${r.bias}`);
  check("MAE = 1 on symmetric errors", approx(r.mae, 1), `got ${r.mae}`);
}

// Nulls are skipped on both sides.
{
  const forecast = [10, null, 14, 16];
  const actual = [8, 11, null, 14];
  const r = biasAndMae(forecast, actual); // only indices 0 and 3 valid: diffs +2, +2
  check("nulls skipped -> n = 2", r.n === 2, `got ${r.n}`);
  check("nulls skipped -> bias = 2", approx(r.bias, 2), `got ${r.bias}`);
}

// alignByDate matches shared dates only, in sorted order.
{
  const fc = { "2026-06-01": 10, "2026-06-03": 12, "2026-06-02": 11 };
  const ar = { "2026-06-02": 9, "2026-06-03": 11, "2026-06-09": 99 };
  const a = alignByDate(fc, ar);
  check("aligned dates sorted & shared", JSON.stringify(a.dates) === JSON.stringify(["2026-06-02", "2026-06-03"]));
  check("aligned forecast order", JSON.stringify(a.forecast) === JSON.stringify([11, 12]));
  check("aligned actual order", JSON.stringify(a.actual) === JSON.stringify([9, 11]));
}

// Unit conversion sanity.
check("0C = 32F", toUnit(0, "F") === 32);
check("100C = 212F", toUnit(100, "F") === 212);
check("C is identity", toUnit(21.3, "C") === 21.3);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

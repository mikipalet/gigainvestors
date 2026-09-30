import { withTestHistory } from '../test-history';
import type { NumericInput, NumericOutcome, TestKey } from "../types";
import { run as understandable } from "./understandable";
import { run as moat } from "./moat";
import { run as economics } from "./economics";
import { run as management } from "./management";
import { run as accounting } from "./accounting";

export function runNumericTests(input: NumericInput): Record<Exclude<TestKey, "price">, NumericOutcome> {
  const tests = { understandable: understandable(input), moat: moat(input), economics: economics(input), management: management(input), accounting: accounting(input) };
  const years = new Set(input.years.map(year => year.fy)).size;
  return Object.fromEntries(Object.entries(tests).map(([key, test]) => [key, withTestHistory(test, years)])) as typeof tests;
}

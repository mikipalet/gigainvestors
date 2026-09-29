import type { NumericInput, NumericOutcome, TestKey } from "../types";
import { run as understandable } from "./understandable";
import { run as moat } from "./moat";
import { run as economics } from "./economics";
import { run as management } from "./management";
import { run as accounting } from "./accounting";

export function runNumericTests(input: NumericInput): Record<Exclude<TestKey, "price">, NumericOutcome> {
  return { understandable: understandable(input), moat: moat(input), economics: economics(input), management: management(input), accounting: accounting(input) };
}

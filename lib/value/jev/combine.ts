import { T } from "../config";
import type { JevAnswer, Result, Kind } from "../types";
import { QUESTIONS } from "./questions";

export function trustedContradictions(jev: JevAnswer[], kind?: Kind): JevAnswer[] {
  return jev.filter((answer) => {
    if ((kind === 'bank' || kind === 'insurer') && answer.q === 'government_dependence') return false;
    const question = QUESTIONS.find((q) => q.id === answer.q);
    if (!answer.trusted || answer.kind !== "noul" || answer.value === null || answer.probability === null || !question?.contradicts) return false;
    const probability = question.contradicts === "yes" ? answer.probability : 1 - answer.probability;
    return probability >= T.jev.contradict;
  });
}

export function combine({ numeric, jev, kind }: { numeric: Result; jev: JevAnswer[]; kind?: Kind }): Result {
  if (numeric !== "pass") return numeric;
  return trustedContradictions(jev, kind).length ? "fail" : numeric;
}

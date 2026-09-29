import { T } from "../config";
import type { JevAnswer, Result } from "../types";
import { QUESTIONS } from "./questions";

export function combine({ numeric, jev }: { numeric: Result; jev: JevAnswer[] }): Result {
  if (numeric !== "pass") return numeric;
  const contradiction = jev.some((answer) => {
    const question = QUESTIONS.find((q) => q.id === answer.q);
    if (!answer.trusted || answer.kind !== "noul" || answer.value === null || answer.probability === null || !question?.contradicts) return false;
    const probability = question.contradicts === "yes" ? answer.probability : 1 - answer.probability;
    return probability >= T.jev.contradict;
  });
  return contradiction ? "unclear" : numeric;
}

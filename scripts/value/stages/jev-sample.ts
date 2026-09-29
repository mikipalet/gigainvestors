import { randomInt, randomUUID } from "node:crypto";
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { corpusPath, readCorpusJson, readJsonl } from "../../../lib/value/corpus";
import { QUESTIONS } from "../../../lib/value/jev/questions";
import type { Analysis, Company, JevAnswer } from "../../../lib/value/types";
import type { Sections } from "../../../lib/value/analyze-company";
import { loadSections, type Options } from "./analyze";

type Sample = { id: string; question: (typeof QUESTIONS)[number]; answer: JevAnswer; text: string; sections: Record<string, string>; report: Analysis["report"]; versions: Analysis["versions"] };

export default async function sample({ only, limit }: Options): Promise<void> {
  const reservoirs = new Map(QUESTIONS.map(question => [question.id, { seen: 0, rows: [] as Sample[] }]));
  const companies = readJsonl<Company>("universe.jsonl").filter(company => !only || only.includes(company.id)).slice(0, limit);
  for (const company of companies) {
    if (!/^[\w.-]+$/.test(company.id)) throw new Error("Invalid company ID");
    const analysis = readCorpusJson<Analysis>(`analysis/${company.id}.json`);
    if (!analysis) continue;
    const snapshot = readCorpusJson<{ asOf: string; sections: Sections }>(`analysis/inputs/${company.id}.json`);
    const sections = snapshot?.asOf === analysis.asOf ? snapshot.sections
      : analysis.report.kind === "description" ? loadSections({ company: analysis.company, report: analysis.report }) : {};
    for (const test of Object.values(analysis.tests)) {
      for (const answer of test.jev) {
        const question = QUESTIONS.find(q => q.id === answer.q);
        if (!question || answer.value === null) continue;
        const inputs = Object.fromEntries(question.sections.flatMap(key => sections[key] ? [[key, sections[key]!]] : []));
        if (!Object.keys(inputs).length) continue;
        const reservoir = reservoirs.get(question.id)!;
        const row: Sample = { id: company.id, question, answer, text: sections[answer.section] ?? Object.values(inputs).join("\n\n"), sections: inputs, report: analysis.report, versions: analysis.versions };
        reservoir.seen++;
        if (reservoir.rows.length < 30) reservoir.rows.push(row);
        else {
          const index = randomInt(reservoir.seen);
          if (index < 30) reservoir.rows[index] = row;
        }
      }
    }
  }
  mkdirSync(corpusPath("jev-sample"), { recursive: true });
  for (const [id, reservoir] of reservoirs) {
    const destination = corpusPath(`jev-sample/${id}.jsonl`);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporary, reservoir.rows.map(row => JSON.stringify(row) + "\n").join(""), { flag: "wx" });
      renameSync(temporary, destination);
    } finally { rmSync(temporary, { force: true }); }
  }
  console.log(`jev-sample: ${reservoirs.size} questions, up to 30 answers each`);
}

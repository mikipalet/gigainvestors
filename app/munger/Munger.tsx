"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Face } from "@/components/Face";

const NOTHING = "I have nothing to add.";

const ZINGERS = [
  "Show me the incentive and I will show you the outcome.",
  "It's not supposed to be easy. Anyone who finds it easy is stupid.",
  "The big money is not in the buying and the selling, but in the waiting.",
  "Every time you hear EBITDA, substitute it with bullshit earnings.",
  "I think I'll say it's rat poison squared.",
  "All I want to know is where I'm going to die, so I'll never go there.",
  "Invert, always invert.",
  "Envy is the only sin you can't have any fun at.",
  "If people weren't so often wrong, we wouldn't be so rich.",
  "There are worse situations than drowning in cash and sitting, sitting, sitting.",
  "Try to be consistently not stupid, instead of trying to be very intelligent.",
  "Knowing what you don't know is more useful than being brilliant.",
  "Spend each day trying to be a little wiser than you were when you woke up.",
];

export function Munger() {
  const [answer, setAnswer] = useState<string | null>(null);
  const [asked, setAsked] = useState(0);
  const [question, setQuestion] = useState("");
  const unused = useRef([...ZINGERS]);

  const ask = () => {
    if (!question.trim()) return;
    setQuestion("");
    setAsked((n) => n + 1);
    // He answers the way he actually answered.
    if (Math.random() < 0.65 || unused.current.length === 0) {
      setAnswer(NOTHING);
    } else {
      const i = Math.floor(Math.random() * unused.current.length);
      setAnswer(unused.current.splice(i, 1)[0]);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-5 px-6 text-center">
      <Link href="/" className="fixed left-5 top-4 text-[12px] font-semibold tracking-wide opacity-45 hover:opacity-100">
        GigaInvestors
      </Link>
      <div className="relative h-[46vh] w-full max-w-[400px]">
        <Face slug="charlie-munger" size={1200} priority />
        {answer && (
          <div className="absolute -right-4 top-2 w-[240px] -rotate-2 rounded-[3px] bg-paper p-3 text-left text-[13px] leading-snug shadow-[0_0_0_1.5px_var(--ink)] sm:-right-40">
            {answer === NOTHING ? answer : `“${answer}”`}
            <div className="absolute -bottom-[7px] left-8 h-3 w-3 rotate-45 bg-paper shadow-[1.5px_1.5px_0_0_var(--ink)]" />
          </div>
        )}
      </div>
      <div className="text-[15px] leading-snug">
        <div className="text-[19px] font-semibold">Charlie Munger</div>
        <div className="opacity-55">1924 – 2023</div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="flex w-full max-w-[420px] items-center gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={asked === 0 ? "ask Charlie anything" : "ask him again"}
          className="min-w-0 flex-1 rounded-[3px] bg-paper px-3 py-2 text-[14px] shadow-[inset_0_0_0_1.5px_var(--ink)] outline-none placeholder:opacity-40"
          spellCheck={false}
          autoComplete="off"
        />
        <button type="submit" className="shrink-0 rounded-[3px] bg-ink px-4 py-2 text-[14px] font-semibold text-paper transition-opacity hover:opacity-80">
          ask
        </button>
      </form>
      {asked >= 3 && answer === NOTHING && <div className="text-[11px] opacity-35">he means it</div>}
    </div>
  );
}

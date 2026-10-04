"use client";
import {SearchTrigger} from "./Search";

// The 9ebf2c7 investor footer, sharing the global search trigger.
export function InvestorSearchTools(){return (
      <div className="fixed bottom-[6px] right-2 z-50 flex items-center gap-1 sm:bottom-[9px] sm:right-[76px] sm:gap-2">
        <a
          href="mailto:hello@gigainvestors.com"
          className="hidden rounded-[3px] px-2 py-1 text-[12px] leading-none opacity-50 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ink)_35%,transparent)] transition-opacity hover:opacity-100 sm:block"
        >
          contact
        </a>
        <a href="/api/v1/guide" className="rounded-[3px] px-2 py-1 text-[12px] leading-none opacity-50 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ink)_35%,transparent)] transition-opacity hover:opacity-100">agent API</a>
        <a
          href="/newsletter"
          className="flex h-11 w-11 items-center justify-center rounded-[3px] bg-paper text-[17px] leading-none opacity-75 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ink)_35%,transparent)] transition-opacity hover:opacity-100 sm:h-auto sm:w-auto sm:px-2 sm:py-1 sm:text-[12px] sm:opacity-50"
        >
          <span className="sm:hidden">✉</span>
          <span className="hidden sm:inline">newsletter</span>
        </a>
        <SearchTrigger />
      </div>
);}

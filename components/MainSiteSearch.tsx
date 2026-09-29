"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { Search } from "./Search";

export function MainSiteSearch() {
  // Use the rendered route so host rewrites also omit the main-site search.
  const segment = useSelectedLayoutSegment();
  return segment === "value" ? null : <Search />;
}

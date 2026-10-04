import { describe, expect, it } from "vitest";
import { rank, rankItems } from "@/lib/search/rank";

describe("shared search rank", () => {
  const index = {
    investors: [{ code: "BRK", person: "Warren Buffett", firm: "Berkshire Hathaway" }],
    stocks: [{ t: "BRK", n: "Berkshire Hathaway", h: 4 }, { t: "KO", n: "Coca-Cola", h: 20 }],
  };
  it("preserves investor, ticker, firm and Munger ranking", () => {
    expect(rank(index, " brk ").map(h => h.kind)).toEqual(["stock", "investor"]);
    expect(rank(index, "berkshire").map(h => h.kind)).toEqual(["stock", "investor"]);
    expect(rank(index, "buff")[0]).toMatchObject({ code: "BRK" });
    expect(rank(index, "coca")[0]).toMatchObject({ ticker: "KO" });
    expect(rank(index, "charlie")).toEqual([{ kind: "munger" }]);
    expect(rank(index, " ")).toEqual([]);
    expect(rank(index, "unknown")).toEqual([]);
  });
  it("prioritizes exact aliases and breaks equal scores by market cap only when requested", () => {
    const items = [
      { value: "small", fields: [{ text: "TSM Industry" }], marketCap: 10 },
      { value: "large", fields: [{ text: "TSM Manufacturing" }], marketCap: 100 },
      { value: "alias", fields: [{ text: "Taiwan Semiconductor" }], aliases: ["TSM"], marketCap: 1 },
    ];
    expect(rankItems(items, "tsm", { marketCapTiebreak: true })).toEqual(["alias", "large", "small"]);
    expect(rankItems(items, "tsm")).toEqual(["alias", "small", "large"]);
  });
  it("retains the twelve-result cap", () => {
    expect(rank({ investors: [], stocks: Array.from({length: 20}, (_, i) => ({t: `A${i}`, n: `A ${i}`, h: i})) }, "a")).toHaveLength(12);
  });
});

it('prepares only investors for value search while preserving portfolio stock search',async()=>{
 const {searchIndexForScope}=await import('@/lib/search/rank');
 const index:any={investors:[{code:'BRK',person:'Warren Buffett',firm:'Berkshire Hathaway'}],stocks:[{t:'KO',n:'Coca-Cola',h:5}]};
 const value=searchIndexForScope(index,true);
 expect(rank(value,'Buffett')[0]).toMatchObject({kind:'investor',code:'BRK'});
 expect(rank(value,'Coca-Cola')).toEqual([]);
 expect(rank(searchIndexForScope(index,false),'Coca-Cola')[0]).toMatchObject({kind:'stock',ticker:'KO'});
 expect(index.stocks).toHaveLength(1);
});

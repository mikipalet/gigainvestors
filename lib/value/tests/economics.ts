import { T } from "../config";
import { last, mean, nwc, outcome, present, ratio, roiic, slope, sum, withZeroDefaults } from "../metrics";
import { ownerEarningsSeries } from "../owner-earnings";
import { parentShare } from "../parent-share";
import type { NumericInput, Series } from "../types";

export function run({ years, kind }: NumericInput) {
  years = withZeroDefaults(years);
  const ys = last(years, 10), five = last(ys, 5), oe = ownerEarningsSeries(years);
  const consolidated = five.some(y=>parentShare(y)===null);
  const recent = consolidated ? five.map(y=>y.ocf===null || y.capex===null || y.leaseCashIncomplete ? null : y.ocf-y.capex-(y.sbc??0)-(y.leaseCash??0))
    : oe.filter(([fy]) => five.some(y => y.fy === fy)).map(p => p[1]);
  const incomes = five.map(y=>consolidated ? y.totalNetIncome??null : y.netIncome);
  const incomeTotal=sum(present(incomes)), ownerTotal=sum(present(recent));
  // A nonpositive earnings denominator is a loss observation, not missing cash data.
  const complete=present(recent).length===5 && present(incomes).length===5;
  const conversion=complete && incomeTotal>0 ? ownerTotal/incomeTotal : null;
  const conversionPass=!complete ? null : incomeTotal>0 ? conversion!>=T.economics.oeToNi : ownerTotal>0;
  const incremental = roiic(years);
  const working: Series = ys.map(y => [y.fy, ratio(nwc(y), y.revenue)]);
  const trend = slope(working);
  const startValues = present(working.slice(0, 3).map(p => p[1]));
  const endValues = present(working.slice(-3).map(p => p[1]));
  const start = ys.length === 10 && startValues.length === 3 ? mean(startValues) : null;
  const end = ys.length === 10 && endValues.length === 3 ? mean(endValues) : null;
  const change = start === null || end === null ? null : end - start;
  return outcome({ key: "economics", metrics: { oeToNi: conversion, consolidatedCashConversion:Number(consolidated), ownerEarningsTotal:complete?ownerTotal:null, netIncomeTotal:complete?incomeTotal:null, roiic: incremental, nwcToRevenueTrend: trend, nwcToRevenueChange: change, nwcToRevenueEnd: end },
    reasons:consolidated?['Cash conversion uses consolidated free cash flow after all capital expenditure and consolidated net income (informational).']:[],
    series: { ownerEarnings: oe, netIncome: ys.map(y=>[y.fy,y.netIncome]), nwcToRevenue: working }, checks: [
      { core: true, pass: conversionPass, data: "owner earnings cash conversion", reason: "owner earnings cash conversion below threshold" },
      { pass: incremental === null ? null : incremental >= T.economics.roiic, data: "incremental invested capital return", reason: "incremental invested capital return below threshold" },
      ...(kind === "operating" ? [{ pass: change === null || end === null ? null : end <= 0 || change <= T.economics.maxNwcRise + Number.EPSILON, data: "three-year working capital averages at both ends of ten years", reason: `working capital as a share of revenue rose more than ${T.economics.maxNwcRise * 100}pp and ends positive` }] : []),
    ],
  });
}

import { T } from "../config";
import { last, mean, nwc, outcome, present, ratio, roiic, slope, sum, withZeroDefaults } from "../metrics";
import { ownerEarningsSeries } from "../owner-earnings";
import type { NumericInput, Series } from "../types";

export function run({ years }: NumericInput) {
  years = withZeroDefaults(years);
  const ys = last(years, 10), five = last(ys, 5), oe = ownerEarningsSeries(years);
  const recent = oe.filter(([fy]) => five.some(y => y.fy === fy)).map(p => p[1]), incomes = five.map(y => y.netIncome);
  const conversion = present(recent).length < 5 || present(incomes).length < 5 ? null : ratio(sum(present(recent)), sum(present(incomes)));
  const incremental = roiic(years);
  const working: Series = ys.map(y => [y.fy, ratio(nwc(y), y.revenue)]);
  const trend = slope(working);
  const startValues = present(working.slice(0, 3).map(p => p[1]));
  const endValues = present(working.slice(-3).map(p => p[1]));
  const start = ys.length === 10 && startValues.length === 3 ? mean(startValues) : null;
  const end = ys.length === 10 && endValues.length === 3 ? mean(endValues) : null;
  const change = start === null || end === null ? null : end - start;
  return outcome({ key: "economics", metrics: { oeToNi: conversion, roiic: incremental, nwcToRevenueTrend: trend, nwcToRevenueChange: change, nwcToRevenueEnd: end },
    series: { ownerEarnings: oe, nwcToRevenue: working }, checks: [
      { pass: conversion === null ? null : conversion >= T.economics.oeToNi, data: "owner earnings cash conversion", reason: "owner earnings cash conversion below threshold" },
      { pass: incremental === null ? null : incremental >= T.economics.roiic, data: "incremental invested capital return", reason: "incremental invested capital return below threshold" },
      { pass: change === null || end === null ? null : end <= 0 || change <= T.economics.maxNwcRise + Number.EPSILON, data: "three-year working capital averages at both ends of ten years", reason: `working capital as a share of revenue rose more than ${T.economics.maxNwcRise * 100}pp and ends positive` },
    ],
  });
}

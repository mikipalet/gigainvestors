import { T } from "../config";
import { last, nwc, outcome, present, ratio, roiic, slope, sum } from "../metrics";
import { ownerEarningsSeries } from "../owner-earnings";
import type { NumericInput, Series } from "../types";

export function run({ years }: NumericInput) {
  const ys = last(years, 10), five = ys.slice(-5), oe = ownerEarningsSeries(years);
  const recent = oe.slice(-5).map(p => p[1]), incomes = five.map(y => y.netIncome);
  const conversion = present(recent).length < 5 || present(incomes).length < 5 ? null : ratio(sum(present(recent)), sum(present(incomes)));
  const incremental = roiic(years);
  const working: Series = ys.map(y => [y.fy, ratio(nwc(y), y.revenue)]);
  const trend = slope(working);
  return outcome({ key: "economics", metrics: { oeToNi: conversion, roiic: incremental, nwcToRevenueTrend: trend },
    series: { ownerEarnings: oe, nwcToRevenue: working }, checks: [
      { pass: conversion === null ? null : conversion >= T.economics.oeToNi, reason: "owner earnings cash conversion below threshold" },
      { pass: incremental === null ? null : incremental >= T.economics.roiic, reason: "incremental invested capital return below threshold" },
      { pass: trend === null ? null : trend <= 0, reason: "working capital as a share of revenue trending up" },
    ],
  });
}

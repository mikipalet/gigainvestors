import {z} from 'zod';
import type {RouteId} from './config';
const n=z.number().nullable(),text=z.string().nullable();
const series=z.array(z.tuple([z.number(),n]));
const source=z.object({url:z.string(),date:z.string(),section:z.string()});
const result=z.enum(['pass','fail','unclear','na']);
const provisional=z.object({fy:z.number(),end:z.string(),label:z.string(),filed:z.string(),periods:z.array(z.string())});
const testSummary=z.object({id:z.string(),result,provisional:provisional.optional()});
const priceCheck=z.object({state:z.string(),priceToValue:n,buyBelow:n,requiredDiscount:z.number(),expectedReturn:n,requiredReturn:n,currency:z.string(),asOf:text});
const verdict=z.object({id:z.string(),asOf:z.string(),verdict:z.string(),buyNow:z.boolean(),qualityPasses:z.number(),tests:z.array(testSummary),priceCheck});
const test=testSummary.extend({numeric:result,reasons:z.array(z.string()),metrics:z.record(z.string(),n),series:z.record(z.string(),series),judgement:z.object({result,reason:z.string(),override:z.boolean(),source:source.nullable()}).nullable()});
const memo=z.object({asOf:z.string(),lines:z.array(z.object({question:z.number(),answer:z.string(),basis:z.enum(['computed','filing']),sources:z.array(source),chart:z.object({label:z.string(),unit:z.enum(['percent','ratio']),points:series}).nullable(),capitalAllocation:z.array(z.object({fy:z.number(),reinvestmentRate:n,incrementalReturn:n,repurchasePremium:n})).optional()}))}).nullable();
const event=z.object({id:z.string(),text:z.string(),source:z.string(),date:z.string(),url:z.string()});
const story=z.object({asOf:z.string(),line:z.string(),needs:text,priceDate:text,events:z.array(event),selected:event.nullable(),facts:z.array(z.object({text:z.string(),url:z.string(),date:z.string(),label:z.string(),unit:z.enum(['money','percent']),points:series}))}).nullable();
const perShare=z.object({low:z.number(),mid:z.number(),high:z.number()});
const company=z.object({id:z.string(),name:z.string(),country:z.string(),currency:z.string(),exchange:z.string(),sector:text,kind:z.string(),westernListing:text});
const dossier=verdict.extend({company,methodVersion:text,tests:z.array(test),valuation:z.object({method:z.string(),currency:z.string(),perShare,trading:z.object({currency:z.string(),perShare}).nullable(),growth:z.number(),discountRate:z.number(),terminalGrowth:z.number(),assumptions:z.array(z.string()),bridge:z.array(z.object({label:z.string(),value:z.number()}))}).nullable(),valuationReason:text,series:z.record(z.string(),series),valueHistory:z.array(z.tuple([z.number(),z.number(),z.number(),z.number()])),memo,priceStory:story,thesis:z.object({changed:z.boolean(),reason:z.string(),sources:z.array(source)}).nullable(),business:z.object({asOf:z.string(),flags:z.array(z.object({id:z.string(),label:z.string(),why:z.string(),tone:z.string(),theme:z.string(),sources:z.array(source),series,unit:z.string()})),relationships:z.array(z.object({id:z.string(),from:z.string(),to:z.string(),type:z.string(),name:z.string(),status:z.string(),sources:z.array(source)}))}).nullable(),holders:z.array(z.object({id:z.string(),name:z.string()})),source:z.object({url:text,date:text,period:text})});
const row=z.object({id:z.string(),name:z.string(),country:z.string(),sector:text,currency:z.string(),westernListing:text,tests:z.string(),buyNow:z.boolean(),buyBelow:n,priceToBuy:n,expectedReturn:n,sinceReturn:n,returnAsOf:text,tags:z.array(z.string()),holderCount:z.number(),quality:z.object({label:z.string(),value:z.union([z.number(),z.literal('unlimited'),z.null()])}).nullable()});
const page={offset:z.number(),limit:z.number(),total:z.number(),nextOffset:n};
const listing=z.object({asOf:text,quarter:text,markets:z.enum(['all','western']),list:z.enum(['buy-now','next-closest','all']),items:z.array(row),...page});
const historySummary=z.record(z.string(),z.union([z.number(),z.null()]));
const portfolio=z.object({priceReturn:n,dividendReturn:n,benchmarkPriceReturn:n,benchmarkDividendReturn:n,missingIds:z.array(z.string())});
export const schemas:Record<RouteId,z.ZodType>={
 search:z.object({query:z.string(),stocks:z.array(z.object({id:z.string(),name:z.string(),holderCount:z.number()})),investors:z.array(z.object({id:z.string(),name:z.string(),firm:z.string()})),companies:z.array(z.object({id:z.string(),name:z.string(),country:text,analysed:z.boolean(),westernListing:text})),limit:z.number(),scope:z.string()}),
 investors:z.object({asOf:text,items:z.array(z.object({id:z.string(),name:z.string(),firm:z.string(),quarters:z.array(z.string())})),...page}),
 holdings:z.object({id:z.string(),name:z.string(),firm:z.string(),quarter:z.string(),previousQuarter:text,positionCount:z.number(),positions:z.array(z.object({id:z.string(),companyId:text,name:z.string(),rank:z.number(),weight:z.number(),weightChange:n,change:z.string()})),exited:z.array(z.string()),concentration:z.object({topFiveWeight:z.number(),herfindahl:z.number()}),basis:z.string()}),
 ownership:z.object({id:z.string(),name:z.string(),quarter:z.string(),quarters:z.array(z.string()),holderCount:z.number(),holders:z.array(z.object({id:z.string(),name:z.string(),rank:z.number(),shareOfTrackedCapital:z.number()})),basis:z.string()}),
 companies:listing,dossier,verdict,memo:z.object({id:z.string(),memo}),priceStory:z.object({id:z.string(),priceStory:story}),checklists:listing,export:listing,
 history:z.object({asOf:text,markets:z.enum(['all','western']),quarters:z.array(z.string()),summaries:z.record(z.string(),historySummary),assumptions:z.array(z.string()),caveats:z.array(z.string())}),
 quarter:listing.extend({summary:historySummary.nullable(),assumptions:z.array(z.string()),caveats:z.array(z.string())}),
 method:z.object({version:z.string(),description:z.string(),tests:z.array(z.object({id:z.string(),description:z.string()})),rules:z.array(z.object({id:z.string(),label:z.string(),threshold:z.number(),better:z.string(),strict:z.boolean(),explanation:z.string()})),assumptions:z.array(z.string())}),
 changelog:z.object({version:z.string(),changes:z.array(z.object({version:z.string(),date:z.string(),changelog:z.string()}))}),
 forward:z.object({start:text,asOf:text,days:z.number(),snapshots:z.number(),all:portfolio,western:portfolio,picks:z.array(z.object({id:z.string(),name:z.string(),firstDate:z.string(),methodVersion:z.string(),western:z.boolean(),priceReturn:n,dividendReturn:n,priceDate:text}))}),
};

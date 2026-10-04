import { NextResponse } from 'next/server';
import { getSearchIndex } from '@/lib/data';
import { readStore } from '@/lib/value/store';
import { buildCompanyIndex } from '@/lib/search/companies';
import type {IndexRow,StoreMeta} from '@/lib/value/types';

export const revalidate = 86400;

export async function GET() {
 const [holdings,meta,aliases] = await Promise.all([
  getSearchIndex(), readStore<StoreMeta>('meta.json'), readStore<Record<string,string>>('aliases.json'),
 ]);
 const countries=Object.keys(meta?.funnel?.byCountry??{});
 const indices=await Promise.all(countries.map(cc=>readStore<IndexRow[]>(`index/${cc}.json`)));
 const index=buildCompanyIndex(holdings??{investors:[],stocks:[]},indices.flatMap(rows=>rows??[]),aliases??{});
 return NextResponse.json(index,{headers:{'Cache-Control':'public, max-age=3600, stale-while-revalidate=86400'}});
}

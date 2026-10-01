'use client';
import {CompanyList} from '@/components/value/CompanyList';
import type {ResultEntry} from '@/lib/value/result-entry';
import type {Sort} from '@/lib/value/list-sort';
export {columns,type Sort} from '@/lib/value/list-sort';
export function ResultsTable({entries}:{entries:ResultEntry[];sort:Sort;direction:number;sortBy:(key:Sort)=>void}) {return <CompanyList entries={entries}/>;}

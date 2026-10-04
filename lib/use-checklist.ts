'use client';
import {useEffect,useState} from 'react';
import {fetchValueData} from '@/lib/value/data-source';
import {companyTicker} from '@/lib/company-route';
import {checklistVerdict,type ChecklistVerdict} from '@/lib/checklist-verdict';
export function useChecklist(q:string,initial:Record<string,ChecklistVerdict>,latest:string){
 q=q.replace(/\s/g,'');latest=latest.replace(/\s/g,'');
 const [history,setHistory]=useState<{q:string;marks:Record<string,ChecklistVerdict>}>();
 useEffect(()=>{
  if(q===latest)return;let active=true;
  void fetchValueData<import('@/lib/value/types').SnapshotRow[]>(`history/${q}.json`).then(rows=>{
   const marks:Record<string,ChecklistVerdict>={};for(const row of rows){const verdict=checklistVerdict({t:row[1],b:row[3]});if(verdict)marks[companyTicker(row[0])]=verdict;}
   if(active)setHistory({q,marks});
  }).catch(()=>{});
  return()=>{active=false;};
 },[q,latest]);
 return q===latest?initial:history?.q===q?history.marks:{};
}

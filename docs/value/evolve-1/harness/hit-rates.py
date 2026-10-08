"""Three-year hit rates of every Buy row, per variant, on the frozen research-1 frames.
Reuses evaluate.py's frame construction unchanged; reads results already opened."""
from pathlib import Path
import json
repo=Path(__file__).resolve().parents[4];source=repo/'research/valuation/evaluate.py';root=repo/'.audit/evolve-1'
s=source.read_text()
s=s.replace("HERE=Path(__file__).resolve().parent;OUT=HERE/'outputs'",f"HERE=Path({str(repo/'research/valuation')!r});OUT=Path({str(root/'research')!r})")
s=s.replace("seal=read(HERE/'implementation-freeze.json');assert all(hashlib.sha256(Path(n).read_bytes()).hexdigest()==v for n,v in seal['sources'].items())","")
s=s.replace("opened=OUT/'evaluation-opened.json';assert not opened.exists();","opened=None;")
s=s.split("opened.write_text(",1)[0]+"\n"+s.split("opened.write_text(",1)[1].split("\n",1)[1] if "opened.write_text(" in s else s
s=s.replace("variants=['baseline','sbc_once','current_scale','combined']","variants=['baseline','government_discount','economic_progress','combined']")
s=s.split("a.csvout('historical-changes.csv',changes)")[0]
s+='''
scopes={'US':orig_us,'Western_nonUS':lambda i:orig_western(i)and not orig_us(i),'all_nonUS':lambda i:not orig_us(i)}
periods={'train':[q for q in stored if '2005Q1'<=q<='2015Q3'],'later':[q for q in stored if '2016Q1'<=q<='2026Q2']}
labels={(i,q,h):ret for i,q,h,ret in read(OUT/'return-labels.json.gz')};cuts={}
for scope,include in scopes.items():
 for q in stored:
  vals=[ret for (i,quarter,h),ret in labels.items()if quarter==q and h==3 and ret is not None and include(i)]
  if vals:cuts[scope,q]=statistics.median(vals)
out=[]
for scope,include in scopes.items():
 for period,qs in periods.items():
  for variant in variants:
   rows=[(i,q)for q in qs for i,r in frames[variant][q].items()if include(i)and r[3]]
   known=[(i,q,labels.get((i,q,3)))for i,q in rows if labels.get((i,q,3))is not None]
   pos=sum(x[2]>0 for x in known);beat=sum(x[2]>=cuts[scope,x[1]]for x in known if (scope,x[1])in cuts)
   out.append({'scope':scope,'period':period,'variant':variant,'contaminated':scope=='US'and period=='later','buyRows':len(rows),'companies':len({i for i,_ in rows}),'observed3y':len(known),'hitPositive3y':pos/len(known)if known else None,'hitBeatMedian3y':beat/len(known)if known else None})
   print(json.dumps(out[-1]),flush=True)
(OUT/'hit-rates.json').write_text(json.dumps(out,indent=2)+'\\n')
'''
exec(compile(s,str(source),'exec'),{'__file__':str(source),'__name__':'__main__'})

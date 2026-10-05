def portfolio_local(qs,v,scope='US',weight='equal',pit_only=False,kind=2):
 global active_q
 nav=[];dates=[];wealth=1.;turnover=0;missing=[];ncounts=[];cashweights=[];periods=[]
 for q in qs:
  active_q=q;rs=[r for r in frames[q] if (us(r[0]) if scope=='US' else western(r[0]) and not us(r[0])) and (not pit_only or pit(r[0],q))]
  ws=weights(rs,v,weight);ncounts.append(len(ws));cashweights.append(1-sum(ws.values()))
  start=day(qend(q));stop=day(qend(q,1));ds=prices['SPY'][0];ds=ds[(ds>start)&(ds<=stop)]
  if not len(ds):continue
  # Buy first available close after signal; liquidate quarter end; remain cash
  # over the one-day execution gap. Full liquidation costs both sides each quarter.
  paths=np.ones((len(ds),len(ws))) if ws else np.ones((len(ds),0));invested=0
  for n,(i,w) in enumerate(ws.items()):
   a=quote(i,start,kind,True,scope!='US');b=quote(i,int(ds[-1]),kind,False,scope!='US')
   if not a or a[1]<=start or not b:
    missing.append({'quarter':q,'id':i,'weight':w,'reason':'missing entry/exit or FX; allocation in cash'});continue
   paths[:,n]=[ (1. if int(d)<a[1] else z[0]/a[0] if (z:=quote(i,int(d),kind,False,scope!='US')) else 1.) for d in ds]
   paths[ds>=a[1],n]*=(1-.001);paths[-1,n]*=(1-.001)
   invested+=w
  wv=np.array(list(ws.values()));growth=paths@wv+(1-sum(ws.values()))
  turnover+=2*invested
  values=wealth*growth;periods.append({'quarter':q,'return':float(growth[-1]-1),'n':len(ws),'cash':1-sum(ws.values()),'missing':sum(m['quarter']==q for m in missing)})
  nav.extend(map(float,values));dates.extend(map(int,ds));wealth=float(values[-1])
 result=perf(nav,dates)
 result.update({'variant':v,'scope':scope,'weight':weight,'pit_only':pit_only,'mean_positions':mean(ncounts),'mean_cash_weight':mean(cashweights),'turnover_sides':turnover,'missing_allocations':len(missing),'periods':periods})
 return result,{'dates':[datetime.date.fromordinal(d).isoformat() for d in dates],'nav':nav,'missing':missing}

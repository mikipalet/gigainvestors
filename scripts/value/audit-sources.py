"""Read-only primary source and Yahoo capture. Everything stays in one staging directory."""
import json,pathlib,urllib.request,time,datetime
ROOT=pathlib.Path(__import__('os').environ.get('VALUE_CORPUS_DIR',str(pathlib.Path.home()/'value-corpus'))); OUT=pathlib.Path('.audit/staging'); OUT.mkdir(exist_ok=True,parents=True)
IDS=['LULU.US','ZTS.US','WKL.AS','ACN.US','GOOGL.US','JPM.US','KO.US','AAPL.US','CBG.LSE','7203.JP','ADANIENT.NSE','NVDA.US','MSFT.US','AMZN.US','META.US','AVGO.US','TSLA.US','AXP.US','BAC.US','CVX.US','OXY.US','CB.US','MCO.US','KHC.US','DVA.US']
def get(url,file):
 if file.exists():return json.loads(file.read_text())
 req=urllib.request.Request(url,headers={'User-Agent':'GigaInvestors research research@gigainvestors.com'})
 with urllib.request.urlopen(req,timeout=40) as r:d=json.load(r)
 file.write_text(json.dumps(d));return d
universe={c['id']:c for c in map(json.loads,(ROOT/'universe.jsonl').read_text().splitlines())}
results=[]
for id in IDS:
 stat=__import__('os').statvfs('/');assert stat.f_bavail*stat.f_frsize>5*1024**3,'DISK STOP'
 f=json.loads((ROOT/f'fundamentals/{id}.json').read_text());c=json.loads((ROOT/f'companies/{id}.json').read_text()) if (ROOT/f'companies/{id}.json').exists() else universe[id]; y=f['years'][-1];r={'id':id,'end':y['end'],'currency':y['currency'],'sourceValues':{},'checks':[]}
 cik=c.get('cik')
 if not cik:
  import re
  for p in y.get('provenance',{}).values():
   m=re.search(r'CIK(\d+)',p.get('source',''))
   if m:cik=m[1];break
 # Toyota uses a US primary filing too.
 if id=='7203.JP':cik='1094517'
 if cik:
  u=f'https://data.sec.gov/api/xbrl/companyfacts/CIK{int(cik):010d}.json';r['source']=u
  try:
   raw=get(u,OUT/f'{id}.companyfacts.json');ns=raw['facts'];end=y['end'];cur=y['currency']
   ends=sorted(set(f['end'] for n in ns.values() for tag in ['NetIncomeLoss','ProfitLossAttributableToOwnersOfParent','ProfitLoss'] for fs in n.get(tag,{}).get('units',{}).values() for f in fs if f.get('start') and f.get('form') in ['10-K','20-F','40-F'] and 330<=(datetime.date.fromisoformat(f['end'])-datetime.date.fromisoformat(f['start'])).days<=400 and abs((datetime.date.fromisoformat(f['end'])-datetime.date.fromisoformat(end)).days)<=7))
   if len(ends)==1:end=ends[0]
   r['sourceEnd']=end
   def pick(tags,stock=False,unit=None):
    for tag in tags:
     fs=[(tag,x) for n in ns.values() for x in n.get(tag,{}).get('units',{}).get(unit or cur,[]) if x['end']==end and x.get('form') in ['10-K','10-K/A','20-F','40-F'] and (not x.get('start') if stock else x.get('start') and 330<=(datetime.date.fromisoformat(x['end'])-datetime.date.fromisoformat(x['start'])).days<=400)]
     if fs:return sorted(fs,key=lambda x:x[1].get('filed',''),reverse=True)[0]
    return None
   fields={'revenue':(['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet','Revenue','InterestAndDividendIncomeOperating'],False,cur),'netIncome':(['NetIncomeLoss','ProfitLossAttributableToOwnersOfParent','ProfitLoss'],False,cur),'dilutedShares':(['WeightedAverageNumberOfDilutedSharesOutstanding','AdjustedWeightedAverageShares'],False,'shares'),'cash':(['CashAndCashEquivalentsAtCarryingValue','CashAndCashEquivalents'],True,cur),'shortTermInvestments':(['ShortTermInvestments','ShortTermInvestmentsAvailableForSale','MarketableSecuritiesCurrent'],True,cur),'totalDebt':(['LongTermDebtCurrentAndNoncurrent','LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities','Borrowings'],True,cur),'dividendsPaid':(['PaymentsOfDividends','PaymentsOfDividendsCommonStock','DividendsPaid'],False,cur)}
   for field,(tags,stock,unit) in fields.items():
    p=pick(tags,stock,unit)
    if not p and field=='cash' and id=='LULU.US':p=pick(['CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],True,cur)
    if not p and field=='totalDebt':
     parts=[pick([t],True,cur) for t in ['LongTermDebtNoncurrent','LongTermDebtCurrent','ShortTermBorrowings','CommercialPaper']];parts=[p for p in parts if p]
     if parts:p=(' + '.join(p[0] for p in parts),{'val':sum(p[1]['val'] for p in parts),'accn':parts[0][1].get('accn')})
    if p:
     tag,fact=p;r['sourceValues'][field]={'value':fact['val'],'tag':tag,'accn':fact.get('accn'),'unit':unit};v=y.get(field);tol=max(1,abs(fact['val'])*.005)
     r['checks'].append({'field':field,'publishedInput':v,'source':fact['val'],'match':v is not None and abs(v-fact['val'])<=tol})
    else:r['checks'].append({'field':field,'publishedInput':y.get(field),'source':None,'match':None,'note':'Primary tag not found; requires report inspection'})
  except Exception as e:r['error']=str(e)
 else:r['source']=next((p['source'] for p in y.get('provenance',{}).values() if p.get('source','').startswith('https://')),None)
 symbol=id.replace('.US','').replace('.JP','.T').replace('.NSE','.NS').replace('.LSE','.L')
 # Date-aligned closes are necessary; today's price is a different observation.
 prices=json.loads((ROOT/'publish-repo/prices'/f"{c['country']}.json").read_text());quote=prices.get(id);r['publishedQuote']=quote
 if quote:
  date=datetime.datetime.fromisoformat(quote[1][:10]).replace(tzinfo=datetime.timezone.utc);p1=int((date-datetime.timedelta(days=7)).timestamp());p2=int((date+datetime.timedelta(days=2)).timestamp())
  u=f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={p1}&period2={p2}&interval=1d';r['quoteSource']=u
  try:
   data=get(u,OUT/f'{id}.yahoo.json')['chart']['result'][0];pts=[(datetime.datetime.fromtimestamp(t,datetime.timezone.utc).strftime('%Y-%m-%d'),v) for t,v in zip(data.get('timestamp',[]),data['indicators']['quote'][0]['close']) if v is not None]
   r['yahooQuotes']=pts;r['yahooCurrency']=data['meta'].get('currency');aligned=next((v for date,v in pts if date==quote[1][:10]),None);r['quoteDifferencePct']=None if aligned is None else 100*(quote[0]/aligned-1)
  except Exception as e:r['quoteError']=str(e)
 results.append(r);(OUT/'independent-sources.json').write_text(json.dumps(results,indent=2));print(id,'mismatch',[(x['field'],x.get('publishedInput'),x.get('source')) for x in r['checks'] if x['match'] is False],r.get('error',''),r.get('quoteError',''),flush=True);time.sleep(.15)

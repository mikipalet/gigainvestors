"""Small research-only cache: FRED rates and missing named-company inputs.
All files stay under staging/buffett-1. Secrets never appear in logs.
"""
import json, os, pathlib, re, shutil, time, urllib.request, urllib.parse
ROOT=pathlib.Path.home()/'value-corpus'; OUT=ROOT/'staging/buffett-1'
def get(url):
    if shutil.disk_usage('/').free<5*1024**3:raise RuntimeError('Disk under 5 GB')
    time.sleep(.25 if 'eodhd.com' in url else .55 if 'yahoo.com' in url else 0)
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'GigaInvestors research hello@gigainvestors.com'}),timeout=30) as r:return r.read()
def main():
    (OUT/'macro').mkdir(exist_ok=True);(OUT/'raw').mkdir(exist_ok=True);(OUT/'prices').mkdir(exist_ok=True)
    for k in ['GS10','IRLTLT01JPM156N','IRLTLT01GBM156N','IRLTLT01CHM156N','EXTAUS']:
        file=OUT/'macro'/f'{k}.csv'
        if file.exists() and file.stat().st_size>1000:continue
        s=re.sub('<[^>]+>',' ',get('https://fred.stlouisfed.org/data/'+k).decode())
        rows=re.findall(r'(\d{4}-\d{2}-\d{2})\s+(-?\d+(?:\.\d+)?)',s)
        if len(rows)<100:raise ValueError('FRED table incomplete')
        file.write_text('observation_date,'+k+'\n'+'\n'.join(','.join(r) for r in rows))
    env=dict(os.environ)
    for line in ((ROOT/'.env.local').read_text()+'\n'+(pathlib.Path.home()/'GitHub/superinvestors-wt/value/.env.local').read_text()).splitlines():
        if '=' in line and not line.startswith('#'):
            k,v=line.split('=',1);env.setdefault(k,v.strip().strip('\"\''))
    token=env.get('EODHD_API_TOKEN') or env.get('EODHD_API_KEY')
    if not token:raise RuntimeError('Missing EODHD token')
    log=[]
    for id in ['KHC.US','ULTA.US','DHI.US','SIRI.US','LEN.US','TSM.US','PCP.US','1211.HK']:
        try:
            f=OUT/'raw'/f'{id}.json'
            if not f.exists():f.write_bytes(get('https://eodhd.com/api/fundamentals/'+id+'?api_token='+urllib.parse.quote(token)+'&fmt=json'))
            raw=json.load(open(f));ok=bool(raw.get('Financials'))
            log.append({'id':id,'fundamentals':ok,'source':'EODHD fundamentals'})
        except Exception as e:log.append({'id':id,'fundamentals':False,'error':type(e).__name__})
        try:
            f=OUT/'prices'/f'{id}.json'
            if not f.exists():
                rows=json.loads(get('https://eodhd.com/api/eod/'+id+'?api_token='+urllib.parse.quote(token)+'&fmt=json&period=m&from=1980-01-01'))
                # EODHD close is original-price basis; adjusted_close includes dividends. Neither
                # is silently substituted for the corpus's split-only Yahoo series.
                f.write_text(json.dumps(rows))
            log[-1]['priceSource']='EODHD raw monthly OHLCV (basis not assumed)'
        except Exception as e:log[-1]['priceError']=type(e).__name__
        if id.endswith('.US'):
            try:
                f=OUT/'prices'/f'{id}.yahoo.json'
                if not f.exists():f.write_bytes(get('https://query1.finance.yahoo.com/v8/finance/chart/'+id[:-3]+'?period1=0&period2=1790812800&interval=1mo'))
                log[-1]['splitOnlyPriceSource']='Yahoo quote.close; not dividend-adjusted adjclose'
            except Exception as e:log[-1]['yahooError']=type(e).__name__
        print(id,log[-1].get('fundamentals'),flush=True)
    # Lennar B was the class reported in Berkshire's 2023 filing.
    file=OUT/'prices/LEN-B.US.yahoo.json'
    if not file.exists():file.write_bytes(get('https://query1.finance.yahoo.com/v8/finance/chart/LEN-B?period1=0&period2=1790812800&interval=1mo'))
    (OUT/'supplemental-source-log.json').write_text(json.dumps(log,indent=2))
if __name__=='__main__':main()

"""Reviewed source data, consumed by issuer-agnostic annual/balance paths."""
import json,hashlib,os
from pathlib import Path
root=Path.home()/'data/value-holds';corpus=root/'corpus';old=json.loads(Path('docs/value/holds-1/fairfax-evidence.json').read_text());source=old['primarySources'][0]['url']
for n,key in [('fairfax-2025',0),('fairfax-2026q2',1)]:
 assert hashlib.sha256((root/'downloads'/f'{n}.pdf').read_bytes()).hexdigest()==old['primarySources'][key]['sha256']
annual={2025:dict(equity=26514.3e6,preferredEquity=231.7e6,netIncome=4772.4e6,commonNetIncome=4935e6,ocf=2419.4e6,totalAssets=107787.7e6,dilutedShares=23084027,sharesOutstanding=20856086,revenue=46674.1e6,dividendsPaid=343.6e6,commonDividendsPaid=343.6e6),2024:dict(equity=24068.0e6,preferredEquity=1108.2e6,netIncome=3874.9e6,commonNetIncome=3879.8e6,ocf=3993.9e6,totalAssets=96777.3e6,dilutedShares=24163460,sharesOutstanding=21668466,revenue=42282.3e6,dividendsPaid=363.1e6,commonDividendsPaid=363.1e6)}
# Annual corporate-performance table: common equity and revenue use the issuer's
# restated historical presentation, not a sum of unmatched vendor concepts.
for fy,revenue,equity in [(2016,9300,8485),(2017,16225,12476),(2018,17758,11779),(2019,21533,13043),(2020,19795,12521),(2021,26468,15200),(2022,30696,17780),(2023,38417,21615)]:
 annual[fy]=dict(revenue=revenue*1e6)
facts=[]
for fy,values in sorted(annual.items()):
 facts.append(dict(end=f'{fy}-12-31',currency='USD',source=source,quote=f'2025 annual report PDF pages 3, 46-51, 95 and 99; FY{fy} parent equity, separately identified preferred, and annual statement amounts. Historical summary amounts rounded to USD million.',correction=True,values=values,calculation='Revenue = insurance revenue + non-insurance revenue + interest/dividends + share of profit of associates + net investment gains. Annual equity is parent equity including preferred but excluding noncontrolling interests; preferred is separately stored, so commonBook subtracts it once. Current-common balance explicitly excludes preferred. Earnings fields distinguish parent and common.'))
evidence=dict(source=source,facts={'facts':{}},reportedFacts=facts,evidence=old['primarySources'],revenueReconciliation={'2025':[31595,8537.6,2574,816.1,3151.4],'2024':[31064.1,6682.8,2511.9,956.3,1067.2]})
balance=dict(end='2026-06-30',currency='USD',commonEquity=26048.5e6,goodwillAndIntangibles=8142.7e6,shares=19969895,source=old['primarySources'][1]['url']+'#page=19',basis='effective-common',evidence=dict(pdfSha256=old['primarySources'][1]['sha256'],balancePage=2,sharesPage=19,calculation='19,221,125 + 1,548,000 - 799,230 = 19,969,895',bookPerShare=26048.5e6/19969895))
for rel,data in [('raw/annual-reviewed/FRFHF.US.json',evidence),('raw/reviewed-common-balance/FRFHF.US.json',balance)]:
 p=corpus/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,indent=2)+'\n')
Path('docs/value/holds-2/fairfax-inputs.json').write_text(json.dumps(dict(annual=evidence,currentCommonBalance=balance,limitations=['Pre-2024 goodwill/intangibles and diluted observations remain cached provider data; only fields bound above are independently corrected.','Parent net income remains the existing model numerator; common earnings are separately stored. No new historical common-earnings methodology is introduced.']),indent=2)+'\n')
print('Fairfax annual corrections and dated current common balance installed privately')

trailing=[dict(end='2026-06-30',currency='USD',source=old['primarySources'][1]['url'],quote='Interim PDF pages 3 and 6: H1 2026 and H1 2025 comparative income and cash flow. 2025 annual PDF pages 48 and 51.',correction=True,values=dict(revenue=round((46674.1+16009+3749.7+1399.3+414.3+383-15217.9-4270.4-1272.8-259.3-2008.1)*1e6),netIncome=(4772.4+2088.4-2382.4)*1e6,ocf=round((2419.4-886.3-1565.7)*1e6)),calculation='TTM = FY2025 + H1 2026 - H1 2025, identical income concepts; no annual row added.')]
p=corpus/'raw/reviewed-trailing/FRFHF.US.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(trailing,indent=2)+'\n')
p=Path('docs/value/holds-2/fairfax-inputs.json');d=json.loads(p.read_text());d['trailing']=trailing;p.write_text(json.dumps(d,indent=2)+'\n')

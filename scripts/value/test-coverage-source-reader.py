import ast,json,tempfile
from pathlib import Path
from html.parser import HTMLParser
module=ast.parse(Path('scripts/value/check-held-sources-v2.py').read_text())
code=ast.Module(body=[n for n in module.body if isinstance(n,(ast.ClassDef,ast.FunctionDef)) and n.name in ['Inline','filing_facts']],type_ignores=[])
sets=[{'ifrs-full:ClassesOfShareCapitalAxis':'ifrs-full:OrdinarySharesMember'},{'ifrs-full:ClassesOfShareCapitalAxis':'ifrs-full:PreferenceSharesMember'}]
with tempfile.TemporaryDirectory() as d:
 out=Path(d);(out/'raw').mkdir();ns={'HTMLParser':HTMLParser,'out':out,'bases':{'TEST.US':{'shareDimensionSets':sets}}};exec(compile(code,'independent-reader','exec'),ns)
 def html(values):
  s='<xbrli:unit id="shares"><xbrli:measure>xbrli:shares</xbrli:measure></xbrli:unit>'
  for i,value in enumerate(values):
   group=i%2
   s+=f'<xbrli:context id="c{i}"><xbrli:entity><xbrli:identifier>1</xbrli:identifier><xbrli:segment><xbrldi:explicitMember dimension="ifrs-full:ClassesOfShareCapitalAxis">{list(sets[group].values())[0]}</xbrldi:explicitMember></xbrli:segment></xbrli:entity><xbrli:period><xbrli:startDate>2025-01-01</xbrli:startDate><xbrli:endDate>2025-12-31</xbrli:endDate></xbrli:period></xbrli:context>'
   s+=f'<ix:nonfraction name="ifrs-full:AdjustedWeightedAverageShares" contextref="c{i}" unitref="shares">{value}</ix:nonfraction>'
  return s
 def read(values):
  (out/'raw/TEST.US-annual.html').write_text(html(values));x=ns['filing_facts']('TEST.US',{'kind':'20-F','filed':'2026-03-01','url':'https://www.sec.gov/accn/annual.htm'});return x['facts']['ifrs-full']['AdjustedWeightedAverageShares']['units']['shares']
 assert read([100,200])[0]['val']==300
 assert read([100,200,100,200])[0]['val']==300
 assert read([100])==[]
 assert read([100,200,101])==[]
 print('Independent share-class parser: 4 checks passed (sum, duplicate, missing, conflict)')

"""Download Berkshire's SEC 13Fs; write only to the designated staging directory.
No third-party packages. SEC rate < 5 requests/sec. Raw evidence retained once.
"""
import json, pathlib, re, shutil, time, urllib.request, xml.etree.ElementTree as ET
ROOT = pathlib.Path.home() / 'value-corpus/staging/buffett-1/sec'
ROOT.mkdir(parents=True, exist_ok=True)
HEADERS = {'User-Agent': 'GigaInvestors calibration hello@gigainvestors.com'}

def fetch(url, file):
    if shutil.disk_usage('/').free < 5 * 1024**3:
        raise RuntimeError('Disk below 5 GB: stopped')
    if not file.exists():
        with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
            file.write_bytes(r.read())
        time.sleep(.22)
    return file.read_text()

def parse(text):
    holdings = []
    for block in re.findall(r'<XML>(.*?)</XML>', text, re.S):
        root = ET.fromstring(block.strip())
        for e in root.iter():
            e.tag = e.tag.split('}')[-1]
        for row in root.iter('infoTable'):
            holdings.append(dict(cusip=row.findtext('cusip'), name=row.findtext('nameOfIssuer'),
                shares=float(row.findtext('shrsOrPrnAmt/sshPrnamt')), value=float(row.findtext('value')),
                security=row.findtext('titleOfClass'), putCall=row.findtext('putCall'),
                unit=row.findtext('shrsOrPrnAmt/sshPrnamtType')))
    if holdings:
        return holdings
    # Legacy fixed-width tables: CUSIPs may be 6+2+1 spaced or contiguous.
    active = None
    names = []
    for line in text.splitlines():
        m = re.search(r'\b([0-9A-Z]{6})\s*([0-9A-Z]{2})\s*([0-9])\s+\$?([\d,]+)\s+([\d,]+)', line)
        if m:
            prefix = line[:m.start()].strip()
            name = re.sub(r'\s+(?:Com|COM|Cl\s*\w|CL\s*\w).*$', '', prefix).strip(' .')
            active = dict(cusip=''.join(m.group(i) for i in (1,2,3)), name=' '.join(names[-4:]+[name]),
                shares=float(m[5].replace(',','')), value=float(m[4].replace(',','')),
                security=prefix, putCall=None, unit='SH')
            holdings.append(active); names=[]
        elif active and (m := re.search(r'\s{2,}\$?([\d,]+)\s+([\d,]+)\s+(?:X|SH|SOLE|DFND)',line,re.I)):
            holdings.append({**active, 'shares':float(m[2].replace(',','')), 'value':float(m[1].replace(',',''))})
        elif line.strip() and not re.search(r'<|Column|CUSIP|Authority|Shares|Class|Number|Name of|-----|====',line):
            if re.match(r'^\s*[A-Za-z]',line) and len(line.strip())<50:
                names.append(line.strip(' .'))
    return holdings

def main():
    current=json.loads(fetch('https://data.sec.gov/submissions/CIK0001067983.json',ROOT/'CIK0001067983.json'))
    sets=[current['filings']['recent']]
    for file in current['filings']['files']:
        sets.append(json.loads(fetch('https://data.sec.gov/submissions/'+file['name'],ROOT/file['name'])))
    manifest=[{k:d[k][i] for k in ['form','accessionNumber','filingDate','reportDate','primaryDocument']} for d in sets for i,f in enumerate(d['form']) if f.startswith('13F-HR') and '2004'<=d['reportDate'][i]<'2026']
    manifest.sort(key=lambda r:(r['reportDate'],r['filingDate'],r['accessionNumber']))
    quarters={};audit=[]
    for i,r in enumerate(manifest):
        a=r['accessionNumber'];url=f'https://www.sec.gov/Archives/edgar/data/1067983/{a.replace("-", "")}/{a}.txt'
        text=fetch(url,ROOT/(a+'.txt')); holdings=parse(text)
        restatement=bool(re.search(r'<amendmentType>RESTATEMENT|\[\s*[xX]\s*\]\s*is a restatement',text))
        q=quarters.setdefault(r['reportDate'],{'date':r['reportDate'],'holdings':{},'sources':[]})
        if restatement or r['form']=='13F-HR':q['holdings']={}
        aggregate={}
        for h in holdings:
            if h['putCall'] or h['unit']!='SH':continue
            key=h['cusip']; t=aggregate.setdefault(key,{**h,'shares':0,'value':0})
            t['shares']+=h['shares'];t['value']+=h['value']
        # NEW HOLDINGS amendments supplement the filing; repeated CUSIPs are replaced, never doubled.
        q['holdings'].update(aggregate);q['sources'].append({**r,'url':url,'restatement':restatement})
        expected=re.search(r'<tableEntryTotal>([\d,]+)|Information Table Entry Total:\s*([\d,]+)',text,re.I)
        expected=int(next(g for g in expected.groups() if g).replace(',','')) if expected else None
        total=re.search(r'<tableValueTotal>([\d,]+)',text,re.I) or re.search(r'Information Table Value Total:\.?\s*\$?\s*([\d,]+)',re.sub(r'<[^>]+>',' ',text),re.I)
        total=int(next(g for g in total.groups() if g).replace(',','')) if total else None
        actual=sum(h['value'] for h in holdings)
        audit.append({**r,'url':url,'parsedRows':len(holdings),'expectedRows':expected,'match':expected is None or expected==len(holdings),'statedValue':total,'parsedValue':actual,'valueMatches':total is not None and actual==total})
        if (i+1)%20==0:print('Fetched',i+1,'/',len(manifest),flush=True)
    (ROOT/'manifest.json').write_text(json.dumps(audit,indent=2)+'\n')
    (ROOT/'quarters.json').write_text(json.dumps(list(quarters.values()),indent=2)+'\n')
    print('Quarters',len(quarters),'mismatches',[a['accessionNumber'] for a in audit if not a['match']])

if __name__=='__main__':main()

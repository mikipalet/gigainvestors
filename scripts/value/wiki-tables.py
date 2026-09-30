"""Read Wikipedia constituent tables with stdlib only; preserve row/col spans."""
import json, re, sys, urllib.request, urllib.parse
from html.parser import HTMLParser

class Tables(HTMLParser):
    def __init__(self):
        super().__init__(); self.tables=[]; self.depth=0; self.rows=[]; self.row=[]; self.cell=None; self.skip=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='table':
            self.depth+=1
            if self.depth==1: self.rows=[]
        if self.depth!=1: return
        if tag=='tr': self.row=[]
        if tag in ('td','th'): self.cell={'text':'','rowspan':int(a.get('rowspan','1') or 1),'colspan':int(a.get('colspan','1') or 1)}
        if tag in ('sup','style','script'): self.skip+=1
        if tag=='br' and self.cell is not None: self.cell['text']+=' '
    def handle_endtag(self, tag):
        if self.depth==1:
            if tag in ('sup','style','script'): self.skip=max(0,self.skip-1)
            if tag in ('td','th') and self.cell is not None: self.row.append(self.cell); self.cell=None
            if tag=='tr' and self.row: self.rows.append(self.row); self.row=[]
            if tag=='table':
                grid=[]; pending={}
                for row in self.rows:
                    out=[]; col=0
                    def fill():
                        nonlocal col
                        while col in pending:
                            text,left=pending.pop(col); out.append(text)
                            if left>1: pending[col]=(text,left-1)
                            col+=1
                    for cell in row:
                        fill(); text=re.sub(r'\s+',' ',cell['text']).strip()
                        for _ in range(cell['colspan']):
                            out.append(text)
                            if cell['rowspan']>1: pending[col]=(text,cell['rowspan']-1)
                            col+=1
                    fill(); grid.append(out)
                self.tables.append(grid)
        if tag=='table': self.depth-=1
    def handle_data(self, data):
        if self.depth==1 and self.cell is not None and not self.skip: self.cell['text']+=data

class ConstituentLists(HTMLParser):
    """Some Wikipedia lists moved from tables to named constituent sections."""
    def __init__(self):
        super().__init__(); self.active=False; self.li=None; self.items=[]
    def handle_starttag(self,tag,attrs):
        if tag in ('h2','h3'):
            self.active=dict(attrs).get('id') in ('銘柄一覧','Liste_des_entreprises')
        if tag=='li' and self.active: self.li=''
    def handle_endtag(self,tag):
        if tag=='li' and self.li is not None: self.items.append(self.li.strip());self.li=None
    def handle_data(self,data):
        if self.li is not None: self.li+=data

def fetch(page):
    url=page if page.startswith('https://') else 'https://en.wikipedia.org/wiki/'+urllib.parse.quote(page.replace(' ','_'))+'?action=render'
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ValueResearch/1.0 (constituent table research)'}), timeout=45) as r: html=r.read().decode('utf-8')
    parser=Tables(); parser.feed(html)
    lists=ConstituentLists(); lists.feed(html)
    revision=re.search(r'oldid[=\\/]([0-9]+)',html)
    return {'url':url,'revision':revision.group(1) if revision else None,'tables':parser.tables,'constituentList':lists.items}
if __name__=='__main__':
    print(json.dumps(fetch(sys.argv[1]),ensure_ascii=False))

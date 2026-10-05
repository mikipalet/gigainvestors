import json,pathlib,base64,io,math
from PIL import Image,ImageDraw,ImageFont
p=pathlib.Path.home()/'data/value-logos';e=p/'evidence';(e/'sample-sheets').mkdir(exist_ok=True)
rows=json.loads((e/'random-40.json').read_text());records=[]
for row in sorted(rows,key=lambda r:r['id']):
 f=p/'corpus/enrichment-v7/logos'/(row['id']+'.json')
 if not f.exists():continue
 r=json.loads(f.read_text())
 if r.get('asset'):records.append({**row,'record':r})
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
for offset in range(0,len(records),60):
 subset=records[offset:offset+60];im=Image.new('RGB',(1500,math.ceil(len(subset)/5)*125),'#e6e6e6');d=ImageDraw.Draw(im)
 for i,row in enumerate(subset):
  x=(i%5)*300;y=(i//5)*125;r=row['record'];a=json.loads((p/'corpus/enrichment-v7/logos/assets'/(r['asset']+'.json')).read_text());icon=Image.open(io.BytesIO(base64.b64decode(a['data']))).convert('RGBA');icon.thumbnail((64,64))
  for dx,bg in [(0,'white'),(72,'#20252b')]:
   d.rectangle((x+dx,y,x+dx+68,y+68),fill=bg);im.paste(icon,(x+dx+(68-icon.width)//2,y+(68-icon.height)//2),icon)
  small=icon.copy();small.thumbnail((26,26));d.rectangle((x+146,y,x+178,y+32),fill='white');im.paste(small,(x+149,y+3),small);d.rectangle((x+182,y,x+214,y+32),fill='#20252b');im.paste(small,(x+185,y+3),small)
  d.text((x+2,y+70),row['id']+' '+r.get('source',''),fill='black',font=font);d.text((x+2,y+88),row['n'][:38],fill='black',font=font)
  d.text((x+2,y+106),(r.get('website') or r.get('sourceUrl',''))[:40],fill='#333333',font=font)
 name=f'{offset//60+1:02}';im.save(e/'sample-sheets'/f'{name}.png');(e/'sample-sheets'/f'{name}.json').write_text(json.dumps([{'id':r['id'],'asset':r['record']['asset'],'source':r['record'].get('source'),'website':r['record'].get('website'),'sourceUrl':r['record'].get('sourceUrl')} for r in subset],indent=2))
print('candidates',len(records),'sheets',math.ceil(len(records)/60))

from pathlib import Path
import json,hashlib,datetime,shutil
r=Path('.audit/evolve-1');e=r/'evidence';old=e/'research-seal.json';shutil.copy2(old,e/'research-seal-initial.json')
for v in ['government_discount','combined']:
 for name in ['valuation.ts','return-model.ts']:shutil.copy2(Path('lib/value')/name,r/'engines'/v/'lib/value'/name)
seal=json.loads(old.read_text());seal.update(frozenAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),revisionReason='Before portfolio evaluation: preserve the baseline financial payout haircut at the separate hurdle, satisfying the already-frozen unchanged-cash-flow requirement. Initial partial replay discarded without opening return outcomes.',engines={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in (r/'engines').rglob('*.ts')});old.write_text(json.dumps(seal,indent=2)+'\n')
shutil.rmtree(r/'research/candidate');(r/'research/candidate').mkdir()

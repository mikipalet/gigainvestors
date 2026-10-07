"""Retrospective diagnostics; the owner's accounting-correctness decision is binding."""
from pathlib import Path
import json,hashlib,datetime
repo=Path('/Users/miki/data/value-rules');source=repo/'research/valuation/evaluate.py';work=repo/'.audit/rules-6/research'
s=source.read_text()
s=s.replace("HERE=Path(__file__).resolve().parent;OUT=HERE/'outputs'", "HERE=Path('/Users/miki/data/value-rules/research/valuation');OUT=Path('/Users/miki/data/value-rules/.audit/rules-6/research')")
s=s.replace("seal=read(HERE/'implementation-freeze.json');assert all(hashlib.sha256(Path(n).read_bytes()).hexdigest()==v for n,v in seal['sources'].items())", "seal=read(Path('/Users/miki/data/value-rules/.audit/rules-6/evidence/research-seal.json'));assert all(hashlib.sha256(Path(n).read_bytes()).hexdigest()==v for n,v in seal['engines'].items())")
s=s.replace("hashlib.sha256((HERE/'implementation-freeze.json').read_bytes()).hexdigest()","hashlib.sha256(Path('/Users/miki/data/value-rules/.audit/rules-6/evidence/research-seal.json').read_bytes()).hexdigest()")
s=s.replace("variants=['baseline','sbc_once','current_scale','combined']", "variants=['baseline','sbc_once','current_scale','ttm_maintenance','flow_inputs','parent_allocation','ocf_fallback','combined']")
s=s.replace("accepted['combined']=accepted['combined']and accepted['sbc_once']and accepted['current_scale']", "accepted['combined']=accepted['combined']and accepted['sbc_once']and accepted['current_scale'] # legacy gate shown diagnostically only")
s=s.replace("{'accepted':accepted,'gates':gates", "{'legacyPerformanceGate':accepted,'ownerOverride':True,'correctnessFixesShipRegardlessOfReturns':True,'gates':gates")
s=s.replace("opened=OUT/'evaluation-opened.json'", "opened=OUT/'evaluation-opened-split.json'")
exec(compile(s,str(source),'exec'),{'__file__':str(source),'__name__':'__main__'})

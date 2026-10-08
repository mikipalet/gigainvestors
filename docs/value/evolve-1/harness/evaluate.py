"""Exact research-1 portfolio, with only the owner's 2pp/5pp rejection rule."""
from pathlib import Path
repo=Path(__file__).resolve().parents[4];source=repo/'research/valuation/evaluate.py';root=repo/'.audit/evolve-1'
s=source.read_text()
s=s.replace("HERE=Path(__file__).resolve().parent;OUT=HERE/'outputs'",f"HERE=Path({str(repo/'research/valuation')!r});OUT=Path({str(root/'research')!r})")
s=s.replace("seal=read(HERE/'implementation-freeze.json');assert all(hashlib.sha256(Path(n).read_bytes()).hexdigest()==v for n,v in seal['sources'].items())",f"seal=read(Path({str(root/'evidence/research-seal.json')!r}));assert all(hashlib.sha256(Path(n).read_bytes()).hexdigest()==v for n,v in seal['engines'].items())")
s=s.replace("hashlib.sha256((HERE/'implementation-freeze.json').read_bytes()).hexdigest()",f"hashlib.sha256(Path({str(root/'evidence/research-seal.json')!r}).read_bytes()).hexdigest()")
s=s.replace("variants=['baseline','sbc_once','current_scale','combined']","variants=['baseline','government_discount','economic_progress','combined']")
s=s.replace("b['cagr']-.0025", "b['cagr']-.02").replace("b['max_drawdown']-.02", "b['max_drawdown']-.05").replace("'passes':perf and loser", "'passes':perf")
s=s.replace("accepted['sbc_once']and accepted['current_scale']", "accepted['government_discount']and accepted['economic_progress']")
exec(compile(s,str(source),'exec'),{'__file__':str(source),'__name__':'__main__'})

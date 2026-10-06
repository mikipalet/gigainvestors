"""Propose exact method-only Buy transitions; this file does not grant approval."""
import json
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-2');e=r/'evidence';c=r/'corpus'
read=lambda p:json.loads(p.read_text())
method={v['id']:v for v in read(e/'method-attribution.json')if v['sameInputs'] and all(k in ['understandable','moat']for k in v['changedTests'])}
proposals=read(c/'staging/preserved-buy-transitions.json');entries=[];held=[]
# On a repeat export, exact entries may already be applied by this manifest.
# Recover them from the audited live-to-candidate change list as well.
audit=e/'release-audit.json'
if audit.exists():
 known={v['id']for v in proposals}
 proposals += [{'id':v['id'],'before':v['before'],'proposed':v['after']}for v in read(audit)['buyChanges']if v['id']not in known]
for change in proposals:
 id=change['id']
 if id not in method:held.append(change);continue
 a=read(c/f'analysis/{id}.json');m=a['tests']['moat']['metrics'];typical=m.get('grossMarginTypical');recent=m.get('grossMarginRecent');drop=m.get('grossMarginDrop')
 details=(f"Typical gross margin {typical*100:.8f}%, recent gross margin {recent*100:.8f}%, decline {drop*100:.8f}pp versus the unchanged 4pp limit." if None not in [typical,recent,drop]else 'See complete cached test evidence for the recovered-margin rule.')
 reason=f"PROPOSED FOR OWNER APPROVAL, not yet approved: method 3.5.0 on identical cached inputs. Quality {change['before']['t']} to {change['proposed']['t']}. {details} Exact before/after Buy, quality, valuation and margin are bound; all price/return gates remain in force. Evidence: docs/value/rules-2/buy-evidence.json and method-attribution.json."
 evidence=[f'https://eodhd.com/api/fundamentals/{id}']
 report=read(c/f'reports/{id}/meta.json')
 if id=='001800.KO':reason+=' Cached SEC report is Orion Group Holdings (US), not ORION Holdings Korea; rejected as issuer evidence. The numerical proof uses unchanged cached vendor fundamentals, not a verified Korean filing.'
 elif id=='000786.SHE':reason+=' Only a cached business description is available; no matching primary filing corroborates these margins.'
 elif id=='IPS.PA':
  reason+=' IPS.PA is Ipsos (not Ipsen). Its abrupt FY2025 vendor gross-profit change is a comparability concern; the calculation is not proof of economic deterioration.'
  if report.get('url'):evidence.append(report['url'])
 entries.append({'id':id,'before':change['before'],'after':change['proposed'],'reason':reason,'evidence':evidence})
entries.sort(key=lambda v:v['id'])
Path('scripts/value/approved-verdict-changes.json').write_text(json.dumps(entries,indent=2)+'\n')
(e/'proposed-buy-approvals.json').write_text(json.dumps(entries,indent=2)+'\n');(e/'unrelated-buy-proposals-held.json').write_text(json.dumps(held,indent=2)+'\n')
print('Proposed method-only Buy changes:',[v['id']for v in entries]);print('Unrelated Buy changes remain held:',[v['id']for v in held])

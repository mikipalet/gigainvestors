#!/usr/bin/env bash
set -euo pipefail
python3 - <<'AUDIT'
import json,os,socket
from pathlib import Path
root=Path(os.environ['PUBFIX_ROOT'])
report={'interfaces':[name for _,name in socket.if_nameindex()], 'sourceCorpusReadOnly':bool(os.statvfs(Path.home()/'value-corpus').f_flag & os.ST_RDONLY), 'externalRoutes':len(Path('/proc/net/route').read_text().splitlines())-1}
(root/'evidence/isolation.json').write_text(json.dumps(report,indent=2)+'\n')
assert report['interfaces']==['lo'] and report['sourceCorpusReadOnly'] and report['externalRoutes']==0
AUDIT
exec "$@"

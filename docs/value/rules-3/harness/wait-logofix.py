"""Observe the release dependency; never interact with runner state or locks."""
import datetime as dt
import json
import shutil
import time
from pathlib import Path

root = Path('/Users/miki/data/value-rules')
evidence = root / '.audit/rules-3/evidence'
marker = Path('/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/logofix-2.shipped')
deadline = dt.datetime(2026, 10, 7, 1, 30, tzinfo=dt.timezone.utc)
next_poll = 0.0
while True:
    now = dt.datetime.now(dt.timezone.utc)
    free = {p: shutil.disk_usage(p).free for p in ['/', '/Users/miki/data']}
    with (evidence / 'disk.jsonl').open('a') as stream:
        stream.write(json.dumps({'time': now.isoformat(), 'free': free}) + '\n')
    if min(free.values()) < 4 * 1024**3:
        (evidence / 'DISK_STOP').write_text(json.dumps(free))
        print('DISK STOP: checkpoint commit and stop required', flush=True)
        raise SystemExit(2)
    if time.monotonic() >= next_poll or now >= deadline:
        found = marker.is_file()
        result = {'time': now.isoformat(), 'markerExists': found, 'deadline': deadline.isoformat()}
        with (evidence / 'sequence-polls.jsonl').open('a') as stream:
            stream.write(json.dumps(result) + '\n')
        print(json.dumps(result), flush=True)
        if found:
            (evidence / 'sequence-ready.json').write_text(json.dumps(result, indent=2) + '\n')
            break
        if now >= deadline:
            (evidence / 'sequence-timeout.json').write_text(json.dumps(result, indent=2) + '\n')
            raise SystemExit(1)
        next_poll = time.monotonic() + 180
    time.sleep(min(5, max(0, (deadline - now).total_seconds())))

import sys, re, json, subprocess, html, os
# usage: fs_get.py outdir id1 id2 ...  -> downloads hq mp3 previews and records metadata (license checked)
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
metaf = os.path.join(out, 'meta.json'); meta = json.load(open(metaf)) if os.path.exists(metaf) else {}
def one(sid):
    if sid in meta and os.path.exists(os.path.join(out, sid + '.mp3')): return sid, 'cached'
    s = subprocess.run(['curl', '-sL', '-m', '40', f'https://freesound.org/s/{sid}/'], capture_output=True, text=True).stdout
    mp3 = re.search(r'data-mp3="([^"]+)"', s); title = re.search(r'data-title="([^"]*)"', s); user = re.search(r'data-username="([^"]*)"', s)
    lic = re.search(r'href="(https?://creativecommons.org/[^"]+)"', s)
    if not mp3: return sid, 'NO PAGE'
    url = mp3.group(1).replace('-lq.', '-hq.')
    subprocess.run(['curl', '-s', '-m', '60', '-o', os.path.join(out, sid + '.mp3'), url])
    meta[sid] = dict(title=html.unescape(title.group(1)) if title else '', user=user.group(1) if user else '', license=lic.group(1) if lic else '?', url=f'https://freesound.org/s/{sid}/')
    return sid, meta[sid]['license'] + ' ' + meta[sid]['user'] + ' ' + meta[sid]['title']
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(8) as ex:
    for sid, r in ex.map(one, sys.argv[2:]): print(sid, r)
json.dump(meta, open(metaf, 'w'), indent=1)

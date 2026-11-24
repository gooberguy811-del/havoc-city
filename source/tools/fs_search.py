import sys, re, json, urllib.parse, subprocess, html
def search(q, pages=1, maxdur=None):
    out = []
    for pg in range(1, pages + 1):
        url = 'https://freesound.org/search/?' + urllib.parse.urlencode({'q': q, 'f': 'license:"Creative Commons 0"', 'page': pg})
        s = subprocess.run(['curl', '-s', '-m', '40', url], capture_output=True, text=True).stdout
        for m in re.finditer(r'class="bw-player"(.*?)tabindex', s, re.S):
            b = m.group(1)
            g = lambda k: (re.search(k + r'="([^"]*)"', b) or [None, ''])[1]
            sid = g('data-sound-id'); rest = s[m.end():m.end() + 9000]
            r = re.search(r'aria-label="Average rating of ([\d.]+)"', rest)
            nr = re.search(r'\((\d+)\)', rest[rest.find('bw-rating'):rest.find('bw-rating') + 6000] if 'bw-rating' in rest else '')
            out.append(dict(id=sid, user=g('data-username'), title=html.unescape(g('data-title')), dur=float(g('data-duration') or 0),
                            dl=int(g('data-num-downloads') or 0), rating=float(r.group(1)) if r else 0, mp3=g('data-mp3').replace('-lq.', '-hq.')))
    if maxdur: out = [o for o in out if o['dur'] <= maxdur]
    return out
if __name__ == '__main__':
    q = sys.argv[1]; maxdur = float(sys.argv[2]) if len(sys.argv) > 2 else None
    res = search(q, 2, maxdur)
    res.sort(key=lambda o: -o['dl'])
    for o in res[:int(sys.argv[3]) if len(sys.argv) > 3 else 12]:
        print(f"{o['id']:>7} {o['dl']:>6}dl {o['rating']:.1f}* {o['dur']:6.1f}s {o['user'][:16]:16} {o['title'][:60]}")

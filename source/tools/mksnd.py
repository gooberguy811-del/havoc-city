import sys, subprocess, numpy as np, json, base64, os, re
SR = 44100
RAW, OUT = sys.argv[1], sys.argv[2]
def load(sid):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{RAW}/{sid}.mp3', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)
def seg(x, a, b): return x[int(a * SR):int(b * SR) if b else len(x)].copy()
def fade(x, fi=0.003, fo=0.06):
    n = len(x); i = min(int(fi * SR), n // 4); o = min(int(fo * SR), n // 2)
    if i: x[:i] *= np.linspace(0, 1, i)
    if o: x[-o:] *= np.linspace(1, 0, o) ** 1.5
    return x
def trim_silence(x, thr_db=-50):
    a = np.abs(x); t = a.max() * 10 ** (thr_db / 20); idx = np.where(a > t)[0]
    return x[max(0, idx[0] - int(0.004 * SR)):idx[-1] + int(0.02 * SR)] if len(idx) else x
def norm_peak(x, db=-1.0): return x * (10 ** (db / 20) / (np.abs(x).max() + 1e-9))
def norm_rms(x, db=-18.0):
    r = np.sqrt(np.mean(x ** 2)) + 1e-9; y = x * (10 ** (db / 20) / r); p = np.abs(y).max()
    return y * (0.95 / p) if p > 0.95 else y
def loopify(x, xf=0.08):
    X = int(xf * SR); out = x[X:].copy(); t = np.linspace(0, 1, X)
    out[-X:] = x[-X:] * np.sqrt(1 - t) + x[:X] * np.sqrt(t)   # equal-power crossfade of the tail into the head
    return out
def hp(x, f):   # gentle high-pass to remove rumble/DC
    y = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); y[fr < f] *= (fr[fr < f] / f) ** 2; return np.fft.irfft(y, len(x))
def enc(name, x, kbps, pad=None):
    wav = f'{OUT}/{name}.f32'; (np.clip(x, -1, 1).astype(np.float32)).tofile(wav)
    mp3 = f'{OUT}/{name}.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', wav, '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', mp3], check=True)
    os.remove(wav); return mp3
# name: (freesound id, start, end, kind, opts)
SPEC = {
 # ---- loops ----
 'eng':      (269771, 0.05, 2.35, 'loop', dict(xf=0.12)),
 'engDiesel':(679693, 0.05, 2.30, 'loop', dict(xf=0.12)),
 'engBike':  (119455, 5.0, 7.6, 'loop', dict(xf=0.15)),
 'prop':     (737571, 0.2, 3.85, 'loop', dict(xf=0.2)),
 'jet':      (534856, 2.0, 6.0, 'loop', dict(xf=0.25)),
 'heli':     (172667, 0.0, None, 'loop', dict(xf=0.03, period=True)),
 'siren':    (746302, 3.05, 3.05 + 2.998 + 0.04, 'loop', dict(xf=0.04)),
 'skid':     (104026, 0.1, 1.25, 'loop', dict(xf=0.15)),
 'scrape':   (385939, 0.5, 2.6, 'loop', dict(xf=0.2)),
 'horn':     (182474, 1.65, 2.95, 'loop', dict(xf=0.1)),
 # ---- one-shots ----
 'crash1':   (237375, 0.30, 2.9, 'one', {}),
 'crash2':   (592388, 0.0, 2.4, 'one', {}),
 'hit':      (151624, 0.0, None, 'one', {}),
 'metal':    (321482, 0.0, 1.2, 'one', {}),
 'glass':    (221528, 0.0, 1.6, 'one', {}),
 'punch':    (490769, 0.0, None, 'one', {}),
 'door':     (208695, 0.0, None, 'one', {}),
 'lock':     (396448, 0.0, None, 'one', {}),
 'coin':     (341979, 0.0, None, 'one', {}),
 'cash':     (209578, 0.0, 1.6, 'one', {}),
 'passed':   (626259, 0.0, None, 'one', {}),
 'fail':     (626260, 0.0, None, 'one', {}),
 'thud':     (417994, 0.0, 0.9, 'one', {}),
 'boom':     (609587, 0.0, 3.4, 'one', {}),
 'boomBig':  (235968, 0.3, 6.6, 'one', dict(fo=1.2)),
 'boomFar':  (372086, 0.0, 3.6, 'one', dict(fo=0.6)),
 'collapse': (845932, 0.0, 6.6, 'one', dict(fo=1.0)),
 'collapseS':(712918, 0.0, None, 'one', {}),
 'clank':    (56253, 0.0, None, 'one', {}),
 'splash':   (189504, 0.0, None, 'one', {}),
 'splashBig':(442773, 0.0, None, 'one', {}),
 'honk':     (423990, 0.0, None, 'one', {}),
 'scream1':  (235592, 0.0, None, 'one', {}),
 'scream2':  (400183, 0.0, None, 'one', {}),
 'scream3':  (556976, 0.5, 2.6, 'one', {}),
 'wanted':   (536773, 0.0, None, 'one', {}),
 'wasted':   (222517, 0.0, 4.6, 'one', dict(fo=1.5)),
 'pistol':   (427592, 0.0, 1.0, 'one', dict(fo=0.3)),
 'smg':      (212601, 0.0, 0.5, 'one', dict(fo=0.2)),
 'shotgun':  (266105, 0.0, None, 'one', {}),
 'rocket':   (521377, 0.0, None, 'one', {}),
 'cannon':   (127845, 0.0, 3.0, 'one', dict(fo=0.8)),
 'dry':      (589848, 0.0, 0.45, 'one', {}),
 'reload':   (363167, 0.0, None, 'one', {}),
 'whoosh':   (423799, 0.0, 1.4, 'one', dict(fo=0.4)),
 'bell':     (678345, 0.0, 2.6, 'one', dict(fo=0.4)),
 'ping':     (530480, 0.0, None, 'one', {}),
 'squeak':   (468443, 0.0, None, 'one', {}),
 'bombfall': (506313, 0.0, None, 'one', {}),
 'flyby':    (623015, 0.0, None, 'one', dict(fo=0.8)),
 'lockon':   (189327, 0.0, 0.7, 'one', {}),
}
authors = {}
for l in open(f'{RAW}/authors.txt'):
    sid, url = l.split(); m = re.search(r'/people/([^/]+)/sounds/', url); authors[sid] = m.group(1) if m else '?'
meta = json.load(open(f'{RAW}/meta.json'))
PAD = 0.1
data, info, credits, total, trims = {}, {}, [], 0, {}
for name, (sid, a, b, kind, o) in SPEC.items():
    x = load(sid)
    if kind == 'loop':
        y = seg(x, a, b); y = hp(y, 30)
        if o.get('period'):   # pulse loops (rotor chop): cut a whole number of beats so the rhythm never stumbles at the seam
            n = int(0.01 * SR); env = np.array([np.sqrt(np.mean(y[i:i + n] ** 2)) for i in range(0, len(y) - n, n)]); e = env - env.mean()
            ac = np.correlate(e, e, 'full')[len(e) - 1:]; lag = int(np.argmax(ac[5:40]) + 5)
            beat = lag * n; k = (len(y) - int(o['xf'] * SR)) // beat; y = y[:k * beat + int(o['xf'] * SR)]
            print('beat', name, beat / SR, 'x', k)
        if o.get('xf'): y = loopify(y, o['xf'])
        y = norm_rms(y, -17)
        P = int(PAD * SR); y = np.concatenate([y[-P:], y, y[:P]])      # cyclic padding: loop points sit inside, so decoder offsets don't matter
        f = enc(name, y, 56); info[name] = [PAD, round((len(y) - 2 * P) / SR, 5)]
    else:
        y = seg(x, a, b); y = trim_silence(y); y = hp(y, 25); y = fade(y, 0.002, o.get('fo', 0.06)); y = norm_peak(y, -1)
        f = enc(name, y, 64)
    act = y[np.abs(y) > np.abs(y).max() * 0.03] if kind == 'one' else y
    rms = 20 * np.log10(np.sqrt(np.mean(act ** 2)) + 1e-9); trims[name] = round(float(min(1.0, 10 ** ((-17 - rms) / 20))), 3)
    d = open(f, 'rb').read(); total += len(d); data[name] = base64.b64encode(d).decode()
    m = meta[str(sid)]; credits.append([name, m['title'], authors.get(str(sid), '?'), sid])
js = '// =====================================================================\n//  SOUNDS: CC0 recordings from freesound.org (credits in SND_CREDITS), decoded at start-up\n// =====================================================================\n'
js += 'const SND_LOOPS = ' + json.dumps(info) + ';\n'
js += 'const SND_TRIM = ' + json.dumps(trims) + ';\n'
js += 'const SND_CREDITS = ' + json.dumps(sorted({(c[1], c[2], c[3]) for c in credits}, key=lambda c: c[1].lower())) + ';\n'
js += 'const SND_DATA = {\n' + ',\n'.join(f'  {k}: "{v}"' for k, v in data.items()) + '\n};\n'
open(sys.argv[3], 'w').write(js)
print('sounds', len(data), 'mp3 bytes', total, 'js bytes', len(js))

import sys, subprocess, numpy as np
# prints a 50 ms RMS envelope for each file: digits 0-9 = loudness (each step ~6 dB below peak)
win = float(sys.argv[1]) if sys.argv[1].replace('.', '').isdigit() else 0.05
files = sys.argv[2:] if win != 0.05 or sys.argv[1].replace('.', '').isdigit() else sys.argv[1:]
for f in files:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32); n = int(22050 * win)
    r = np.array([np.sqrt(np.mean(x[i:i + n] ** 2) + 1e-12) for i in range(0, len(x) - n + 1, n)])
    db = 20 * np.log10(r / r.max())
    s = ''.join(str(max(0, min(9, int(9 + d / 6)))) for d in db)
    print(f.split('/')[-1][:12].ljust(12), f'{len(x)/22050:5.2f}s', s[:220])

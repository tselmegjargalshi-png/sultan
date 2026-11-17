# Decodes every table QR PNG and checks that it encodes <base>/?table=N
# pip install zxing-cpp pillow && python3 scripts/verify-table-qr.py https://sultansofrasi.vercel.app 30
import sys, zxingcpp
from PIL import Image
base = (sys.argv[1] if len(sys.argv) > 1 else 'https://sultansofrasi.vercel.app').rstrip('/')
n = int(sys.argv[2]) if len(sys.argv) > 2 else 30
bad = 0
for i in range(1, n + 1):
    got = [r.text for r in zxingcpp.read_barcodes(Image.open(f'assets/qr/tables/masa-{i}.png'))]
    ok = got == [f'{base}/?table={i}']
    bad += not ok
    if not ok: print('FAIL', i, got)
print('all ok' if not bad else f'{bad} failed', f'({n} codes)')

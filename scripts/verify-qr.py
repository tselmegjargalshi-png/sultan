"""Decode every PNG in assets/qr at several sizes with ZXing (pip install zxing-cpp pillow)."""
import glob, sys, zxingcpp
from PIL import Image
ok = True
for f in sorted(glob.glob('assets/qr/*.png')):
    im = Image.open(f)
    for sc in (1, 0.5, 0.25, 0.15):
        r = zxingcpp.read_barcodes(im.resize((int(im.width * sc), int(im.height * sc))))
        txt = r[0].text if r else None
        print(f, sc, txt or 'FAILED')
        ok &= bool(txt)
sys.exit(0 if ok else 1)

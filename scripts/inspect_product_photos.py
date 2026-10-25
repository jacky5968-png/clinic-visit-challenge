"""Create QA-only contact sheets; source photographs are never modified."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [ROOT.parent / '產品照片', Path('C:/Users/acer/我的雲端硬碟/生達2026/啄木鳥seminar/產品照片'), Path('C:/Users/acer/我的雲端硬碟/生達2026/2026月初會/202606月初會/教育訓練')]
files = list(SOURCES[0].glob('*.jpg')) + list(SOURCES[1].glob('*.jpg')) + [p for p in SOURCES[2].glob('Apolam*') if p.suffix.lower() in ['.jpg','.png']]
out = ROOT / 'output' / 'photo-review'
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 17)
for offset in range(0,len(files),9):
    sheet = Image.new('RGB',(1350,1080),'#f7f9f6')
    draw = ImageDraw.Draw(sheet)
    for i,path in enumerate(files[offset:offset+9]):
        x,y=(i%3)*450,(i//3)*360
        with Image.open(path) as im:
            preview=ImageOps.contain(im.convert('RGB'),(425,285))
            sheet.paste(preview,(x+(450-preview.width)//2,y+35+(285-preview.height)//2))
        draw.text((x+10,y+7),path.name,fill='#183e3b',font=font)
        draw.text((x+10,y+325),f'{offset+i+1} · {path.parent.name}',fill='#607a67',font=font)
    target=out/f'contact-{offset//9+1}.jpg'
    sheet.save(target,quality=93)
    print(target)

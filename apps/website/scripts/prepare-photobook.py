from pathlib import Path
from pypdf import PdfReader,PdfWriter
from PIL import Image,ImageOps
import re,json,hashlib,argparse
parser=argparse.ArgumentParser(description='Prepare the approved NMA Ogun working-edition photobook. Run from the website directory.')
parser.add_argument('source',type=Path)
src=parser.parse_args().source
r=PdfReader(src);root=Path('public/photobook');(root/'images').mkdir(parents=True,exist_ok=True);(root/'thumbs').mkdir(exist_ok=True)
photos=[]
overrides={44:'Decorated event hall at NMA House. Photograph date unconfirmed.',46:'NMA Ogun State Officers Committee poster for the 2026–2028 administration.',48:'Two attendees pictured together. Occasion and photograph date unconfirmed.'}
for number,page in enumerate(r.pages,1):
 if number==1:continue
 images=list(page.images)
 if not images:continue
 picture=max(images,key=lambda i:i.image.width*i.image.height);img=ImageOps.exif_transpose(picture.image).convert('RGB');img.thumbnail((1600,1600))
 image=f'/photobook/images/page-{number:02}.webp';thumb=f'/photobook/thumbs/page-{number:02}.webp';img.save(Path('public'+image),'WEBP',quality=85,method=6)
 small=img.copy();small.thumbnail((640,640));small.save(Path('public'+thumb),'WEBP',quality=80,method=6)
 caption=' '.join((page.extract_text() or '').split());caption=re.sub(r'NMA\s+OGUN\s+PHOTOBOOK\s+2026[-–]2028.*$','',caption).strip()
 for a,b in [('Doctors�','Doctors’'),('Physicians�','Physicians’'),('Director�s','Director’s'),('day�s','day’s')]:caption=caption.replace(a,b)
 caption=caption.replace('�','–').replace('RANDOM PICTURE','').strip();caption=overrides.get(number,caption)
 photos.append({'page':number,'src':image,'thumbnail':thumb,'width':img.width,'height':img.height,'thumbnailWidth':small.width,'caption':caption,'alt':caption,'search':caption.lower()})
# Preserve every page and all original captions; only recompress large embedded photographs.
w=PdfWriter();w.clone_document_from_reader(r)
for page in w.pages:
 for item in list(page.images):
  if max(item.image.size)>1800:
   im=ImageOps.exif_transpose(item.image).convert('RGB');im.thumbnail((1800,1800));item.replace(im,quality=85,optimize=True)
 page.compress_content_streams()
pdf=root/'nma-ogun-photobook-2026-working-edition.pdf'
w.add_metadata({'/Title':'NMA Ogun Photobook 2026–2028 — Working Edition','/Subject':'Photographic activities documented through 20 October 2026. Source captions and provisional dates retained.'})
with pdf.open('wb') as f:w.write(f)
# Repack the page tree after embedded-image replacement to normalise cross references.
repacked=PdfWriter()
for page in PdfReader(pdf).pages:repacked.add_page(page)
repacked.add_metadata({'/Title':'NMA Ogun Photobook 2026–2028 — Working Edition'})
with pdf.open('wb') as f:repacked.write(f)
if any(a.extract_text()!=b.extract_text() for a,b in zip(r.pages,PdfReader(pdf).pages)):raise RuntimeError('Source caption text changed')
if len(PdfReader(pdf).pages)!=61 or pdf.stat().st_size>24*1024*1024:raise RuntimeError('PDF size or page count check failed')
metadata={'title':'NMA Ogun in pictures','edition':'2026–2028 administration · July–October 2026 working edition','pdf':'/photobook/nma-ogun-photobook-2026-working-edition.pdf','pdfBytes':pdf.stat().st_size,'pageCount':61,'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'photos':photos}
Path('src/data/photobook.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'photographs':len(photos),'pdfPages':61,'pdfMegabytes':round(pdf.stat().st_size/1024/1024,2),'originalUnchanged':True}))

# Apply approved public-caption style after preparing the source edition.
import runpy
runpy.run_path("scripts/clean-photobook-captions.py")

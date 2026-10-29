"""Apply Secretariat-approved descriptive captions to the public PDF. Source resource is unchanged."""
from pathlib import Path
from io import BytesIO
import json,re
from pypdf import PdfReader,PdfWriter
from pypdf.generic import NameObject
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit

metadata=Path('src/data/photobook.json')
book=json.loads(metadata.read_text(encoding='utf-8'))
for photo in book['photos']:
 caption=photo['caption']
 if photo['page']==7:caption='Handover by the past Executive at NMA House, Abeokuta.'
 caption=re.sub(r'; photograph (?:day|date) (?:unconfirmed|provisional)\.', '.',caption,flags=re.I)
 caption=re.sub(r'\s*[—–-]\s*photograph date unconfirmed\.', '.',caption,flags=re.I)
 caption=re.sub(r'\s*(?:Occasion and )?[Pp]hotograph date unconfirmed\.', '',caption)
 photo.update(caption=caption,alt=caption,search=caption.lower())
path=Path('public'+book['pdf']);reader=PdfReader(path);writer=PdfWriter()
font=Path('C:/Windows/Fonts/arial.ttf')
if font.exists():pdfmetrics.registerFont(TTFont('PhotobookCaption',str(font)));face='PhotobookCaption'
else:face='Helvetica'
changed=[]
for number,page in enumerate(reader.pages,1):
 if re.search('unconfirmed|provisional',page.extract_text() or '',re.I):
  # Preserve image drawing operations and replace this page's caption/footer text.
  stream=page.get_contents();operations=[];inside=False
  for args,op in stream.operations:
   if op==b'BT':inside=True;continue
   if op==b'ET':inside=False;continue
   if not inside:operations.append((args,op))
  stream.operations=operations;page[NameObject('/Contents')]=stream
  width,height=float(page.mediabox.width),float(page.mediabox.height)
  overlay=BytesIO();c=canvas.Canvas(overlay,pagesize=(width,height));c.setFont(face,width*0.013)
  caption=next(p['caption'] for p in book['photos'] if p['page']==number)
  for index,line in enumerate(simpleSplit(caption,face,width*0.013,width*0.86)):
   c.drawCentredString(width/2,height*0.205-index*width*0.019,line)
  c.setFont(face,width*0.010);c.drawCentredString(width/2,height*0.04,'NMA OGUN PHOTOBOOK 2026–2028')
  c.save();page.merge_page(PdfReader(overlay).pages[0]);changed.append(number)
 writer.add_page(page)
writer.add_metadata({'/Title':'NMA Ogun Photobook 2026–2028 — Working Edition'})
if changed:
 with path.open('wb') as out:writer.write(out)
check=PdfReader(path)
assert len(check.pages)==61
assert not any(re.search('unconfirmed|provisional',p.extract_text() or '',re.I) for p in check.pages)
book['pdfBytes']=path.stat().st_size
metadata.write_text(json.dumps(book,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PDF captions updated on pages:',changed)

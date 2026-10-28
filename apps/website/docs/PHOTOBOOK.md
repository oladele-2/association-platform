# NMA Ogun photobook

The public feature at `/photobook` uses the supplied **NMA PHOTOBOOK ....WORK IN PROGRESS 16.10.26, SATURDAY.pdf**. Although the filename names 16 October, the 61-page document includes activities through 20 October 2026. It records the opening months of the 2026–2028 administration, not the complete tenure. The working-edition label and provisional/unconfirmed dates must remain visible.

## Published material

- Eight themed albums contain 58 curated photographs, with source captions, full-size viewing and page references.
- Six factual photo reports are approved website baseline articles. They enter the existing release merge, news search and sitemap without writing into the portal database. Existing portal ownership and withdrawal rules continue to apply.
- Homepage highlights, two additional slides, and supporting material on About, History, Executives, Facilities and Physicians’ Week link to the archive.
- The downloadable web PDF preserves all 61 pages and their extracted text. Its embedded images are recompressed; the original resource is unchanged. The web file is about 15.7 MiB, below the static asset upload limit.

The online selection excludes page 46 (officer poster, which may include contact information) and page 48 (unidentified occasion). Both remain in the complete supplied publication. No identities, clinical outcomes, attendance totals or policy commitments have been inferred from photographs.

## Updating the edition

Run `python scripts/prepare-photobook.py "path/to/approved.pdf"` from the website directory with pypdf and Pillow installed. This edition-specific script expects 61 pages and verifies source text preservation; revise the curation and validation deliberately for a new edition. Generated metadata is in `src/data/photobook.json`; curation is in `photobook-content.mjs`; report text is in `photobook-stories.json` and the publication baseline. Keep these in agreement. Recheck the two slideshow assets when replacing source photos.

Render representative PDF pages for visual review, run the website and standalone publication checks, then deploy through the existing GitHub workflow. The PDF opens directly or downloads, rather than embedding an iframe. Photograph files and the PDF are static website assets; browsing them does not query Neon. Deployment remains manual/on-push, with no scheduled publication polling added.

The deployed repository is `oladele-2/nma-ogun-website`; the website source is also mirrored into `association-platform/apps/website`. Publish from the deployed repository to avoid two competing deployment sources.

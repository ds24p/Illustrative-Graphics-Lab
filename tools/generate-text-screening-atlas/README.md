# Text Screening glyph atlas

`TextAtlasGenerator.pde` recreates the original course `createFontImages()`
loop and packs its 8 intensity levels by 26 uppercase letters into one PNG.

The source font is the original:

`AbadiMT-CondensedExtraBold-20.vlw`

Rows use the effective Processing font sizes `3, 5, 7, 9, 11, 13, 15, 17`.
Every atlas tile is `8 x 14` pixels. The generated PNG is copied to:

`src/experiments/screening/assets/glyphs/text-screening-atlas.png`

The web application never renders browser fonts at runtime. It decodes this
fixed asset into numeric grayscale glyph rasters.

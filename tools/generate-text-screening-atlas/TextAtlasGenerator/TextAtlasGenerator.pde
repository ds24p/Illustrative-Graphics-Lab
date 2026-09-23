final int CELL_WIDTH = 8;
final int CELL_HEIGHT = 14;
final int LEVEL_COUNT = 8;
final int CHARACTER_COUNT = 26;

PFont sourceFont;

void setup() {
  size(208, 112);
  pixelDensity(1);
  background(255);
  sourceFont = loadFont("AbadiMT-CondensedExtraBold-20.vlw");

  PGraphics glyph = createGraphics(CELL_WIDTH, CELL_HEIGHT);
  glyph.beginDraw();

  for (int level = 0; level < LEVEL_COUNT; ++level) {
    int mapSize = 5 + 2 * level;
    int effectiveFontSize = mapSize - 2;

    for (int characterIndex = 0; characterIndex < CHARACTER_COUNT; ++characterIndex) {
      glyph.textFont(sourceFont, effectiveFontSize);
      glyph.background(255);
      glyph.stroke(0);
      glyph.fill(0);
      glyph.textAlign(CENTER, CENTER);
      glyph.text(
        (char) ('A' + characterIndex),
        CELL_WIDTH / 2 - 1,
        CELL_HEIGHT / 2 - 2
      );

      image(
        glyph.get(0, 0, CELL_WIDTH, CELL_HEIGHT),
        characterIndex * CELL_WIDTH,
        level * CELL_HEIGHT
      );
    }
  }

  glyph.endDraw();
  save("text-screening-atlas.png");
  exit();
}

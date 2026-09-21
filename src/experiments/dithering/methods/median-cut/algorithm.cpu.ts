import type { RgbColor } from "../../palettes";
import type { RgbaImage } from "../../types";

export const MAX_MEDIAN_CUT_SAMPLES = 65_536;

type ColorChannel = "red" | "green" | "blue";

interface ColorBox {
  colors: RgbColor[];
}

interface BoxAnalysis {
  splitChannel: ColorChannel;
  largestRange: number;
}

function analyzeBox(box: ColorBox): BoxAnalysis {
  let minimumRed = 255;
  let minimumGreen = 255;
  let minimumBlue = 255;
  let maximumRed = 0;
  let maximumGreen = 0;
  let maximumBlue = 0;

  for (const color of box.colors) {
    minimumRed = Math.min(minimumRed, color.red);
    minimumGreen = Math.min(minimumGreen, color.green);
    minimumBlue = Math.min(minimumBlue, color.blue);
    maximumRed = Math.max(maximumRed, color.red);
    maximumGreen = Math.max(maximumGreen, color.green);
    maximumBlue = Math.max(maximumBlue, color.blue);
  }

  const ranges: Record<ColorChannel, number> = {
    red: maximumRed - minimumRed,
    green: maximumGreen - minimumGreen,
    blue: maximumBlue - minimumBlue,
  };
  let splitChannel: ColorChannel = "red";
  if (ranges.green > ranges[splitChannel]) splitChannel = "green";
  if (ranges.blue > ranges[splitChannel]) splitChannel = "blue";
  return { splitChannel, largestRange: ranges[splitChannel] };
}

function compareColors(first: RgbColor, second: RgbColor, channel: ColorChannel) {
  const primaryDifference = first[channel] - second[channel];
  if (primaryDifference !== 0) return primaryDifference;
  if (first.red !== second.red) return first.red - second.red;
  if (first.green !== second.green) return first.green - second.green;
  return first.blue - second.blue;
}

function findBoxToSplit(boxes: ColorBox[]) {
  let selectedIndex = -1;
  let selectedRange = -1;
  let selectedColorCount = -1;
  let selectedChannel: ColorChannel = "red";

  boxes.forEach((box, index) => {
    if (box.colors.length < 2) return;
    const analysis = analyzeBox(box);
    if (analysis.largestRange === 0) return;
    if (
      analysis.largestRange > selectedRange ||
      (analysis.largestRange === selectedRange &&
        box.colors.length > selectedColorCount)
    ) {
      selectedIndex = index;
      selectedRange = analysis.largestRange;
      selectedColorCount = box.colors.length;
      selectedChannel = analysis.splitChannel;
    }
  });

  return { selectedIndex, selectedChannel };
}

function representativeColor(box: ColorBox): RgbColor {
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const color of box.colors) {
    red += color.red;
    green += color.green;
    blue += color.blue;
  }
  return {
    red: Math.round(red / box.colors.length),
    green: Math.round(green / box.colors.length),
    blue: Math.round(blue / box.colors.length),
  };
}

function sampleSourceColors(source: RgbaImage): RgbColor[] {
  const pixelCount = source.width * source.height;
  const stride = Math.max(1, Math.ceil(pixelCount / MAX_MEDIAN_CUT_SAMPLES));
  const colors: RgbColor[] = [];

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += stride) {
    const pixel = pixelIndex * 4;
    if (source.data[pixel + 3] === 0) continue;
    colors.push({
      red: source.data[pixel],
      green: source.data[pixel + 1],
      blue: source.data[pixel + 2],
    });
  }

  return colors;
}

export function generateMedianCutPalette(
  source: RgbaImage,
  requestedSize: number,
): RgbColor[] {
  if (!Number.isInteger(requestedSize) || requestedSize < 1) {
    throw new Error("Median Cut palette size must be a positive integer.");
  }

  const sampledColors = sampleSourceColors(source);
  if (sampledColors.length === 0) return [{ red: 0, green: 0, blue: 0 }];
  const boxes: ColorBox[] = [{ colors: sampledColors }];

  while (boxes.length < requestedSize) {
    const { selectedIndex, selectedChannel } = findBoxToSplit(boxes);
    if (selectedIndex < 0) break;

    const sortedColors = [...boxes[selectedIndex].colors].sort((first, second) =>
      compareColors(first, second, selectedChannel),
    );
    const splitIndex = Math.floor(sortedColors.length / 2);
    boxes.splice(
      selectedIndex,
      1,
      { colors: sortedColors.slice(0, splitIndex) },
      { colors: sortedColors.slice(splitIndex) },
    );
  }

  return boxes.map(representativeColor);
}

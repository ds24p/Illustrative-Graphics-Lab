import { loadImageSource } from "../../../core/images/loadImage";
import kernel2Url from "../assets/kernels/2.png";
import kernel3Url from "../assets/kernels/3.png";
import angelaUrl from "../assets/kernels/angela.png";
import smileyUrl from "../assets/kernels/smiley.png";

export interface BuiltInKernelDefinition {
  id: string;
  label: string;
  src: string;
}

export const builtInKernels: BuiltInKernelDefinition[] = [
  { id: "kernel-2", label: "Ink Arch", src: kernel2Url },
  { id: "kernel-3", label: "Alternating Diagonal Gradients", src: kernel3Url },
  { id: "angela", label: "Angela Portrait", src: angelaUrl },
  { id: "smiley", label: "Smiley Face", src: smileyUrl },
];

const decodedKernelCache = new Map<string, Promise<ImageData>>();

export function getBuiltInKernel(id: string) {
  return builtInKernels.find((kernel) => kernel.id === id);
}

export async function loadBuiltInKernelImage(id: string) {
  const definition = getBuiltInKernel(id);
  if (!definition) throw new Error(`Unknown built-in kernel: ${id}.`);

  let pending = decodedKernelCache.get(id);
  if (!pending) {
    pending = loadImageSource(definition.src, definition.label, {
      resizeMaxEdge: 4096,
    }).then((source) => source.imageData);
    decodedKernelCache.set(id, pending);
  }

  try {
    return await pending;
  } catch (error) {
    decodedKernelCache.delete(id);
    throw error;
  }
}

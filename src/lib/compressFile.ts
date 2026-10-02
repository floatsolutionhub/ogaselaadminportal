/** Longest edge for uploaded images - sharp enough for documents, small enough to upload fast. */
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.8;

/** PDFs can't be meaningfully recompressed in the browser, so they're capped instead. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export class FileTooLargeError extends Error {}

/**
 * Every file is compressed in the browser before upload - never send a camera original.
 * Raster images are re-encoded as JPEG (longest edge MAX_EDGE, white behind transparency);
 * SVG/GIF are left as-is (vector / animated); PDFs and other files must be under MAX_PDF_BYTES.
 */
export async function compressForUpload(file: File): Promise<File> {
  const isRaster = file.type.startsWith("image/") && file.type !== "image/svg+xml" && file.type !== "image/gif";
  if (!isRaster) {
    if (file.size > MAX_PDF_BYTES) {
      throw new FileTooLargeError("That file is over 10MB. Choose a smaller one.");
    }
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) return file;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) return file;

  // Keep the original if it was already smaller (e.g. a tiny, well-compressed JPEG).
  if (blob.size >= file.size && file.type === "image/jpeg") return file;
  const name = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

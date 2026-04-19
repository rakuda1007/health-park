/**
 * Client-side OCR for prescription images (Tesseract.js).
 * Recognition runs locally; first run may download WASM/language data via CDN.
 */

export type OcrProgressInfo = {
  /** 0–1 */
  progress: number;
  status: string;
};

export async function runPrescriptionOcr(
  image: Blob | File,
  onProgress?: (info: OcrProgressInfo) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("jpn+eng", undefined, {
    logger: (m) => {
      if (typeof m.progress === "number" && m.status) {
        onProgress?.({ progress: m.progress, status: m.status });
      }
    },
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text?.trim() ?? "";
  } finally {
    await worker.terminate();
  }
}

/** Split OCR text into non-empty lines (one line per medicine name draft). */
export function splitOcrLinesForMedicines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

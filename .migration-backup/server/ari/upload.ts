import { Router } from "express";
import multer from "multer";
import { requireAriClinician } from "./license";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
]);

const MAX_FILES_PER_UPLOAD = 4;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const PDF_TEXT_MAX = 50_000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: MAX_FILES_PER_UPLOAD,
  },
});

export const ariUploadRouter = Router();

ariUploadRouter.post(
  "/upload",
  requireAriClinician,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const file = req.file;
    const headerMime = file.mimetype;
    if (!ALLOWED_MIME.has(headerMime)) {
      return res
        .status(415)
        .json({ message: `Unsupported file type: ${headerMime}` });
    }

    const sniffed = sniffMime(file.buffer, file.originalname);
    if (sniffed && sniffed !== headerMime) {
      return res.status(415).json({
        message: `File content (${sniffed}) does not match declared type (${headerMime}).`,
      });
    }

    if (headerMime.startsWith("image/")) {
      return res.json({
        type: "image",
        mediaType: headerMime,
        data: file.buffer.toString("base64"),
        filename: file.originalname,
        sizeBytes: file.size,
      });
    }

    if (headerMime === "application/pdf") {
      try {
        // Lazy-import pdf-parse to keep cold-start cheap and to avoid loading
        // a CJS package's debug-mode test code at process start.
        const pdfParseMod: any = await import("pdf-parse");
        const pdfParse =
          typeof pdfParseMod === "function"
            ? pdfParseMod
            : pdfParseMod.default || pdfParseMod;
        const result = await pdfParse(file.buffer);
        let text = String(result?.text || "");
        let truncated = false;
        if (text.length > PDF_TEXT_MAX) {
          text = text.slice(0, PDF_TEXT_MAX) + "\n\n[truncated]";
          truncated = true;
        }
        return res.json({
          type: "document",
          mediaType: "application/pdf",
          data: file.buffer.toString("base64"),
          textPreview: text,
          truncated,
          filename: file.originalname,
          sizeBytes: file.size,
          pageCount: typeof result?.numpages === "number" ? result.numpages : undefined,
        });
      } catch (err: any) {
        return res
          .status(422)
          .json({ message: "Failed to parse PDF: " + (err?.message || "unknown") });
      }
    }

    if (headerMime === "text/plain") {
      const text = file.buffer.toString("utf-8");
      return res.json({
        type: "document",
        mediaType: "text/plain",
        data: text,
        textPreview: text.slice(0, 800),
        filename: file.originalname,
        sizeBytes: file.size,
      });
    }

    // Unreachable — ALLOWED_MIME guards above.
    return res.status(415).json({ message: "Unsupported file type." });
  }
);

/**
 * Lightweight magic-byte sniffer. Returns the most likely real MIME type or
 * null if we can't tell. Sufficient to catch obvious cases of a renamed-file
 * upload (e.g. .pdf with a JPEG header).
 */
function sniffMime(buf: Buffer, filename: string): string | null {
  if (buf.length >= 4) {
    const head4 = buf.slice(0, 4);
    if (head4[0] === 0x25 && head4[1] === 0x50 && head4[2] === 0x44 && head4[3] === 0x46) {
      return "application/pdf";
    }
    if (head4[0] === 0x89 && head4[1] === 0x50 && head4[2] === 0x4e && head4[3] === 0x47) {
      return "image/png";
    }
    if (head4[0] === 0xff && head4[1] === 0xd8 && head4[2] === 0xff) {
      return "image/jpeg";
    }
    // GIF: GIF87a / GIF89a
    if (
      head4[0] === 0x47 &&
      head4[1] === 0x49 &&
      head4[2] === 0x46 &&
      head4[3] === 0x38
    ) {
      return "image/gif";
    }
    // WEBP: RIFF....WEBP
    if (
      buf.length >= 12 &&
      head4[0] === 0x52 &&
      head4[1] === 0x49 &&
      head4[2] === 0x46 &&
      head4[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    ) {
      return "image/webp";
    }
  }
  // Plain text — assume by extension since text has no reliable magic bytes.
  if (/\.txt$/i.test(filename)) return "text/plain";
  return null;
}

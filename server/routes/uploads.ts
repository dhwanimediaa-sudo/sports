import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();
const UPLOAD_DIR = path.resolve(process.cwd(), process.env.STORAGE_PATH || 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validate SVG content for malicious active scripts/payloads
 */
function isSafeSvg(svgContent: string): { safe: boolean; reason?: string } {
  const normalized = svgContent.toLowerCase();
  const dangerousPatterns = [
    /<script\b/i,
    /javascript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    /onmouseover\s*=/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<foreignobject\b/i,
    /xlink:href\s*=\s*['"]\s*javascript:/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(normalized)) {
      return { safe: false, reason: 'Unsafe SVG content detected. Scripts and active handlers are forbidden.' };
    }
  }

  return { safe: true };
}

/**
 * GET /api/uploads/info
 * File Storage Info & Directory Status
 */
router.get('/info', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  let fileCount = 0;
  let totalBytes = 0;

  if (fs.existsSync(UPLOAD_DIR)) {
    const files = fs.readdirSync(UPLOAD_DIR);
    fileCount = files.length;
    files.forEach((file) => {
      try {
        const stats = fs.statSync(path.join(UPLOAD_DIR, file));
        totalBytes += stats.size;
      } catch {
        // ignore unreadable
      }
    });
  }

  res.json({
    storagePath: UPLOAD_DIR,
    fileCount,
    totalSizeBytes: totalBytes,
    status: 'Ready for Team Logos, Player Photos, Tournament Banners & Graphics Assets',
  });
});

/**
 * POST /api/uploads
 * Secure file upload with strict MIME, extension, size, path traversal & SVG sanitization
 */
router.post(['/', '/image'], requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { fileName, fileContent, mimeType } = req.body;

    if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
      res.status(400).json({ error: 'File name is required.' });
      return;
    }

    if (!fileContent || typeof fileContent !== 'string') {
      res.status(400).json({ error: 'File content (Base64) is required.' });
      return;
    }

    // Path traversal check
    if (
      fileName.includes('..') ||
      fileName.includes('/') ||
      fileName.includes('\\') ||
      fileName.includes('\0')
    ) {
      res.status(400).json({ error: 'Path traversal or invalid filename rejected.' });
      return;
    }

    const ext = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      res.status(400).json({
        error: `Invalid file extension "${ext}". Allowed formats: PNG, JPG, JPEG, WEBP, SVG.`,
      });
      return;
    }

    const cleanMime = (mimeType || '').toLowerCase().trim();
    if (cleanMime && !ALLOWED_MIME_TYPES.has(cleanMime)) {
      res.status(400).json({
        error: `Invalid MIME type "${cleanMime}". Allowed image MIME types only.`,
      });
      return;
    }

    // Decode base64 payload
    const base64Data = fileContent.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length === 0) {
      res.status(400).json({ error: 'Empty file payload.' });
      return;
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      res.status(400).json({
        error: `File size exceeds the 5MB maximum limit. Received ${(buffer.length / 1024 / 1024).toFixed(2)} MB.`,
      });
      return;
    }

    // SVG active content inspection
    if (ext === '.svg' || cleanMime === 'image/svg+xml') {
      const svgText = buffer.toString('utf-8');
      const check = isSafeSvg(svgText);
      if (!check.safe) {
        res.status(400).json({ error: check.reason });
        return;
      }
    }

    // Generate safe UUID-based file name to eliminate collision and traversal risks
    const safeGeneratedName = `${crypto.randomUUID()}${ext}`;
    const destinationPath = path.join(UPLOAD_DIR, safeGeneratedName);

    fs.writeFileSync(destinationPath, buffer);

    res.status(201).json({
      message: 'File uploaded successfully.',
      fileName: safeGeneratedName,
      originalName: path.basename(fileName),
      url: `/uploads/${safeGeneratedName}`,
      sizeBytes: buffer.length,
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Failed to process file upload.' });
  }
});

export default router;

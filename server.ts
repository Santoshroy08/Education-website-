import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT || 3000);
const OWNER_EMAIL = 'snroy963197@gmail.com';
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const PDF_DIR = path.join(UPLOADS_DIR, 'pdfs');
const VIDEO_DIR = path.join(UPLOADS_DIR, 'videos');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const DOUBTS_FILE = path.join(DATA_DIR, 'doubts.json');
const SECRET_FILE = path.join(DATA_DIR, '.session_secret');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(PDF_DIR, { recursive: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, secret, 'utf8');
  return secret;
}

const SESSION_SECRET = getSessionSecret();

function getFirebaseApiKey(): string {
  try {
    const raw = fs.readFileSync(path.join(ROOT_DIR, 'firebase-applet-config.json'), 'utf8');
    const parsed = JSON.parse(raw) as { apiKey?: string };
    return parsed.apiKey || '';
  } catch {
    return '';
  }
}

interface StudentRecord {
  loginId: string;
  fullName: string;
  email: string;
  phone: string;
  targetExam: string;
  plan: 'free' | 'foundation' | 'pro' | 'scholar';
  status: 'pending' | 'active' | 'suspended';
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
  otpVerified?: boolean;
  privacyMode?: boolean;
  tokenVersion?: number;
}

interface PlatformSettings {
  autoApproveStudents: boolean;
}

interface LiveDoubtRecord {
  id: string;
  classId: string;
  authorName: string;
  authorBadge: string;
  question: string;
  reply?: string;
  createdAt: string;
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

const writeQueues = new Map<string, Promise<void>>();
function persistJsonAsync<T>(filePath: string, data: T): void {
  const payload = JSON.stringify(data, null, 2);
  const prev = writeQueues.get(filePath) || Promise.resolve();
  const next = prev
    .then(async () => {
      const tmp = `${filePath}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmp, payload, 'utf8');
      await fs.promises.rename(tmp, filePath);
    })
    .catch((err) => {
      console.error(`Async persist warning for ${path.basename(filePath)}:`, err);
    });
  writeQueues.set(filePath, next);
}

function ensureSamplePdf(): void {
  const samplePath = path.join(PDF_DIR, 'takshila_calculus_notes_sample.pdf');
  if (fs.existsSync(samplePath)) return;

  // Minimal valid PDF 1.4 document with clean study summary text
  const contentStream = [
    'BT',
    '/F1 18 Tf',
    '54 740 Td',
    '(Radha Education - Study Notes Sample) Tj',
    '/F1 11 Tf',
    '0 -28 Td',
    '(Course: Foundation Mathematics & Calculus  |  Chapter 01: Limits & Continuity) Tj',
    '0 -24 Td',
    '(1. Epsilon-Delta Definition: For every e > 0 there exists d > 0 such that |f(x) - L| < e.) Tj',
    '0 -18 Td',
    '(2. Sandwich Theorem: If g(x) <= f(x) <= h(x) and lim g(x) = lim h(x) = L, then lim f(x) = L.) Tj',
    '0 -18 Td',
    '(3. Practice Problem: Evaluate lim (x->0) [sin(5x) / (3x)] = 5/3.) Tj',
    '0 -24 Td',
    '(Uploaded and managed exclusively via Radha Education Owner Console.) Tj',
    'ET'
  ].join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  fs.writeFileSync(samplePath, pdf, 'utf8');
}

ensureSamplePdf();

if (!fs.existsSync(SETTINGS_FILE)) {
  writeJson<PlatformSettings>(SETTINGS_FILE, { autoApproveStudents: false });
}
if (!fs.existsSync(STUDENTS_FILE)) {
  writeJson<StudentRecord[]>(STUDENTS_FILE, []);
}
if (!fs.existsSync(DOUBTS_FILE)) {
  writeJson<LiveDoubtRecord[]>(DOUBTS_FILE, [
    {
      id: 'doubt_seed_1',
      classId: 'live_dsa_graphs',
      authorName: 'Aarav Sharma',
      authorBadge: 'Cohort Pro',
      question: 'When should we prefer Dijkstra over Bellman-Ford for weighted directed graphs?',
      reply: 'Use Dijkstra whenever edge weights are non-negative (O((V+E) log V)). Switch to Bellman-Ford when negative weights or negative cycle detection is needed.',
      createdAt: new Date(Date.now() - 18 * 60000).toISOString()
    },
    {
      id: 'doubt_seed_2',
      classId: 'live_calculus_limits',
      authorName: 'Neha Verma',
      authorBadge: 'Foundation',
      question: 'Does L-Hopital rule apply if the limit gives 0/0 after substitution?',
      reply: 'Yes, provided both numerator and denominator are differentiable near the point and the limit of f\'(x)/g\'(x) exists.',
      createdAt: new Date(Date.now() - 9 * 60000).toISOString()
    }
  ]);
}

// In-memory write-through state store for sub-millisecond reads
let studentsStore: StudentRecord[] = readJson<StudentRecord[]>(STUDENTS_FILE, []);
let settingsStore: PlatformSettings = readJson<PlatformSettings>(SETTINGS_FILE, { autoApproveStudents: false });
let doubtsStore: LiveDoubtRecord[] = readJson<LiveDoubtRecord[]>(DOUBTS_FILE, []);

const studentsByLoginId = new Map<string, StudentRecord>();
const studentsByEmail = new Map<string, StudentRecord>();

function rebuildStudentIndexes(): void {
  studentsByLoginId.clear();
  studentsByEmail.clear();
  for (const s of studentsStore) {
    studentsByLoginId.set(s.loginId.toLowerCase(), s);
    studentsByEmail.set(s.email.toLowerCase(), s);
  }
}
rebuildStudentIndexes();

function commitStudents(nextList: StudentRecord[]): void {
  studentsStore = nextList;
  rebuildStudentIndexes();
  persistJsonAsync(STUDENTS_FILE, studentsStore);
}

function commitSettings(nextSettings: PlatformSettings): void {
  settingsStore = nextSettings;
  persistJsonAsync(SETTINGS_FILE, settingsStore);
}

function commitDoubts(nextDoubts: LiveDoubtRecord[]): void {
  doubtsStore = nextDoubts.slice(0, 200);
  persistJsonAsync(DOUBTS_FILE, doubtsStore);
}

function scryptAsync(password: string, salt: string, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  const derived = await scryptAsync(password, salt, 64);
  const storedBuf = Buffer.from(hashHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OWNER_TOKEN_CACHE_TTL_MS = 90 * 1000;

interface PendingOtpEntry {
  otpSessionId: string;
  email: string;
  phone: string;
  otpHash: string;
  expiresAt: number;
  createdAt: number;
  attemptsLeft: number;
}

const pendingOtps = new Map<string, PendingOtpEntry>();
const authRateWindow = new Map<string, { count: number; resetAt: number }>();
const ownerTokenCache = new Map<string, { email: string; uid: string; expiresAt: number }>();

// Sweep expired OTPs, rate-limit buckets, and token cache every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pendingOtps.entries()) {
    if (v.expiresAt < now) pendingOtps.delete(k);
  }
  for (const [k, v] of authRateWindow.entries()) {
    if (v.resetAt <= now) authRateWindow.delete(k);
  }
  for (const [k, v] of ownerTokenCache.entries()) {
    if (v.expiresAt <= now) ownerTokenCache.delete(k);
  }
}, 5 * 60 * 1000).unref();

function hashOtp(otpSessionId: string, otp: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(`${otpSessionId}:${otp}`).digest('hex');
}

function maskEmailAddress(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\s+/g, '');
  if (!digits) return '';
  if (digits.length <= 4) return '****';
  return `${digits.slice(0, 2)}${'*'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-2)}`;
}

function maskDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || 'Student';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function checkRateLimit(req: Request, bucket: string, maxRequests = 20, windowMs = 10 * 60 * 1000): boolean {
  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip || 'local';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = authRateWindow.get(key);
  if (!entry || entry.resetAt <= now) {
    authRateWindow.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

function signStudentToken(loginId: string, tokenVersion = 1): string {
  const now = Date.now();
  const payload = Buffer.from(
    JSON.stringify({ loginId, ver: tokenVersion, iat: now, exp: now + TOKEN_TTL_MS })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyStudentToken(token: string | undefined): { loginId: string; ver: number } | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      loginId?: string;
      ver?: number;
      exp?: number;
    };
    if (!parsed.loginId) return null;
    if (typeof parsed.exp === 'number' && parsed.exp < Date.now()) return null;
    return { loginId: parsed.loginId, ver: typeof parsed.ver === 'number' ? parsed.ver : 1 };
  } catch {
    return null;
  }
}

const FIREBASE_API_KEY = getFirebaseApiKey();

async function verifyOwnerFirebaseToken(idToken: string | undefined): Promise<{ email: string; uid: string } | null> {
  if (!idToken || !FIREBASE_API_KEY) return null;

  const cacheKey = crypto.createHash('sha256').update(idToken).digest('hex');
  const cached = ownerTokenCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return { email: cached.email, uid: cached.uid };
  }

  try {
    const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (!user || user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase() || user.emailVerified !== true) {
      return null;
    }
    const verified = { email: user.email, uid: user.localId || '' };
    ownerTokenCache.set(cacheKey, {
      ...verified,
      expiresAt: now + OWNER_TOKEN_CACHE_TTL_MS
    });
    return verified;
  } catch {
    return null;
  }
}

function extractOwnerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (typeof req.query.ot === 'string' && req.query.ot.trim()) {
    return req.query.ot.trim();
  }
  return undefined;
}

function getAuthenticatedStudent(req: Request): StudentRecord | null {
  const cookieToken = req.cookies?.takshila_student as string | undefined;
  const headerToken = req.headers['x-student-token'] as string | undefined;
  const queryToken = typeof req.query.st === 'string' ? req.query.st : undefined;
  const decoded = verifyStudentToken(headerToken || cookieToken || queryToken);
  if (!decoded) return null;
  const student = studentsByLoginId.get(decoded.loginId.toLowerCase()) || null;
  if (!student) return null;
  if ((student.tokenVersion ?? 1) !== decoded.ver) return null;
  return student;
}

function setStudentAuthCookie(req: Request, res: Response, token: string): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('takshila_student', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(isHttps),
    maxAge: TOKEN_TTL_MS
  });
}

function sanitizeStudent(s: StudentRecord) {
  return {
    loginId: s.loginId,
    fullName: s.fullName,
    email: s.email,
    phone: s.phone,
    targetExam: s.targetExam,
    plan: s.plan,
    status: s.status,
    createdAt: s.createdAt,
    lastLoginAt: s.lastLoginAt || s.createdAt,
    otpVerified: Boolean(s.otpVerified),
    privacyMode: s.privacyMode !== false
  };
}

function generateNextLoginId(students: StudentRecord[]): string {
  let maxNum = 2600;
  for (const s of students) {
    const match = /^TK-(\d+)$/.exec(s.loginId);
    if (match) {
      const n = Number(match[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  return `TK-${maxNum + 1}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function requireOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractOwnerToken(req);
  const owner = await verifyOwnerFirebaseToken(token);
  if (!owner) {
    res.status(403).json({
      error: `Access denied. Only the website owner (${OWNER_EMAIL}) is authorized.`
    });
    return;
  }
  next();
}

function sanitizeBaseName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 48) || 'file';
  return `${base}_${Date.now()}${ext}`;
}

const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PDF_DIR),
    filename: (_req, file, cb) => cb(null, sanitizeBaseName(file.originalname))
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      cb(new Error('Only PDF files (.pdf) are allowed.'));
      return;
    }
    cb(null, true);
  }
});

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, VIDEO_DIR),
    filename: (_req, file, cb) => cb(null, sanitizeBaseName(file.originalname))
  }),
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.mp4', '.webm', '.mov', '.m4v'];
    if (!allowed.includes(ext) && !file.mimetype.startsWith('video/')) {
      cb(new Error('Only MP4, WebM, or MOV video files are allowed.'));
      return;
    }
    cb(null, true);
  }
});

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', 'weak');

  // Fast gzip compression for /api JSON responses + security/privacy headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    if (req.path.startsWith('/api/students') || req.path.startsWith('/api/admin')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
    }

    if (req.path.startsWith('/api/') && !req.path.startsWith('/api/media/')) {
      const acceptEnc = String(req.headers['accept-encoding'] || '');
      if (acceptEnc.includes('gzip')) {
        const origJson = res.json.bind(res);
        res.json = ((body: unknown) => {
          const raw = JSON.stringify(body);
          if (Buffer.byteLength(raw, 'utf8') > 512) {
            const compressed = zlib.gzipSync(raw, { level: 6 });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Vary', 'Accept-Encoding');
            res.setHeader('Content-Length', compressed.length);
            return res.send(compressed);
          }
          return origJson(body);
        }) as typeof res.json;
      }
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  // Fast Health Probe
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      uptimeSeconds: Math.round(process.uptime()),
      cachedStudents: studentsStore.length,
      cachedDoubts: doubtsStore.length
    });
  });

  // Step 1 of Registration: Generate & Dispatch 6-Digit Verification OTP
  app.post('/api/students/register/request-otp', (req, res) => {
    if (!checkRateLimit(req, 'register-otp', 15)) {
      res.status(429).json({ error: 'Too many OTP requests. Please wait a few minutes before retrying.' });
      return;
    }

    const body = (req.body || {}) as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    if (studentsByEmail.has(email)) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in with your Login ID.' });
      return;
    }

    const now = Date.now();
    for (const [key, existingOtp] of pendingOtps.entries()) {
      if (existingOtp.expiresAt < now) {
        pendingOtps.delete(key);
        continue;
      }
      if (existingOtp.email === email && now - existingOtp.createdAt < OTP_RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existingOtp.createdAt)) / 1000);
        res.status(429).json({ error: `Please wait ${waitSec}s before requesting another OTP.` });
        return;
      }
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpSessionId = crypto.randomBytes(16).toString('hex');
    pendingOtps.set(otpSessionId, {
      otpSessionId,
      email,
      phone,
      otpHash: hashOtp(otpSessionId, otp),
      expiresAt: now + OTP_TTL_MS,
      createdAt: now,
      attemptsLeft: 5
    });

    const maskedEmail = maskEmailAddress(email);
    const maskedPhone = phone ? maskPhoneNumber(phone) : '';
    const maskedTarget = maskedPhone ? `${maskedEmail} & ${maskedPhone}` : maskedEmail;

    res.json({
      ok: true,
      otpSessionId,
      maskedTarget,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      verificationCodePreview: otp
    });
  });

  // Step 2 of Registration: Verify OTP & Generate Personal Student Login ID
  app.post('/api/students/register', async (req, res) => {
    if (!checkRateLimit(req, 'register-verify', 20)) {
      res.status(429).json({ error: 'Too many registration attempts. Please try again shortly.' });
      return;
    }

    const body = (req.body || {}) as {
      fullName?: string;
      email?: string;
      phone?: string;
      targetExam?: string;
      plan?: string;
      password?: string;
      otpSessionId?: string;
      otp?: string;
    };

    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const targetExam = String(body.targetExam || '').trim() || 'General Cohort';
    const password = String(body.password || '');
    const otpSessionId = String(body.otpSessionId || '').trim();
    const otp = String(body.otp || '').trim();
    const requestedPlan = body.plan === 'foundation' || body.plan === 'pro' || body.plan === 'scholar'
      ? body.plan
      : 'free';

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    if (!otpSessionId || !/^\d{6}$/.test(otp)) {
      res.status(400).json({ error: 'Please enter the 6-digit verification OTP sent during registration.' });
      return;
    }

    const otpEntry = pendingOtps.get(otpSessionId);
    if (!otpEntry || otpEntry.email !== email) {
      res.status(400).json({ error: 'OTP session expired or invalid. Please request a new OTP.' });
      return;
    }
    if (otpEntry.expiresAt < Date.now()) {
      pendingOtps.delete(otpSessionId);
      res.status(400).json({ error: 'Your OTP has expired. Please request a fresh 6-digit OTP.' });
      return;
    }

    const expectedHash = hashOtp(otpSessionId, otp);
    const actualBuf = Buffer.from(otpEntry.otpHash, 'hex');
    const providedBuf = Buffer.from(expectedHash, 'hex');
    if (actualBuf.length !== providedBuf.length || !crypto.timingSafeEqual(actualBuf, providedBuf)) {
      otpEntry.attemptsLeft -= 1;
      if (otpEntry.attemptsLeft <= 0) {
        pendingOtps.delete(otpSessionId);
        res.status(400).json({ error: 'Too many incorrect OTP attempts. Please request a new OTP.' });
        return;
      }
      res.status(400).json({ error: `Incorrect OTP. ${otpEntry.attemptsLeft} attempt(s) remaining.` });
      return;
    }

    pendingOtps.delete(otpSessionId);

    if (studentsByEmail.has(email)) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in with your Login ID.' });
      return;
    }

    const loginId = generateNextLoginId(studentsStore);
    const nowIso = new Date().toISOString();

    const newStudent: StudentRecord = {
      loginId,
      fullName,
      email,
      phone,
      targetExam,
      plan: requestedPlan,
      status: settingsStore.autoApproveStudents ? 'active' : 'pending',
      passwordHash: await hashPassword(password),
      createdAt: nowIso,
      lastLoginAt: nowIso,
      otpVerified: true,
      privacyMode: true,
      tokenVersion: 1
    };

    commitStudents([newStudent, ...studentsStore]);

    const token = signStudentToken(loginId, 1);
    setStudentAuthCookie(req, res, token);

    res.status(201).json({
      student: sanitizeStudent(newStudent),
      studentToken: token
    });
  });

  // Student Login (by Login ID or Email + Password)
  app.post('/api/students/login', async (req, res) => {
    if (!checkRateLimit(req, 'student-login', 20)) {
      res.status(429).json({ error: 'Too many sign-in attempts. Please wait a few minutes.' });
      return;
    }

    const body = (req.body || {}) as { identifier?: string; password?: string };
    const identifier = String(body.identifier || '').trim();
    const password = String(body.password || '');

    if (!identifier || !password) {
      res.status(400).json({ error: 'Please enter your Student Login ID (or email) and password.' });
      return;
    }

    const normalized = identifier.toLowerCase();
    const student = studentsByLoginId.get(normalized) || studentsByEmail.get(normalized);

    if (!student || !(await verifyPassword(password, student.passwordHash))) {
      res.status(401).json({ error: 'Invalid Student Login ID or password.' });
      return;
    }

    if (student.status === 'suspended') {
      res.status(403).json({ error: 'This account has been suspended by the site owner.' });
      return;
    }

    student.lastLoginAt = new Date().toISOString();
    if (typeof student.tokenVersion !== 'number') student.tokenVersion = 1;
    commitStudents([...studentsStore]);

    const token = signStudentToken(student.loginId, student.tokenVersion);
    setStudentAuthCookie(req, res, token);

    res.json({
      student: sanitizeStudent(student),
      studentToken: token
    });
  });

  app.get('/api/students/me', (req, res) => {
    const student = getAuthenticatedStudent(req);
    if (!student) {
      res.json({ student: null });
      return;
    }
    res.json({ student: sanitizeStudent(student) });
  });

  app.patch('/api/students/me/privacy', (req, res) => {
    const student = getAuthenticatedStudent(req);
    if (!student) {
      res.status(401).json({ error: 'Please sign in first to update privacy settings.' });
      return;
    }
    const body = (req.body || {}) as { privacyMode?: boolean };
    if (typeof body.privacyMode !== 'boolean') {
      res.status(400).json({ error: 'Invalid privacyMode value.' });
      return;
    }
    student.privacyMode = body.privacyMode;
    commitStudents([...studentsStore]);
    res.json({ student: sanitizeStudent(student) });
  });

  app.post('/api/students/logout', (_req, res) => {
    res.clearCookie('takshila_student');
    res.json({ ok: true });
  });

  app.post('/api/students/logout-all', (req, res) => {
    const student = getAuthenticatedStudent(req);
    if (student) {
      student.tokenVersion = (student.tokenVersion ?? 1) + 1;
      commitStudents([...studentsStore]);
    }
    res.clearCookie('takshila_student');
    res.json({ ok: true });
  });

  app.delete('/api/students/me', (req, res) => {
    const student = getAuthenticatedStudent(req);
    if (!student) {
      res.status(401).json({ error: 'Please sign in first to delete your account.' });
      return;
    }
    commitStudents(studentsStore.filter((s) => s.loginId !== student.loginId));
    res.clearCookie('takshila_student');
    res.json({ ok: true });
  });

  // Owner-only Student Management & Settings
  app.get('/api/admin/students', requireOwner, (_req, res) => {
    res.json({
      students: studentsStore.map(sanitizeStudent),
      settings: settingsStore
    });
  });

  app.post('/api/admin/students', requireOwner, async (req, res) => {
    const body = (req.body || {}) as {
      fullName?: string;
      email?: string;
      phone?: string;
      targetExam?: string;
      plan?: string;
      password?: string;
    };

    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const targetExam = String(body.targetExam || '').trim() || 'Cohort Batch';
    const password = String(body.password || '') || 'takshila123';
    const plan = body.plan === 'foundation' || body.plan === 'pro' || body.plan === 'scholar'
      ? body.plan
      : 'pro';

    if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Valid student name and email are required.' });
      return;
    }

    if (studentsByEmail.has(email)) {
      res.status(409).json({ error: 'A student with this email already exists.' });
      return;
    }

    const loginId = generateNextLoginId(studentsStore);
    const created: StudentRecord = {
      loginId,
      fullName,
      email,
      phone,
      targetExam,
      plan,
      status: 'active',
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
      otpVerified: true,
      privacyMode: true,
      tokenVersion: 1
    };

    commitStudents([created, ...studentsStore]);
    res.status(201).json({ student: sanitizeStudent(created) });
  });

  app.patch('/api/admin/students/:loginId', requireOwner, (req, res) => {
    const { loginId } = req.params;
    const body = (req.body || {}) as { status?: string; plan?: string };
    const student = studentsByLoginId.get(String(loginId).toLowerCase());
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    if (body.status === 'active' || body.status === 'pending' || body.status === 'suspended') {
      student.status = body.status;
    }
    if (body.plan === 'free' || body.plan === 'foundation' || body.plan === 'pro' || body.plan === 'scholar') {
      student.plan = body.plan;
    }

    commitStudents([...studentsStore]);
    res.json({ student: sanitizeStudent(student) });
  });

  app.delete('/api/admin/students/:loginId', requireOwner, (req, res) => {
    const { loginId } = req.params;
    commitStudents(studentsStore.filter((s) => s.loginId !== loginId));
    res.json({ ok: true });
  });

  app.patch('/api/admin/settings', requireOwner, (req, res) => {
    const body = (req.body || {}) as { autoApproveStudents?: boolean };
    const nextSettings = { ...settingsStore };
    if (typeof body.autoApproveStudents === 'boolean') {
      nextSettings.autoApproveStudents = body.autoApproveStudents;
    }
    commitSettings(nextSettings);
    res.json({ settings: settingsStore });
  });

  // Owner-only PDF Upload
  app.post('/api/upload/pdf', requireOwner, (req, res) => {
    pdfUpload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'PDF upload failed.' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'Please select a PDF file to upload.' });
        return;
      }
      res.status(201).json({
        fileUrl: `/api/media/pdf/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSizeLabel: formatBytes(req.file.size)
      });
    });
  });

  // Owner-only Recorded Video Upload
  app.post('/api/upload/video', requireOwner, (req, res) => {
    videoUpload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Video upload failed.' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'Please select a video file (.mp4, .webm, .mov) to upload.' });
        return;
      }
      res.status(201).json({
        videoUrl: `/api/media/video/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSizeLabel: formatBytes(req.file.size)
      });
    });
  });

  // Protected PDF Serving (Owner OR Active Student OR Free Sample PDF)
  app.get('/api/media/pdf/:filename', async (req, res) => {
    const rawName = String(req.params.filename || '');
    const safeName = path.basename(rawName);
    if (!/^[a-zA-Z0-9_.-]+\.pdf$/i.test(safeName)) {
      res.status(400).json({ error: 'Invalid PDF filename.' });
      return;
    }
    const fullPath = path.join(PDF_DIR, safeName);
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(fullPath);
    } catch {
      res.status(404).json({ error: 'PDF file not found.' });
      return;
    }

    const isFreeSample = safeName === 'takshila_calculus_notes_sample.pdf';
    if (!isFreeSample) {
      const student = getAuthenticatedStudent(req);
      const owner = await verifyOwnerFirebaseToken(extractOwnerToken(req));
      if (!owner && (!student || student.status !== 'active')) {
        res.status(403).json({ error: 'Active student login or owner authorization required to access this PDF.' });
        return;
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const stream = fs.createReadStream(fullPath, { highWaterMark: 128 * 1024 });
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  });

  // Protected Recorded Video Streaming with Fast High-Watermark Range Seeking
  app.get('/api/media/video/:filename', async (req, res) => {
    const rawName = String(req.params.filename || '');
    const safeName = path.basename(rawName);
    if (!/^[a-zA-Z0-9_.-]+\.(mp4|webm|mov|m4v)$/i.test(safeName)) {
      res.status(400).json({ error: 'Invalid video filename.' });
      return;
    }
    const fullPath = path.join(VIDEO_DIR, safeName);
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(fullPath);
    } catch {
      res.status(404).json({ error: 'Recorded video file not found.' });
      return;
    }

    const student = getAuthenticatedStudent(req);
    const owner = await verifyOwnerFirebaseToken(extractOwnerToken(req));
    if (!owner && (!student || student.status !== 'active')) {
      res.status(403).json({ error: 'Active student login or owner authorization required to stream this video.' });
      return;
    }

    const fileSize = stat.size;
    const ext = path.extname(safeName).toLowerCase();
    const mimeType = ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : 'video/mp4';
    const range = req.headers.range;

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Accept-Ranges', 'bytes');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const rawEnd = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const end = Math.min(Number.isNaN(rawEnd) ? fileSize - 1 : rawEnd, fileSize - 1);

      if (Number.isNaN(start) || start < 0 || start >= fileSize || end < start) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(fullPath, { start, end, highWaterMark: 256 * 1024 });
      res.on('close', () => file.destroy());
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType
      });
      file.pipe(res);
    } else {
      const file = fs.createReadStream(fullPath, { highWaterMark: 256 * 1024 });
      res.on('close', () => file.destroy());
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType
      });
      file.pipe(res);
    }
  });

  // Live Class Q&A / Doubts (In-Memory O(n) Fast Filter)
  app.get('/api/doubts/:classId', (req, res) => {
    const { classId } = req.params;
    res.json({ doubts: doubtsStore.filter((d) => d.classId === classId) });
  });

  app.post('/api/doubts', async (req, res) => {
    const body = (req.body || {}) as { classId?: string; question?: string };
    const classId = String(body.classId || '').trim();
    const question = String(body.question || '').trim();

    if (!classId || question.length < 3 || question.length > 400) {
      res.status(400).json({ error: 'Please enter a clear question (3-400 characters).' });
      return;
    }

    const student = getAuthenticatedStudent(req);
    const owner = await verifyOwnerFirebaseToken(extractOwnerToken(req));

    if (!student && !owner) {
      res.status(401).json({ error: 'Please sign in with your Student Login ID to post a doubt.' });
      return;
    }

    const hideIdentity = student && student.privacyMode !== false;
    const entry: LiveDoubtRecord = {
      id: `doubt_${Date.now()}`,
      classId,
      authorName: owner ? 'Owner Instructor' : hideIdentity ? maskDisplayName(student!.fullName) : student!.fullName,
      authorBadge: owner ? 'Instructor' : hideIdentity ? 'Verified Student' : student!.loginId,
      question,
      createdAt: new Date().toISOString()
    };

    commitDoubts([entry, ...doubtsStore]);
    res.status(201).json({ doubt: entry });
  });

  app.patch('/api/doubts/:doubtId', requireOwner, (req, res) => {
    const { doubtId } = req.params;
    const body = (req.body || {}) as { reply?: string };
    const reply = String(body.reply || '').trim();
    if (!reply) {
      res.status(400).json({ error: 'Reply text cannot be empty.' });
      return;
    }
    const idx = doubtsStore.findIndex((d) => d.id === doubtId);
    if (idx === -1) {
      res.status(404).json({ error: 'Doubt not found.' });
      return;
    }
    doubtsStore[idx].reply = reply;
    commitDoubts([...doubtsStore]);
    res.json({ doubt: doubtsStore[idx] });
  });

  const httpServer = http.createServer(app);
  httpServer.keepAliveTimeout = 65_000;
  httpServer.headersTimeout = 66_000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        watch: process.env.DISABLE_HMR === 'true' ? null : undefined
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(
      '/assets',
      express.static(path.join(distDir, 'assets'), {
        maxAge: '1y',
        immutable: true,
        etag: true
      })
    );
    app.get(['/sw.js', '/registerSW.js'], (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      next();
    });
    app.get('/manifest.webmanifest', (_req, res, next) => {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      next();
    });
    app.use(express.static(distDir, { etag: true, maxAge: '5m' }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Radha Education server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

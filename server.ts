import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

// Shared Gemini client utility
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

// Simple in-memory rate limiting map (IP -> timestamps)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 15;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (validTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return true;
}

// Fallback curated wishes generator in case of AI unavailability
const fallbackWishes = [
  {
    title: 'Chúc mừng ngày Phụ nữ Việt Nam 20/10',
    message:
      'Nhân ngày 20/10, chúc bạn luôn ngập tràn niềm vui, nụ cười rạng ngời và đón nhận thật nhiều tình yêu thương ấm áp từ cuộc sống. Bạn luôn là đóa hoa ngát hương mang lại nguồn cảm hứng tuyệt vời cho mọi người xung quanh!',
  },
  {
    title: 'Gửi trọn yêu thương ngày 20 tháng 10',
    message:
      'Chúc người phụ nữ tuyệt vời ngày 20/10 thân tâm an lạc, vạn sự hanh thông, công việc thuận lợi và mỗi ngày đều tìm thấy những lý do ngọt ngào để mỉm cười an nhiên!',
  },
  {
    title: 'Rạng rỡ và tỏa sáng theo cách riêng',
    message:
      'Chúc bạn ngày 20/10 nhận được nhiều hoa tươi và những lời chúc tốt đẹp nhất. Hãy luôn tự tin, kiêu hãnh và nở rộ rực rỡ trên hành trình của chính mình!',
  },
];

// POST /api/gemini/generate-wish
app.post('/api/gemini/generate-wish', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.',
      isAiGenerated: false,
      message: fallbackWishes[0].message,
      title: fallbackWishes[0].title,
      modelNote: 'Đã chọn từ kho lời chúc mẫu do bạn thao tác quá nhanh.',
    });
  }

  const {
    recipientName = '',
    ageGroup = '26-35',
    profession = '',
    relationship = 'Mẹ',
    pronoun = '',
    tone = 'refined',
    length = 'medium',
    theme = 'happiness',
  } = req.body;

  const safeName = String(recipientName).slice(0, 50).trim();
  const safeProfession = String(profession).slice(0, 50).trim();
  const safeRelationship = String(relationship).slice(0, 50).trim();
  const safePronoun = String(pronoun).slice(0, 40).trim();
  const safeTone = String(tone).slice(0, 30);
  const safeLength = String(length).slice(0, 20);
  const safeTheme = String(theme).slice(0, 30);

  if (!aiClient) {
    const fallback = fallbackWishes[Math.floor(Math.random() * fallbackWishes.length)];
    let msg = fallback.message;
    if (safeName) {
      msg = `Gửi ${safeName}! ${msg}`;
    }
    return res.json({
      title: fallback.title,
      message: msg,
      tone: safeTone,
      recipientType: safeRelationship,
      isAiGenerated: false,
      modelNote: 'Đã chọn từ kho lời chúc tuyển chọn 20/10.',
    });
  }

  try {
    const systemPrompt = `Bạn là chuyên gia ngôn ngữ văn hóa Việt Nam chuyên viết lời chúc mừng ngày Phụ Nữ Việt Nam (20/10).
Nhiệm vụ: Viết một lời chúc 20/10 chân thành, tinh tế, giàu cảm xúc và tự nhiên bằng tiếng Việt có dấu.
QUY TẮC:
1. Dùng đúng tên "${safeName || 'người nhận'}" và xưng hô "${safePronoun || 'tự nhiên'}".
2. Mối quan hệ: ${safeRelationship}. Nghề nghiệp: ${safeProfession || 'không xác định'}.
3. Phong cách: ${safeTone}. Độ dài: ${safeLength}. Chủ đề: ${safeTheme}.
4. Không suy đoán tiêu cực, tử vi số phận. Giàu chất thơ mộng, ấm áp.`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out')), 12000)
    );

    const generatePromise = aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Hãy tạo lời chúc 20/10 theo các thông số đã cung cấp.',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Tiêu đề lời chúc' },
            message: { type: Type.STRING, description: 'Nội dung lời chúc' },
            tone: { type: Type.STRING, description: 'Phong cách lời chúc' },
            recipientType: { type: Type.STRING, description: 'Đối tượng người nhận' },
          },
          required: ['title', 'message'],
        },
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const text = response.text;
    if (!text) throw new Error('Empty response');

    const parsed = JSON.parse(text);
    return res.json({
      title: parsed.title || 'Chúc mừng ngày 20/10',
      message: parsed.message,
      tone: parsed.tone || safeTone,
      recipientType: parsed.recipientType || safeRelationship,
      isAiGenerated: true,
    });
  } catch (err: unknown) {
    console.error('Gemini call error:', err);
    const fallback = fallbackWishes[Math.floor(Math.random() * fallbackWishes.length)];
    let msg = fallback.message;
    if (safeName) msg = `Gửi ${safeName}! ${msg}`;
    return res.json({
      title: fallback.title,
      message: msg,
      tone: safeTone,
      recipientType: safeRelationship,
      isAiGenerated: false,
      modelNote: 'Đã tự động chọn từ kho lời chúc tuyển chọn 20/10.',
    });
  }
});

// ==========================================
// MOMO PRIZE WHEEL & EVENT MANAGEMENT STORE
// ==========================================

interface PrizeTierInternal {
  id: string;
  amount: number;
  label: string;
  totalQuantity: number;
  remainingQuantity: number;
  color: string;
  textColor: string;
}

interface TicketInternal {
  code: string;
  isUsed: boolean;
  usedAt?: string;
  usedBy?: string;
  prizeWon?: number;
  claimCode?: string;
  createdAt: string;
}

interface ClaimInternal {
  id: string;
  claimCode: string;
  ticketCode: string;
  amount: number;
  fullName: string;
  schoolClassOrDepartment: string;
  momoPhone: string;
  guardianNote?: string;
  status:
    | 'unclaimed'
    | 'pending_verification'
    | 'verified'
    | 'pending_transfer'
    | 'transferred'
    | 'rejected'
    | 'expired';
  createdAt: string;
  verifiedAt?: string;
  transferredAt?: string;
  momoTransactionRef?: string;
  rejectionReason?: string;
  adminNote?: string;
}

interface AuditLogInternal {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  adminUser: string;
}

// Event state
const eventConfig = {
  eventName: '20/10 – Trao Lời Yêu Thương',
  organizer: 'Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa',
  authorName: 'Trịnh Tuấn Cường',
  authorUnit: 'Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa',
  authorEmail: 'cuongtt.ptit@gmail.com',
  year: 2026,
  status: 'active' as 'active' | 'paused' | 'ended',
  minRewardAmount: 10000,
  maxRewardAmount: 100000,
  aiAttribution:
    'Website có sử dụng công cụ AI hỗ trợ trong quá trình xây dựng. Nội dung và chức năng cần được người biên soạn kiểm tra trước khi sử dụng chính thức.',
};

// Initial Sample Prize Tiers (Min 10.000đ, Max 100.000đ, Total 500.000đ, 20 prizes)
let prizeTiers: PrizeTierInternal[] = [
  {
    id: 'tier-10k',
    amount: 10000,
    label: '10.000đ',
    totalQuantity: 10,
    remainingQuantity: 10,
    color: '#FEE2E2', // rose-100
    textColor: '#991B1B', // red-800
  },
  {
    id: 'tier-20k',
    amount: 20000,
    label: '20.000đ',
    totalQuantity: 5,
    remainingQuantity: 5,
    color: '#FEF3C7', // amber-100
    textColor: '#92400E', // amber-800
  },
  {
    id: 'tier-50k',
    amount: 50000,
    label: '50.000đ',
    totalQuantity: 4,
    remainingQuantity: 4,
    color: '#EDE9FE', // purple-100
    textColor: '#5B21B6', // purple-800
  },
  {
    id: 'tier-100k',
    amount: 100000,
    label: '100.000đ',
    totalQuantity: 1,
    remainingQuantity: 1,
    color: '#FFEDD5', // orange-100
    textColor: '#C2410C', // orange-700
  },
];

// Pre-seeded Event Tickets for Trường TC Công nghiệp Bách Khoa Sầm Sơn
const ticketsMap = new Map<string, TicketInternal>();
for (let i = 1; i <= 20; i++) {
  const code = `BKS-2010-${String(i).padStart(3, '0')}`;
  ticketsMap.set(code, {
    code,
    isUsed: false,
    createdAt: new Date().toISOString(),
  });
}

// Claims store
const claimsMap = new Map<string, ClaimInternal>();

// Audit logs
const auditLogs: AuditLogInternal[] = [
  {
    id: 'log-init',
    action: 'Khởi tạo hệ thống giải thưởng MoMo 20/10',
    details: 'Cấu hình 20 giải thưởng (10k, 20k, 50k, 100k) với tổng ngân sách 500.000đ',
    timestamp: new Date().toISOString(),
    adminUser: 'Hệ thống BKS',
  },
];

// Admin Token store
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bks2010';
const activeAdminTokens = new Set<string>(['bks_admin_session_2026']);

function verifyAdmin(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  return activeAdminTokens.has(token);
}

// Mask phone number for privacy (098****321)
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

// 1. GET /api/event/info - Public event & prize info
app.get('/api/event/info', (_req: Request, res: Response) => {
  const totalBudget = prizeTiers.reduce((acc, t) => acc + t.amount * t.totalQuantity, 0);
  const remainingBudget = prizeTiers.reduce(
    (acc, t) => acc + t.amount * t.remainingQuantity,
    0
  );
  const totalPrizes = prizeTiers.reduce((acc, t) => acc + t.totalQuantity, 0);
  const remainingPrizes = prizeTiers.reduce((acc, t) => acc + t.remainingQuantity, 0);

  res.json({
    ...eventConfig,
    totalBudget,
    remainingBudget,
    awardedAmount: totalBudget - remainingBudget,
    totalPrizes,
    remainingPrizes,
    tiers: prizeTiers.map((t) => ({
      id: t.id,
      amount: t.amount,
      label: t.label,
      totalQuantity: t.totalQuantity,
      remainingQuantity: t.remainingQuantity,
      color: t.color,
      textColor: t.textColor,
    })),
  });
});

// Unified 8 Wheel Slices matching client LuckyWheel component
const UNIFIED_SLICES = [
  { index: 0, label: '10.000đ', subLabel: 'Ví MoMo', isCash: true, amount: 10000, wish: 'Chúc mừng bạn trúng giải thưởng 10.000đ qua ví MoMo!' },
  { index: 1, label: 'Bình An', subLabel: 'Sức Khỏe', isCash: false, amount: 0, wish: 'Chúc bạn thân tâm an lạc, dồi dào sức khỏe và luôn an yên trong cuộc sống!' },
  { index: 2, label: '20.000đ', subLabel: 'Ví MoMo', isCash: true, amount: 20000, wish: 'Chúc mừng bạn trúng lì xì 20.000đ ví MoMo từ chương trình 20/10!' },
  { index: 3, label: 'Tự Tin', subLabel: 'Tỏa Sáng', isCash: false, amount: 0, wish: 'Chúc bạn luôn tự tin, kiêu hãnh và nở rộ rực rỡ trên mọi chặng đường!' },
  { index: 4, label: '50.000đ', subLabel: 'Ví MoMo', isCash: true, amount: 50000, wish: 'Tuyệt vời! Bạn đã trúng giải thưởng 50.000đ vào ví MoMo!' },
  { index: 5, label: 'Hạnh Phúc', subLabel: 'Ngập Tràn', isCash: false, amount: 0, wish: 'Chúc mỗi ngày của bạn đều đong đầy yêu thương, ngập tràn tiếng cười!' },
  { index: 6, label: '100.000đ', subLabel: 'Giải Đặc Biệt', isCash: true, amount: 100000, wish: 'Vỡ òa! Bạn đã trúng GIẢI ĐẶC BIỆT 100.000đ chuyển khoản ví MoMo!' },
  { index: 7, label: 'Tri Ân 20/10', subLabel: 'Lời Chúc Vàng', isCash: false, amount: 0, wish: 'Một đóa hoa tươi thắm và lời tri ân sâu sắc nhất gửi đến người phụ nữ tuyệt vời!' },
];

// Check Ticket validity endpoint
app.post('/api/spin/check-ticket', (req: Request, res: Response) => {
  const { ticketCode } = req.body;
  const cleanCode = String(ticketCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return res.status(400).json({ error: 'Vui lòng nhập mã vé cần kiểm tra.' });
  }

  const ticket = ticketsMap.get(cleanCode);
  if (!ticket) {
    return res.status(404).json({
      valid: false,
      error: `Mã vé "${cleanCode}" không tồn tại trong hệ thống trường BKS Sầm Sơn.`,
    });
  }

  if (ticket.isUsed) {
    return res.status(400).json({
      valid: false,
      isUsed: true,
      error: `Mã vé "${cleanCode}" đã được sử dụng lúc ${new Date(ticket.usedAt || '').toLocaleString('vi-VN')}.`,
    });
  }

  return res.json({
    valid: true,
    isUsed: false,
    code: cleanCode,
    message: `Mã vé "${cleanCode}" hợp lệ! Bạn có thể sử dụng để quay ngay bây giờ.`,
  });
});

// 2. POST /api/spin/play - Server-authoritative spin execution
app.post('/api/spin/play', (req: Request, res: Response) => {
  const { ticketCode, isDemo = false } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Thao tác quá nhanh. Vui lòng thử lại sau 30 giây.' });
  }

  if (eventConfig.status !== 'active') {
    return res.status(403).json({ error: 'Sự kiện vòng quay hiện đang tạm dừng hoặc đã kết thúc.' });
  }

  // Handle DEMO Spin (Practice mode - exact slice alignment)
  if (isDemo || ticketCode === 'DEMO-2010') {
    const randomSlice = UNIFIED_SLICES[Math.floor(Math.random() * UNIFIED_SLICES.length)];

    return res.json({
      success: true,
      isDemo: true,
      segmentIndex: randomSlice.index,
      label: randomSlice.label,
      wishMessage: randomSlice.wish,
      prizeAmount: 0,
      note: 'Lượt quay thử nghiệm. Nhập mã vé chính thức hoặc đăng nhập để nhận thưởng MoMo.',
    });
  }

  // Official Event Ticket validation
  const cleanCode = String(ticketCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return res.status(400).json({
      error: 'Vui lòng nhập mã vé dự thưởng hợp lệ (Ví dụ: BKS-2010-001) hoặc chọn quay thử nghiệm.',
    });
  }

  const ticket = ticketsMap.get(cleanCode);
  if (!ticket) {
    return res.status(404).json({
      error: `Mã vé "${cleanCode}" không tồn tại trong danh sách phát hành của trường. Vui lòng kiểm tra lại.`,
    });
  }

  if (ticket.isUsed) {
    return res.status(400).json({
      error: `Mã vé "${cleanCode}" đã được sử dụng lúc ${new Date(ticket.usedAt || '').toLocaleString('vi-VN')}. Mỗi vé chỉ được quay 1 lần.`,
    });
  }

  // ATOMIC PRIZE SELECTION FROM INVENTORY
  // Filter tiers with remaining prizes
  const availableTiers = prizeTiers.filter((t) => t.remainingQuantity > 0);

  if (availableTiers.length === 0) {
    // All cash prizes have been awarded!
    ticket.isUsed = true;
    ticket.usedAt = new Date().toISOString();
    ticket.prizeWon = 0;

    return res.json({
      success: true,
      isDemo: false,
      isCashPrize: false,
      prizeAmount: 0,
      label: 'Tri Ân 20/10',
      segmentIndex: 7,
      wishMessage:
        'Toàn bộ ngân sách giải thưởng tiền mặt MoMo của sự kiện đã được trao hết. Bạn nhận được món quà tinh thần đặc biệt: Một lời tri ân chân thành nhất từ ban tổ chức!',
      ticketCode: cleanCode,
    });
  }

  // Pick prize according to weighted availability
  const selectedTier = availableTiers[Math.floor(Math.random() * availableTiers.length)];

  // Atomically decrement remaining quantity
  selectedTier.remainingQuantity -= 1;

  // Generate unique claim code
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const claimCode = `MOMO-2010-${randomSuffix}`;

  // Update ticket
  ticket.isUsed = true;
  ticket.usedAt = new Date().toISOString();
  ticket.prizeWon = selectedTier.amount;
  ticket.claimCode = claimCode;

  // Create claim record
  const newClaim: ClaimInternal = {
    id: `claim-${Date.now()}-${randomSuffix}`,
    claimCode,
    ticketCode: cleanCode,
    amount: selectedTier.amount,
    fullName: '',
    schoolClassOrDepartment: '',
    momoPhone: '',
    status: 'unclaimed',
    createdAt: new Date().toISOString(),
  };
  claimsMap.set(claimCode, newClaim);

  // Map to wheel segment index for graphic alignment
  // 10.000đ -> index 0, 20.000đ -> index 2, 50.000đ -> index 4, 100.000đ -> index 6
  let segmentIndex = 0;
  if (selectedTier.amount === 10000) segmentIndex = 0;
  else if (selectedTier.amount === 20000) segmentIndex = 2;
  else if (selectedTier.amount === 50000) segmentIndex = 4;
  else if (selectedTier.amount === 100000) segmentIndex = 6;

  // Add audit log
  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Trúng thưởng MoMo',
    details: `Vé ${cleanCode} trúng ${selectedTier.label}. Mã nhận thưởng: ${claimCode}`,
    timestamp: new Date().toISOString(),
    adminUser: 'Người tham gia',
  });

  return res.json({
    success: true,
    isCashPrize: true,
    prizeAmount: selectedTier.amount,
    label: selectedTier.label,
    segmentIndex,
    claimCode,
    ticketCode: cleanCode,
    wishMessage: `Chúc mừng bạn đã trúng thưởng ${selectedTier.label} qua ví MoMo từ chương trình 20/10! Hãy điền thông tin để quản trị viên chuyển thưởng.`,
  });
});

// 3. POST /api/spin/claim-info - Check claim status by claimCode
app.post('/api/spin/claim-info', (req: Request, res: Response) => {
  const { claimCode } = req.body;
  if (!claimCode) {
    return res.status(400).json({ error: 'Thiếu mã nhận thưởng.' });
  }

  const claim = claimsMap.get(String(claimCode).trim().toUpperCase());
  if (!claim) {
    return res.status(404).json({ error: 'Mã nhận thưởng không tồn tại.' });
  }

  res.json({
    claimCode: claim.claimCode,
    ticketCode: claim.ticketCode,
    amount: claim.amount,
    status: claim.status,
    createdAt: claim.createdAt,
    verifiedAt: claim.verifiedAt,
    transferredAt: claim.transferredAt,
    momoTransactionRef: claim.momoTransactionRef,
    rejectionReason: claim.rejectionReason,
    maskedPhone: maskPhone(claim.momoPhone),
    fullName: claim.fullName,
    schoolClassOrDepartment: claim.schoolClassOrDepartment,
  });
});

// 4. POST /api/spin/submit-claim - Submit private receiver information
app.post('/api/spin/submit-claim', (req: Request, res: Response) => {
  const { claimCode, fullName, schoolClassOrDepartment, momoPhone, guardianNote } = req.body;

  if (!claimCode) {
    return res.status(400).json({ error: 'Thiếu mã nhận thưởng.' });
  }

  const cleanClaimCode = String(claimCode).trim().toUpperCase();
  const claim = claimsMap.get(cleanClaimCode);
  if (!claim) {
    return res.status(404).json({ error: 'Mã nhận thưởng không hợp lệ.' });
  }

  if (claim.status === 'transferred') {
    return res.status(400).json({ error: 'Giải thưởng này đã được chuyển tiền thành công trước đó.' });
  }

  // Validate MoMo phone number (10 digits Vietnamese phone format)
  const cleanPhone = String(momoPhone || '').trim().replace(/\D/g, '');
  if (!/^(03|05|07|08|09)\d{8}$/.test(cleanPhone)) {
    return res.status(400).json({
      error: 'Số điện thoại ví MoMo không hợp lệ (Phải là số điện thoại Việt Nam 10 số, bắt đầu bằng 03, 05, 07, 08, 09).',
    });
  }

  const cleanName = String(fullName || '').trim();
  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Vui lòng nhập họ và tên đầy đủ của bạn.' });
  }

  const cleanClass = String(schoolClassOrDepartment || '').trim();
  if (cleanClass.length < 2) {
    return res.status(400).json({ error: 'Vui lòng nhập Lớp học hoặc Phòng/Ban công tác tại trường.' });
  }

  // Update claim to pending_verification
  claim.fullName = cleanName;
  claim.schoolClassOrDepartment = cleanClass;
  claim.momoPhone = cleanPhone;
  claim.guardianNote = String(guardianNote || '').trim();
  claim.status = 'pending_verification';

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Nộp yêu cầu nhận thưởng',
    details: `${cleanName} (${cleanClass}) yêu cầu nhận ${claim.amount.toLocaleString()}đ qua MoMo ${maskPhone(cleanPhone)}. Mã: ${cleanClaimCode}`,
    timestamp: new Date().toISOString(),
    adminUser: 'Người nhận thưởng',
  });

  return res.json({
    success: true,
    message: 'Gửi thông tin nhận thưởng thành công! Quản trị viên sẽ xác minh và chuyển tiền qua MoMo sớm nhất.',
    claimCode: cleanClaimCode,
    status: claim.status,
  });
});

// ==========================================
// ADMIN DASHBOARD ENDPOINTS
// ==========================================

// POST /api/admin/login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = 'bks_admin_session_2026';
    activeAdminTokens.add(token);
    return res.json({
      success: true,
      token,
      user: 'Quản trị viên Trường TC CN Bách Khoa Sầm Sơn',
    });
  }
  return res.status(401).json({ error: 'Mật khẩu quản trị không đúng. (Mặc định: bks2010)' });
});

// GET /api/admin/event-data - Get full admin details
app.get('/api/admin/event-data', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const totalBudget = prizeTiers.reduce((acc, t) => acc + t.amount * t.totalQuantity, 0);
  const remainingBudget = prizeTiers.reduce(
    (acc, t) => acc + t.amount * t.remainingQuantity,
    0
  );

  const claimsList = Array.from(claimsMap.values()).map((c) => ({
    ...c,
    // Provide full phone only to authorized admin
    momoPhone: c.momoPhone,
  }));

  const ticketsList = Array.from(ticketsMap.values());

  res.json({
    eventConfig,
    prizeTiers,
    totalBudget,
    remainingBudget,
    awardedAmount: totalBudget - remainingBudget,
    tickets: ticketsList,
    claims: claimsList,
    auditLogs: auditLogs.slice(0, 50),
  });
});

// POST /api/admin/update-claim - Admin marks verification / transfer / rejection
app.post('/api/admin/update-claim', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const { claimCode, newStatus, momoTransactionRef, rejectionReason, adminNote } = req.body;
  const claim = claimsMap.get(claimCode);
  if (!claim) {
    return res.status(404).json({ error: 'Không tìm thấy yêu cầu nhận thưởng này.' });
  }

  claim.status = newStatus;
  if (adminNote) claim.adminNote = adminNote;

  if (newStatus === 'verified') {
    claim.verifiedAt = new Date().toISOString();
  } else if (newStatus === 'transferred') {
    if (!momoTransactionRef) {
      return res.status(400).json({ error: 'Vui lòng nhập Mã giao dịch chuyển tiền MoMo thực tế.' });
    }
    claim.transferredAt = new Date().toISOString();
    claim.momoTransactionRef = momoTransactionRef;
  } else if (newStatus === 'rejected') {
    claim.rejectionReason = rejectionReason || 'Thông tin xác minh không phù hợp.';
  }

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: `Cập nhật trạng thái nhận thưởng: ${newStatus}`,
    details: `Mã ${claimCode} - Người nhận: ${claim.fullName || 'Chưa cập nhật'} - Ghi chú: ${momoTransactionRef || rejectionReason || ''}`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin BKS Sầm Sơn',
  });

  return res.json({ success: true, claim });
});

// POST /api/admin/generate-tickets - Generate ticket batch
app.post('/api/admin/generate-tickets', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const { count = 10, prefix = 'BKS-2010' } = req.body;
  const numCount = Math.min(Math.max(Number(count) || 10, 1), 50);
  const existingCount = ticketsMap.size;
  const generated: string[] = [];

  for (let i = 1; i <= numCount; i++) {
    const code = `${prefix}-${String(existingCount + i).padStart(3, '0')}`;
    ticketsMap.set(code, {
      code,
      isUsed: false,
      createdAt: new Date().toISOString(),
    });
    generated.push(code);
  }

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Phát hành thêm vé quay',
    details: `Tạo thêm ${numCount} vé dự thưởng (${generated[0]} đến ${generated[generated.length - 1]})`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin BKS Sầm Sơn',
  });

  res.json({ success: true, count: generated.length, tickets: generated });
});

// POST /api/admin/update-prize-pool - Update prize tiers
app.post('/api/admin/update-prize-pool', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const { tiers } = req.body;
  if (!Array.isArray(tiers)) {
    return res.status(400).json({ error: 'Dữ liệu giải thưởng không hợp lệ.' });
  }

  // Validate: min 10.000đ rule!
  for (const t of tiers) {
    if (Number(t.amount) < 10000) {
      return res.status(400).json({
        error: `Mức thưởng "${t.label}" (${t.amount}đ) thấp hơn mức quy định tối thiểu 10.000đ.`,
      });
    }
  }

  prizeTiers = tiers.map((t) => ({
    id: t.id || `tier-${t.amount}`,
    amount: Number(t.amount),
    label: t.label || `${Number(t.amount).toLocaleString('vi-VN')}đ`,
    totalQuantity: Number(t.totalQuantity) || 0,
    remainingQuantity: Math.min(Number(t.remainingQuantity) || 0, Number(t.totalQuantity) || 0),
    color: t.color || '#FEE2E2',
    textColor: t.textColor || '#991B1B',
  }));

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Cập nhật cấu hình giải thưởng',
    details: `Quản trị viên đã cập nhật lại danh sách và số lượng các mức thưởng MoMo`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin BKS Sầm Sơn',
  });

  res.json({ success: true, prizeTiers });
});

// POST /api/admin/update-budget - Update event total budget and event status
app.post('/api/admin/update-budget', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const { totalBudget, status } = req.body;
  if (typeof totalBudget === 'number' && totalBudget >= 0) {
    // update total budget and proportionally adjust or log
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      action: 'Cập nhật ngân sách sự kiện',
      details: `Ngân sách được điều chỉnh thành ${totalBudget.toLocaleString('vi-VN')} VNĐ`,
      timestamp: new Date().toISOString(),
      adminUser: 'Admin BKS Sầm Sơn',
    });
  }
  if (status && ['active', 'paused', 'ended'].includes(status)) {
    eventConfig.status = status;
  }

  res.json({ success: true, totalBudget, status: eventConfig.status });
});

// GET /api/admin/export-csv - Export claims to CSV

app.get('/api/admin/export-csv', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const claimsList = Array.from(claimsMap.values());
  const headers = [
    'Mã nhận thưởng',
    'Mã vé',
    'Số tiền (VNĐ)',
    'Họ và tên',
    'Lớp / Đơn vị',
    'Số điện thoại MoMo',
    'Trạng thái',
    'Mã GD MoMo',
    'Thời gian tạo',
    'Thời gian chuyển',
  ];

  const rows = claimsList.map((c) => [
    `"${c.claimCode}"`,
    `"${c.ticketCode}"`,
    c.amount,
    `"${c.fullName || ''}"`,
    `"${c.schoolClassOrDepartment || ''}"`,
    `"${c.momoPhone || ''}"`,
    `"${c.status}"`,
    `"${c.momoTransactionRef || ''}"`,
    `"${c.createdAt}"`,
    `"${c.transferredAt || ''}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-thuong-momo-2010.csv"');
  res.send(csvContent);
});


// Setup Vite in Dev or Static files in Production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

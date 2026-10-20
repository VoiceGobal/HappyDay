import React, { useState, useRef, useEffect } from 'react';
import {
  Dices,
  Sparkles,
  X,
  Copy,
  Check,
  RotateCw,
  Trophy,
  Ticket,
  ShieldCheck,
  Phone,
  AlertCircle,
  LogIn,
  History,
  Gift,
  Flame,
  UserCheck,
  SearchCheck,
  CheckCircle2
} from 'lucide-react';
import { playWheelTick, playSuspensePulse, playCelebration, playSoftPop } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface LuckyWheelProps {
  onOpenCardWithWish: (title: string, message: string, recipient: string) => void;
  onOpenClaimModal: (claimCode: string, amount: number, ticketCode?: string) => void;
  onOpenAuthModal: () => void;
  onOpenHistoryModal: () => void;
}

export interface WheelSlice {
  id: number;
  label: string;
  subLabel: string;
  badge: string;
  color: string;
  textColor: string;
  isCash: boolean;
  amount: number;
  wish: string;
}

// 8 prominent vibrant slices with bold, contrasting colors:
// 100% synchronized with server.ts and mathematically aligned with needle at 12 o'clock
export const WHEEL_SLICES: WheelSlice[] = [
  {
    id: 0,
    label: '10.000đ',
    subLabel: 'Ví MoMo',
    badge: '💵',
    color: '#7C3AED', // Royal Violet
    textColor: '#FFFFFF',
    isCash: true,
    amount: 10000,
    wish: 'Chúc mừng bạn đã trúng thưởng 10.000đ chuyển khoản qua ví MoMo!',
  },
  {
    id: 1,
    label: 'Bình An',
    subLabel: 'Sức Khỏe',
    badge: '🌸',
    color: '#DC2626', // Ruby Crimson
    textColor: '#FFFFFF',
    isCash: false,
    amount: 0,
    wish: 'Chúc bạn thân tâm an lạc, dồi dào sức khỏe và luôn an yên trong cuộc sống!',
  },
  {
    id: 2,
    label: '20.000đ',
    subLabel: 'Ví MoMo',
    badge: '💵',
    color: '#EA580C', // Sunset Orange
    textColor: '#FFFFFF',
    isCash: true,
    amount: 20000,
    wish: 'Chúc mừng bạn trúng lì xì 20.000đ ví MoMo từ chương trình 20/10!',
  },
  {
    id: 3,
    label: 'Tự Tin',
    subLabel: 'Tỏa Sáng',
    badge: '✨',
    color: '#9333EA', // Amethyst Purple
    textColor: '#FFFFFF',
    isCash: false,
    amount: 0,
    wish: 'Chúc bạn luôn tự tin, kiêu hãnh và nở rộ rực rỡ trên mọi chặng đường!',
  },
  {
    id: 4,
    label: '50.000đ',
    subLabel: 'Ví MoMo',
    badge: '💵',
    color: '#E11D48', // Vivid Carmine
    textColor: '#FFFFFF',
    isCash: true,
    amount: 50000,
    wish: 'Tuyệt vời! Bạn đã trúng giải thưởng 50.000đ vào ví MoMo!',
  },
  {
    id: 5,
    label: 'Hạnh Phúc',
    subLabel: 'Ngập Tràn',
    badge: '❤️',
    color: '#D97706', // Champagne Gold
    textColor: '#FFFFFF',
    isCash: false,
    amount: 0,
    wish: 'Chúc mỗi ngày của bạn đều đong đầy yêu thương, ngập tràn tiếng cười!',
  },
  {
    id: 6,
    label: '100.000đ',
    subLabel: 'Giải Đặc Biệt',
    badge: '👑',
    color: '#C026D3', // Fuchsia Magenta
    textColor: '#FFFFFF',
    isCash: true,
    amount: 100000,
    wish: 'Vỡ òa! Bạn đã trúng GIẢI ĐẶC BIỆT 100.000đ chuyển khoản ví MoMo!',
  },
  {
    id: 7,
    label: 'Tri Ân 20/10',
    subLabel: 'Lời Chúc Vàng',
    badge: '🌹',
    color: '#BE123C', // Deep Rose
    textColor: '#FFFFFF',
    isCash: false,
    amount: 0,
    wish: 'Một đóa hoa tươi thắm và lời tri ân sâu sắc nhất gửi đến người phụ nữ tuyệt vời!',
  },
];

export const LuckyWheel: React.FC<LuckyWheelProps> = ({
  onOpenCardWithWish,
  onOpenClaimModal,
  onOpenAuthModal,
  onOpenHistoryModal,
}) => {
  const { currentUser, userProfile, decrementUserSpin } = useAuth();

  const [ticketInput, setTicketInput] = useState<string>('');
  const [ticketStatus, setTicketStatus] = useState<{
    checked: boolean;
    valid: boolean;
    msg: string;
  } | null>(null);
  const [checkingTicket, setCheckingTicket] = useState<boolean>(false);

  const [spinning, setSpinning] = useState<boolean>(false);
  const [needleVibrating, setNeedleVibrating] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [remainingPrizesCount, setRemainingPrizesCount] = useState<number>(20);
  const [totalBudget, setTotalBudget] = useState<number>(500000);

  // Winning result
  const [winningData, setWinningData] = useState<{
    label: string;
    subLabel?: string;
    wishMessage: string;
    prizeAmount: number;
    claimCode?: string;
    ticketCode?: string;
    isDemo?: boolean;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const spinTimeoutsRef = useRef<number[]>([]);

  // Fetch event info on mount
  useEffect(() => {
    fetch('/api/event/info')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.remainingPrizes === 'number') {
          setRemainingPrizesCount(data.remainingPrizes);
        }
        if (data && typeof data.totalBudget === 'number') {
          setTotalBudget(data.totalBudget);
        }
      })
      .catch(() => {
        // Fallback
      });
  }, []);

  // Cleanup audio/animation timers on unmount
  useEffect(() => {
    return () => {
      spinTimeoutsRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Quick ticket checker
  const handleCheckTicket = async () => {
    const code = ticketInput.trim().toUpperCase();
    if (!code) {
      setErrorMsg('Vui lòng nhập mã vé trước khi kiểm tra.');
      return;
    }
    setErrorMsg('');
    setCheckingTicket(true);
    setTicketStatus(null);

    try {
      const res = await fetch('/api/spin/check-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode: code }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setTicketStatus({
          checked: true,
          valid: true,
          msg: data.message || `Mã vé "${code}" hợp lệ! Bạn có thể quay ngay.`,
        });
        playSoftPop();
      } else {
        setTicketStatus({
          checked: true,
          valid: false,
          msg: data.error || `Mã vé "${code}" không hợp lệ hoặc đã qua sử dụng.`,
        });
      }
    } catch {
      setTicketStatus({
        checked: true,
        valid: false,
        msg: 'Không thể kết nối máy chủ kiểm tra vé.',
      });
    } finally {
      setCheckingTicket(false);
    }
  };

  const handleSpin = async (forceDemo = false) => {
    if (spinning) return;

    const hasTicket = Boolean(ticketInput.trim());

    // User requirement: In addition to logging in, allow spinning by entering ticket code.
    // If neither logged in nor provided ticket code (and not demo), guide the user clearly:
    if (!currentUser && !hasTicket && !forceDemo) {
      setErrorMsg('Vui lòng Đăng nhập để nhận 3 lượt quay miễn phí hoặc Nhập mã vé dự thưởng từ nhà trường để quay!');
      onOpenAuthModal();
      return;
    }

    const spinsLeft = userProfile?.spinsRemaining ?? 3;
    if (!forceDemo && !hasTicket && currentUser && spinsLeft <= 0) {
      setErrorMsg('Bạn đã dùng hết 3 lượt quay miễn phí của tài khoản! Hãy nhập mã vé bổ sung từ nhà trường để tiếp tục rinh quà MoMo.');
      return;
    }

    setErrorMsg('');
    setWinningData(null);
    setCopiedCode(false);

    try {
      setSpinning(true);
      setNeedleVibrating(true);

      let targetIndex = 0;
      let label = '';
      let subLabel = '';
      let wishMessage = '';
      let prizeAmount = 0;
      let claimCode: string | undefined = undefined;
      let ticketCode: string | undefined = undefined;
      let isDemoResult = forceDemo;

      if (hasTicket || forceDemo) {
        // Spin authoritative ticket or demo via server
        const res = await fetch('/api/spin/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketCode: ticketInput.trim(),
            isDemo: forceDemo,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setSpinning(false);
          setNeedleVibrating(false);
          setErrorMsg(data.error || 'Lỗi khi quay số.');
          return;
        }

        targetIndex = typeof data.segmentIndex === 'number' ? data.segmentIndex % 8 : 0;
        const matchingSlice = WHEEL_SLICES[targetIndex];
        label = matchingSlice.label;
        subLabel = matchingSlice.subLabel;
        wishMessage = data.wishMessage || matchingSlice.wish;
        prizeAmount = data.prizeAmount || matchingSlice.amount;
        claimCode = data.claimCode;
        ticketCode = data.ticketCode;
        isDemoResult = Boolean(data.isDemo);

        // Update ticket status
        if (ticketStatus?.valid) {
          setTicketStatus({
            checked: true,
            valid: false,
            msg: `Vé "${ticketInput.trim().toUpperCase()}" đã được dùng thành công.`,
          });
        }
      } else {
        // Authenticated user free spin
        try {
          await decrementUserSpin();
        } catch (err) {
          console.warn('Could not decrement spin count via Firestore:', err);
        }

        // Weighted slice distribution for celebration:
        const sliceOdds = [0, 1, 1, 2, 3, 3, 4, 5, 5, 7, 7];
        targetIndex = sliceOdds[Math.floor(Math.random() * sliceOdds.length)] % 8;
        const selectedSlice = WHEEL_SLICES[targetIndex];

        label = selectedSlice.label;
        subLabel = selectedSlice.subLabel;
        prizeAmount = selectedSlice.amount;

        if (selectedSlice.isCash) {
          claimCode = `MOMO-2010-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
          wishMessage = `Chúc mừng bạn đã may mắn trúng giải thưởng lì xì MoMo trị giá ${prizeAmount.toLocaleString('vi-VN')}đ nhân dịp ngày 20/10!`;
        } else {
          wishMessage = selectedSlice.wish;
        }
      }

      // MATHEMATICAL ROTATION ALIGNMENT:
      // In our clean SVG geometry:
      // Slice i is centered at (i * 45) degrees clockwise from 12 o'clock (TOP).
      // The needle indicator is located at 12 o'clock (TOP = 0 degrees).
      // To bring slice targetIndex to 12 o'clock:
      // (targetIndex * 45 + newRotation) % 360 must equal 0
      // => newRotation % 360 = (360 - targetIndex * 45) % 360!
      const fullSpins = 360 * (7 + Math.floor(Math.random() * 2));
      const targetDegree = (360 - targetIndex * 45) % 360;
      const currentMod = rotation % 360;
      const rotationDelta = fullSpins + (360 - currentMod) + targetDegree;
      const newTotalRotation = rotation + rotationDelta;

      setRotation(newTotalRotation);

      // Audio tick progression: accelerating, steady, then gradual deceleration
      spinTimeoutsRef.current.forEach((t) => clearTimeout(t));
      spinTimeoutsRef.current = [];

      const tickDelays = [
        60, 120, 180, 230, 275, 315, 350, 385, 415, 445, 475, 505,
        535, 565, 600, 640, 680, 730, 790, 860, 940, 1030, 1130, 1240,
        1360, 1490, 1630, 1780, 1940, 2110, 2300, 2510, 2740, 3000, 3300, 3650, 4050, 4450
      ];

      tickDelays.forEach((delay, idx) => {
        const timer = window.setTimeout(() => {
          const pitch = Math.max(0.7, 1.2 - (idx / tickDelays.length) * 0.5);
          playWheelTick(pitch);

          if (idx >= tickDelays.length - 4) {
            playSuspensePulse();
          }
        }, delay);
        spinTimeoutsRef.current.push(timer);
      });

      // Settle after 4.8s
      const finishTimer = window.setTimeout(async () => {
        setSpinning(false);
        setNeedleVibrating(false);

        const resultObj = {
          label,
          subLabel,
          wishMessage,
          prizeAmount,
          claimCode,
          ticketCode,
          isDemo: isDemoResult,
        };
        setWinningData(resultObj);

        // Record spin into Cloud Firestore if logged in
        if (currentUser && !isDemoResult) {
          try {
            const spinId = `spin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const spinDocRef = doc(db, 'spins', spinId);
            await setDoc(spinDocRef, {
              id: spinId,
              userId: currentUser.uid,
              userEmail: currentUser.email || '',
              segmentIndex: targetIndex,
              label,
              wishMessage,
              prizeAmount,
              isCashPrize: prizeAmount > 0,
              claimCode: claimCode || '',
              claimed: false,
              createdAt: new Date().toISOString(),
            });
          } catch (fireErr) {
            console.warn('Could not save spin record to Firestore:', fireErr);
          }
        }

        playCelebration();
        triggerConfetti();
      }, 4800);

      spinTimeoutsRef.current.push(finishTimer);
    } catch {
      setSpinning(false);
      setNeedleVibrating(false);
      setErrorMsg('Đã có lỗi xảy ra khi thực hiện vòng quay. Vui lòng thử lại.');
    }
  };

  const handleCopyClaimCode = async () => {
    if (!winningData?.claimCode) return;
    try {
      await navigator.clipboard.writeText(winningData.claimCode);
      playSoftPop();
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      //
    }
  };

  return (
    <section id="lucky-wheel" className="py-20 bg-gradient-to-b from-[#1E0528] via-[#2A092B] to-[#14021A] text-white relative overflow-hidden transition-colors duration-300">
      {/* Radiant ambient glow in background with vibrant purple, magenta & amber */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] bg-gradient-to-r from-purple-700/35 via-rose-600/35 to-amber-500/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-950 via-rose-950 to-amber-950 border-2 border-amber-400/60 rounded-full text-xs font-black text-amber-300 mb-3 shadow-lg shadow-purple-950/80 uppercase tracking-widest">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span>VÒNG QUAY MAY MẮN 20/10 · LÌ XÌ VÍ MOMO</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-200 to-purple-200 tracking-tight">
            Vòng Quay Hồi Hộp – Rinh Quà Yêu Thương
          </h2>
          
          <p className="mt-3 text-stone-300 text-sm sm:text-base leading-relaxed">
            Chương trình tri ân 20/10 tại <strong className="text-amber-300 font-semibold">Trường TC Công nghiệp Bách Khoa Sầm Sơn</strong>.
            Cơ hội nhận lì xì MoMo từ <strong className="text-rose-400 font-bold">10.000đ đến 100.000đ</strong> cùng muôn vàn lời chúc ý nghĩa!
          </p>

          {/* User Session & Spins Status Banner */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {currentUser ? (
              <div className="flex flex-wrap items-center justify-center gap-2.5 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-purple-400/40 text-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>{userProfile?.displayName || currentUser.email}</span>
                </div>
                <span className="text-stone-500">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-stone-300">Lượt quay tài khoản:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-white font-mono font-bold text-xs">
                    {userProfile?.spinsRemaining ?? 3} lượt
                  </span>
                </div>
                <button
                  onClick={onOpenHistoryModal}
                  className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-200 border border-purple-400/50 font-semibold transition cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Lịch sử của tôi</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-stone-200">
                  Có thể <strong>Đăng nhập nhận 3 lượt quay</strong> hoặc <strong>Nhập mã vé dự thưởng</strong> để quay ngay!
                </span>
                <button
                  onClick={onOpenAuthModal}
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold flex items-center gap-1 shadow-md transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Wheel & Interactive Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Graphic Wheel (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            
            <div className="relative w-[340px] sm:w-[450px] md:w-[480px] h-[340px] sm:h-[450px] md:h-[480px] max-w-full aspect-square flex items-center justify-center p-3">
              
              {/* Outer Vibrant Glowing Frame with Led Dots */}
              <div className="absolute inset-0 rounded-full border-8 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.65)] bg-gradient-to-tr from-purple-900 via-rose-900 to-amber-900" />

              {/* Dotted Gold Ring with Pulsing Glow */}
              <div className="absolute inset-2.5 rounded-full border-4 border-dashed border-amber-300/80 pointer-events-none" />

              {/* Suspenseful Flapper / Needle Indicator at TOP (12 o'clock) pointing DOWN */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
                <div
                  className={`w-10 h-14 bg-gradient-to-b from-amber-300 via-amber-400 to-rose-600 shadow-2xl rounded-t-lg flex items-center justify-center clip-pointer transform transition-transform ${
                    needleVibrating ? 'scale-110 -rotate-3 animate-pulse' : ''
                  }`}
                  style={{
                    filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.7))',
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-inner mb-3 border-2 border-amber-400 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  </div>
                </div>
              </div>

              {/* The Spinning Wheel */}
              <div
                ref={wheelRef}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4.8s cubic-bezier(0.1, 0.95, 0.15, 1)' : 'none',
                }}
                className="w-full h-full rounded-full overflow-hidden relative shadow-2xl"
              >
                {/* SVG Wheel with 8 clean geometric radial slices */}
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <radialGradient id="wheelCenterShade" cx="50%" cy="50%" r="50%">
                      <stop offset="60%" stopColor="#000000" stopOpacity="0" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
                    </radialGradient>
                  </defs>

                  {WHEEL_SLICES.map((slice) => {
                    const isHovered = hoveredSlice === slice.id;
                    return (
                      <g
                        key={slice.id}
                        transform={`rotate(${slice.id * 45}, 50, 50)`}
                        onMouseEnter={() => setHoveredSlice(slice.id)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className="cursor-pointer transition-opacity duration-200"
                        opacity={isHovered ? 0.92 : 1}
                      >
                        {/* Perfect radial wedge path spanning from -22.5 deg to +22.5 deg around 12 o'clock */}
                        <path
                          d="M 50 50 L 31.63 5.65 A 48 48 0 0 1 68.37 5.65 Z"
                          fill={slice.color}
                          stroke="#FEF08A"
                          strokeWidth="0.8"
                        />
                        {/* Radial Shadow Overlay */}
                        <path
                          d="M 50 50 L 31.63 5.65 A 48 48 0 0 1 68.37 5.65 Z"
                          fill="url(#wheelCenterShade)"
                        />

                        {/* Top Badge Icon */}
                        <text
                          x="50"
                          y="11.5"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="3.2"
                        >
                          {slice.badge}
                        </text>

                        {/* Primary Label */}
                        <text
                          x="50"
                          y="18.5"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={slice.textColor}
                          fontSize="3.8"
                          fontWeight="900"
                          fontFamily="var(--font-sans), sans-serif"
                          style={{
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                          }}
                        >
                          {slice.label}
                        </text>

                        {/* Subtitle Label */}
                        <text
                          x="50"
                          y="24.5"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#FEF08A"
                          fontSize="2.4"
                          fontWeight="800"
                          fontFamily="var(--font-sans), sans-serif"
                          style={{
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                          }}
                        >
                          {slice.subLabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center Spinning Hub Button */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <button
                  type="button"
                  onClick={() => handleSpin(false)}
                  disabled={spinning}
                  className="w-22 h-22 sm:w-26 sm:h-26 rounded-full bg-gradient-to-tr from-amber-400 via-rose-600 to-purple-800 text-white font-black text-xs sm:text-sm shadow-[0_0_35px_rgba(225,29,72,0.85)] border-4 border-amber-300 flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-80"
                  aria-label="Quay vòng may mắn"
                >
                  <RotateCw className={`w-6 h-6 mb-0.5 ${spinning ? 'animate-spin' : ''}`} />
                  <span className="tracking-wider">{spinning ? 'ĐANG QUAY' : 'QUAY NGAY'}</span>
                </button>
              </div>

            </div>

          </div>

          {/* Right Column: Ticket Box & Rules (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Ticket Input Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white/10 backdrop-blur-xl border-2 border-white/20 shadow-xl space-y-5">
              
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-rose-600 text-white flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-white">Tham Gia Bằng Mã Vé / Tài Khoản</h3>
                  <p className="text-xs text-stone-300">
                    {currentUser
                      ? `Tài khoản ${currentUser.email?.split('@')[0]} (còn ${userProfile?.spinsRemaining ?? 3} lượt)`
                      : 'Đăng nhập hoặc nhập mã vé dự thưởng để quay'}
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {ticketStatus && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                    ticketStatus.valid
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                      : 'bg-red-500/20 border-red-500/40 text-red-200'
                  }`}
                >
                  {ticketStatus.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <span>{ticketStatus.msg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1.5">
                  Mã vé dự thưởng (Bách Khoa Sầm Sơn cấp)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập mã vé BKS-2010-XXX..."
                    value={ticketInput}
                    onChange={(e) => {
                      setTicketInput(e.target.value.toUpperCase());
                      setTicketStatus(null);
                    }}
                    className="flex-1 px-4 py-3 text-sm rounded-xl border border-white/20 bg-stone-900/80 text-white placeholder-stone-500 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleCheckTicket}
                    disabled={checkingTicket || !ticketInput.trim()}
                    className="px-3.5 py-3 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-purple-400/50 text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <SearchCheck className="w-4 h-4" />
                    <span>{checkingTicket ? '...' : 'Kiểm tra'}</span>
                  </button>
                </div>
                <span className="text-[11px] text-stone-400 mt-1.5 block">
                  💡 Nhấn chọn mã vé mẫu: <button type="button" onClick={() => { setTicketInput('BKS-2010-001'); setTicketStatus(null); }} className="text-amber-300 underline font-mono cursor-pointer">BKS-2010-001</button>, <button type="button" onClick={() => { setTicketInput('BKS-2010-002'); setTicketStatus(null); }} className="text-amber-300 underline font-mono cursor-pointer">BKS-2010-002</button>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSpin(false)}
                  disabled={spinning}
                  className="w-full sm:flex-1 py-3.5 px-4 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:from-amber-500 hover:to-purple-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-rose-500/30 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Dices className="w-4 h-4" />
                  <span>{spinning ? 'Đang quay...' : 'Quay Lấy May'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSpin(true)}
                  disabled={spinning}
                  className="w-full sm:w-auto py-3.5 px-4 bg-white/10 hover:bg-white/20 text-stone-200 font-medium text-xs rounded-xl border border-white/20 transition-all cursor-pointer"
                >
                  Quay thử (Demo)
                </button>
              </div>

              {currentUser && (
                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs text-stone-300">
                  <span>Kho quà và lời chúc đã trúng:</span>
                  <button
                    onClick={onOpenHistoryModal}
                    className="text-amber-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Xem lịch sử ({userProfile?.spinsRemaining ?? 3} lượt còn)</span>
                  </button>
                </div>
              )}

            </div>

            {/* Event Transparency Guarantee */}
            <div className="p-5 rounded-2xl bg-purple-950/50 border border-purple-500/40 text-xs text-purple-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Quy trình trao thưởng minh bạch MoMo & Cloud Firestore</span>
              </div>
              <p className="leading-relaxed text-stone-300">
                Mỗi lượt quay dừng chuẩn xác tại vị trí kim chỉ. Người trúng giải MoMo nhận mã dự thưởng độc bản, nộp thông tin nhận thưởng và được bộ phận quản trị nhà trường đối soát, chuyển khoản MoMo minh bạch.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Winning Celebration Modal */}
      {winningData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in"
          onClick={() => setWinningData(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-gradient-to-b from-stone-900 to-[#2A0826] rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-amber-400/80 text-center overflow-hidden"
          >
            {/* Top Glowing Ribbon */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600" />

            <button
              onClick={() => setWinningData(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Trophy or Gift Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-rose-900/50">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>

            <span className="text-[11px] font-black uppercase tracking-widest text-amber-300">
              {winningData.isDemo ? 'KẾT QUẢ QUAY THỬ NGHIỆM' : 'CHÚC MỪNG BẠN ĐÃ TRÚNG THƯỞNG!'}
            </span>

            <h3 className="font-serif text-3xl font-black text-white mt-1 mb-1">
              {winningData.label}
            </h3>
            {winningData.subLabel && (
              <p className="text-xs text-amber-300 font-bold mb-2">
                {winningData.subLabel}
              </p>
            )}

            {/* Cash Prize Details */}
            {winningData.prizeAmount > 0 && winningData.claimCode && (
              <div className="my-4 p-4 rounded-2xl bg-white/10 border border-rose-400/50 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-300">Mã nhận thưởng MoMo:</span>
                  <button
                    type="button"
                    onClick={handleCopyClaimCode}
                    className="text-[11px] font-bold text-amber-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <div className="font-mono text-base font-bold text-amber-300 bg-black/40 p-2 rounded-lg text-center tracking-wider">
                  {winningData.claimCode}
                </div>
                {winningData.ticketCode && (
                  <span className="text-[11px] text-stone-400 block text-center">
                    Mã vé đã dùng: <strong className="text-white font-mono">{winningData.ticketCode}</strong>
                  </span>
                )}
              </div>
            )}

            {/* Message Body */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-stone-200 font-serif text-sm leading-relaxed mb-6 italic">
              &ldquo;{winningData.wishMessage}&rdquo;
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              {winningData.prizeAmount > 0 && winningData.claimCode ? (
                <button
                  type="button"
                  onClick={() => {
                    const code = winningData.claimCode!;
                    const amt = winningData.prizeAmount;
                    const ticket = winningData.ticketCode;
                    setWinningData(null);
                    onOpenClaimModal(code, amt, ticket);
                  }}
                  className="w-full py-3 px-5 bg-gradient-to-r from-[#A50064] via-rose-600 to-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Điền Thông Tin Nhận Tiền MoMo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const wish = winningData.wishMessage;
                    setWinningData(null);
                    onOpenCardWithWish('Lời chúc 20/10 cát tường', wish, 'Người phụ nữ trân quý');
                  }}
                  className="w-full py-3 px-5 bg-gradient-to-r from-purple-600 to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Gửi thiệp lời chúc này
                </button>
              )}

              <button
                type="button"
                onClick={() => setWinningData(null)}
                className="py-2.5 text-xs text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                Đóng thông báo
              </button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};

import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle, Clock, Send, AlertTriangle, Phone, User, School, FileText, Check } from 'lucide-react';
import { playCelebration, playSoftPop } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface ClaimRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimCode: string;
  prizeAmount: number;
  initialTicketCode?: string;
}

export const ClaimRewardModal: React.FC<ClaimRewardModalProps> = ({
  isOpen,
  onClose,
  claimCode,
  prizeAmount,
  initialTicketCode,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [fullName, setFullName] = useState<string>(userProfile?.displayName || '');
  const [schoolClass, setSchoolClass] = useState<string>('');
  const [momoPhone, setMomoPhone] = useState<string>('');
  const [guardianNote, setGuardianNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [claimStatus, setClaimStatus] = useState<string>('unclaimed');
  const [momoRef, setMomoRef] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Set default full name from profile
  useEffect(() => {
    if (userProfile?.displayName && !fullName) {
      setFullName(userProfile.displayName);
    }
  }, [userProfile]);

  // Fetch claim status on open
  useEffect(() => {
    if (!isOpen || !claimCode) return;
    setErrorMsg('');
    setSuccessMsg('');

    fetch('/api/spin/claim-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.status) {
          setClaimStatus(data.status);
          if (data.fullName) setFullName(data.fullName);
          if (data.schoolClassOrDepartment) setSchoolClass(data.schoolClassOrDepartment);
          if (data.momoTransactionRef) setMomoRef(data.momoTransactionRef);
        }
      })
      .catch(() => {
        // Fallback
      });
  }, [isOpen, claimCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // 1. Submit to Cloud Firestore if user is authenticated
      if (currentUser) {
        try {
          const claimId = `claim-${claimCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const claimDocRef = doc(db, 'claims', claimId);
          await setDoc(claimDocRef, {
            id: claimId,
            claimCode,
            userId: currentUser.uid,
            userEmail: currentUser.email || '',
            fullName: fullName.trim(),
            momoPhone: momoPhone.trim(),
            department: schoolClass.trim(),
            amount: prizeAmount,
            note: guardianNote.trim(),
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch (fErr) {
          console.warn('Firestore claim save warning:', fErr);
        }
      }

      // 2. Submit to server endpoint
      const res = await fetch('/api/spin/submit-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimCode,
          fullName: fullName.trim(),
          schoolClassOrDepartment: schoolClass.trim(),
          momoPhone: momoPhone.trim(),
          guardianNote: guardianNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi nộp thông tin.');
      }

      setClaimStatus(data.status || 'pending_verification');
      setSuccessMsg(data.message || 'Đã gửi thông tin nhận thưởng thành công!');
      playCelebration();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Không thể gửi thông tin. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };


  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(claimCode);
      playSoftPop();
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      //
    }
  };

  const renderStatusBadge = () => {
    switch (claimStatus) {
      case 'transferred':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            Đã chuyển tiền qua MoMo
          </span>
        );
      case 'pending_transfer':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
            <Clock className="w-3.5 h-3.5" />
            Chờ quản trị viên chuyển tiền
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            Đã xác minh thông tin
          </span>
        );
      case 'pending_verification':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
            <Clock className="w-3.5 h-3.5" />
            Chờ quản trị viên xác minh
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            Đã từ chối trao giải
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">
            Chưa gửi thông tin nhận thưởng
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-rose-300 overflow-hidden my-auto"
      >
        {/* Top MoMo Pink Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-[#A50064] via-rose-500 to-amber-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-[#A50064] to-pink-500 text-white flex items-center justify-center shadow-md">
            <Phone className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A50064]">
            Ví Điện Tử MoMo
          </span>
          <h3 className="font-serif text-2xl font-bold text-stone-900 mt-1">
            Biểu Mẫu Nhận Tiền Thưởng 20/10
          </h3>
          <div className="mt-2.5 flex items-center justify-center gap-2">
            {renderStatusBadge()}
          </div>
        </div>

        {/* Prize Details Card */}
        <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-rose-200 mb-5">
          <div className="flex items-center justify-between pb-2 border-b border-rose-100">
            <span className="text-xs text-stone-500 font-medium">Mức tiền trúng thưởng:</span>
            <span className="font-serif font-black text-xl text-[#A50064]">
              {prizeAmount ? `${prizeAmount.toLocaleString('vi-VN')} VNĐ` : '10.000 VNĐ'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-[11px] text-stone-500 block">Mã nhận thưởng duy nhất:</span>
              <span className="font-mono font-bold text-sm text-stone-800 tracking-wide">
                {claimCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            >
              {copiedCode ? <span className="text-emerald-600">Đã chép</span> : 'Sao chép mã'}
            </button>
          </div>
        </div>

        {/* MoMo Security Warnings (Strict Rule: NEVER ask for PIN/OTP) */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 mb-5 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-amber-950 font-bold">BẢO MẬT AN TOÀN TUYỆT ĐỐI:</strong>
            Ban tổ chức KHÔNG BAO GIỜ yêu cầu mã OTP, mã PIN hay mật khẩu ví MoMo. Quản trị viên nhà trường sẽ tự chuyển tiền thủ công qua ứng dụng MoMo chính thức.
          </div>
        </div>

        {/* Result notification if transferred */}
        {claimStatus === 'transferred' ? (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-center space-y-2 mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-base">Giải thưởng đã được chuyển thành công!</h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Quản trị viên đã thực hiện chuyển {prizeAmount.toLocaleString('vi-VN')}đ vào số MoMo của bạn.
            </p>
            {momoRef && (
              <div className="p-2 rounded-lg bg-white/80 border border-emerald-200 text-xs font-mono">
                Mã giao dịch MoMo: <strong>{momoRef}</strong>
              </div>
            )}
          </div>
        ) : (
          /* Form for recipient */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
                {successMsg}
              </div>
            )}

            {/* Recipient Full Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Họ và tên người nhận <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Thị Lan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            {/* Class / Department at School */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Lớp học hoặc Phòng/Khoa công tác <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="VD: Lớp CNTT K16, Khoa Điện Tử, GVCN..."
                  value={schoolClass}
                  onChange={(e) => setSchoolClass(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            {/* MoMo Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Số điện thoại liên kết Ví MoMo nhận tiền <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  maxLength={11}
                  placeholder="VD: 0987654321"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono"
                />
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">
                Chỉ cung cấp số điện thoại chính xác để quản trị viên chuyển khoản.
              </span>
            </div>

            {/* Guardian Note for underage students */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ghi chú / Người giám hộ <span className="text-stone-400 font-normal">(nếu là học sinh dùng ví phụ huynh)</span>
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Em dùng ví MoMo của mẹ (Trần Thị Hoa - SĐT 0912...)"
                  value={guardianNote}
                  onChange={(e) => setGuardianNote(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-[#A50064] via-rose-600 to-pink-600 text-white font-semibold text-xs rounded-xl shadow-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Đang gửi...' : 'Gửi Yêu Cầu Nhận Thưởng'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

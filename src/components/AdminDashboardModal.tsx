import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  DollarSign,
  Ticket,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Plus,
  RefreshCw,
  LogOut,
  Shield,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { MomoPrizeTier, RewardClaim, SpinTicket, AdminAuditLog } from '../types';
import { playSoftPop, playCelebration } from '../utils/audio';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  const [token, setToken] = useState<string>(() => {
    return typeof window !== 'undefined' ? sessionStorage.getItem('bks_admin_token') || '' : '';
  });
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Event & Store Data
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [remainingBudget, setRemainingBudget] = useState<number>(0);
  const [awardedAmount, setAwardedAmount] = useState<number>(0);
  const [prizeTiers, setPrizeTiers] = useState<MomoPrizeTier[]>([]);
  const [tickets, setTickets] = useState<SpinTicket[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // Action states
  const [activeTab, setActiveTab] = useState<'claims' | 'prizes' | 'tickets' | 'logs'>('claims');
  const [selectedClaim, setSelectedClaim] = useState<RewardClaim | null>(null);
  const [momoRefInput, setMomoRefInput] = useState<string>('');
  const [rejectionInput, setRejectionInput] = useState<string>('');
  const [newTicketCount, setNewTicketCount] = useState<number>(10);
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // Editable settings
  const [editableBudget, setEditableBudget] = useState<number>(500000);
  const [editableTiers, setEditableTiers] = useState<MomoPrizeTier[]>([]);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  const fetchAdminData = async (adminToken: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/event-data', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401) {
        setToken('');
        sessionStorage.removeItem('bks_admin_token');
        return;
      }
      const data = await res.json();
      setTotalBudget(data.totalBudget || 0);
      setRemainingBudget(data.remainingBudget || 0);
      setAwardedAmount(data.awardedAmount || 0);
      setPrizeTiers(data.prizeTiers || []);
      setTickets(data.tickets || []);
      setClaims(data.claims || []);
      setAuditLogs(data.auditLogs || []);

      setEditableBudget(data.totalBudget || 500000);
      setEditableTiers(data.prizeTiers || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchAdminData(token);
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Mật khẩu quản trị không đúng.');
      }
      setToken(data.token);
      sessionStorage.setItem('bks_admin_token', data.token);
      fetchAdminData(data.token);
      playCelebration();
    } catch (err: unknown) {
      setLoginError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    sessionStorage.removeItem('bks_admin_token');
  };

  const handleUpdateClaimStatus = async (
    claimCode: string,
    newStatus: string,
    extra: { momoTransactionRef?: string; rejectionReason?: string } = {}
  ) => {
    setActionSuccess('');
    setActionError('');
    try {
      const res = await fetch('/api/admin/update-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          claimCode,
          newStatus,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại.');

      setActionSuccess(`Đã cập nhật trạng thái mã ${claimCode} thành công!`);
      setSelectedClaim(null);
      setMomoRefInput('');
      setRejectionInput('');
      fetchAdminData(token);
      playSoftPop();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    }
  };

  const handleGenerateTickets = async () => {
    try {
      const res = await fetch('/api/admin/generate-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ count: newTicketCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tạo vé thất bại.');

      setActionSuccess(`Đã tạo thành công ${data.count} vé dự thưởng mới!`);
      fetchAdminData(token);
      playCelebration();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    }
  };

  const handleSaveBudget = async () => {
    setActionSuccess('');
    setActionError('');
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/update-budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ totalBudget: Number(editableBudget) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật ngân sách thất bại.');
      setActionSuccess(`Đã cập nhật ngân sách sự kiện thành ${Number(editableBudget).toLocaleString('vi-VN')}đ!`);
      fetchAdminData(token);
      playSoftPop();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveTiers = async () => {
    setActionSuccess('');
    setActionError('');
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/update-prize-pool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tiers: editableTiers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật giải thưởng thất bại.');
      setActionSuccess('Đã lưu cấu hình các mức giải thưởng MoMo thành công!');
      fetchAdminData(token);
      playCelebration();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTierChange = (index: number, field: keyof MomoPrizeTier, val: any) => {
    setEditableTiers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleAddNewTier = () => {
    setEditableTiers((prev) => [
      ...prev,
      {
        id: `tier-custom-${Date.now()}`,
        amount: 30000,
        label: '30.000đ',
        totalQuantity: 5,
        remainingQuantity: 5,
        color: '#FDF2F8',
        textColor: '#9D174D',
      },
    ]);
  };

  const handleDeleteTier = (id: string) => {
    setEditableTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleExportCSV = () => {
    window.open('/api/admin/export-csv', '_blank');
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
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border-2 border-purple-300 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Top Purple-Crimson Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-purple-700 via-rose-600 to-amber-500" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                Trường TC Công Nghiệp Bách Khoa Sầm Sơn – Thanh Hóa
              </span>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
                Cổng Quản Trị Giải Thưởng MoMo 20/10
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {token && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-red-600 font-semibold rounded-lg hover:bg-stone-200 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {!token ? (
          /* Login Screen */
          <div className="p-8 sm:p-12 text-center max-w-md mx-auto my-auto space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-serif text-2xl font-bold text-stone-900">Đăng Nhập Quản Trị</h4>
              <p className="text-xs text-stone-500 mt-1">
                Dành cho Ban tổ chức sự kiện Trường TC Công nghiệp Bách Khoa Sầm Sơn.
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mật khẩu quản trị viên:
                </label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu (Mặc định: bks2010)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-purple-700 to-rose-600 text-white font-semibold text-sm rounded-xl shadow-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Đang xác thực...' : 'Đăng Nhập Quản Trị'}
              </button>
            </form>
          </div>
        ) : (
          /* Main Admin Panel */
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Global Flash Alerts */}
            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between">
                <span>{actionSuccess}</span>
                <button onClick={() => setActionSuccess('')} className="cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {actionError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center justify-between">
                <span>{actionError}</span>
                <button onClick={() => setActionError('')} className="cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                  Tổng Ngân Sách
                </span>
                <div className="text-xl sm:text-2xl font-black text-purple-950 mt-1 font-mono">
                  {totalBudget.toLocaleString('vi-VN')}đ
                </div>
                <span className="text-[11px] text-purple-600 mt-1 block">
                  Mức thấp nhất: 10.000đ
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-100 border border-rose-200">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                  Đã Trao Thưởng
                </span>
                <div className="text-xl sm:text-2xl font-black text-rose-950 mt-1 font-mono">
                  {awardedAmount.toLocaleString('vi-VN')}đ
                </div>
                <span className="text-[11px] text-rose-600 mt-1 block">
                  Còn lại: {remainingBudget.toLocaleString('vi-VN')}đ
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-100 border border-amber-200">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                  Yêu Cầu Chờ Chuyển
                </span>
                <div className="text-xl sm:text-2xl font-black text-amber-950 mt-1 font-mono">
                  {claims.filter((c) => c.status === 'pending_verification' || c.status === 'pending_transfer').length}
                </div>
                <span className="text-[11px] text-amber-700 mt-1 block">
                  Cần xử lý MoMo thủ công
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200">
                <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                  Tổng Vé Dự Thưởng
                </span>
                <div className="text-xl sm:text-2xl font-black text-stone-900 mt-1 font-mono">
                  {tickets.filter((t) => t.isUsed).length} / {tickets.length}
                </div>
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Đã sử dụng lượt quay
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('claims')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    activeTab === 'claims'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Danh Sách Nhận Thưởng ({claims.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('prizes')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    activeTab === 'prizes'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Cấu Hình Mức Thưởng
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    activeTab === 'tickets'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Quản Lý Vé Quay ({tickets.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('logs')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    activeTab === 'logs'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Nhật Ký Thao Tác
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xuất Báo Cáo CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchAdminData(token)}
                  className="p-2 text-stone-600 hover:text-purple-700 rounded-lg hover:bg-stone-100 cursor-pointer"
                  title="Tải lại dữ liệu"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* TAB 1: CLAIMS PROCESSING */}
            {activeTab === 'claims' && (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-stone-100 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Mã Nhận Thưởng</th>
                        <th className="p-3">Số Tiền</th>
                        <th className="p-3">Người Nhận</th>
                        <th className="p-3">Lớp / Đơn Vị</th>
                        <th className="p-3">Số MoMo</th>
                        <th className="p-3">Trạng Thái</th>
                        <th className="p-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-sans">
                      {claims.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-stone-400">
                            Chưa có người tham gia trúng thưởng và gửi yêu cầu.
                          </td>
                        </tr>
                      ) : (
                        claims.map((c) => (
                          <tr key={c.id} className="hover:bg-purple-50/40 transition-colors">
                            <td className="p-3 font-mono font-bold text-purple-900">{c.claimCode}</td>
                            <td className="p-3 font-mono font-bold text-rose-600">
                              {c.amount.toLocaleString('vi-VN')}đ
                            </td>
                            <td className="p-3 font-medium text-stone-900">{c.fullName || '—'}</td>
                            <td className="p-3 text-stone-600">{c.schoolClassOrDepartment || '—'}</td>
                            <td className="p-3 font-mono text-stone-800">{c.momoPhone || '—'}</td>
                            <td className="p-3">
                              {c.status === 'transferred' && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                                  Đã chuyển tiền
                                </span>
                              )}
                              {c.status === 'pending_transfer' && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                                  Chờ chuyển tiền
                                </span>
                              )}
                              {c.status === 'pending_verification' && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                                  Chờ xác minh
                                </span>
                              )}
                              {c.status === 'verified' && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">
                                  Đã xác minh
                                </span>
                              )}
                              {c.status === 'rejected' && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold">
                                  Từ chối
                                </span>
                              )}
                              {c.status === 'unclaimed' && (
                                <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded font-bold">
                                  Chưa nộp thông tin
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedClaim(c)}
                                className="px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-semibold transition-colors cursor-pointer"
                              >
                                Xử lý
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Claim Processing Sub-Modal */}
                {selectedClaim && (
                  <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-purple-950">
                        Xử lý giải thưởng: {selectedClaim.claimCode} ({selectedClaim.amount.toLocaleString()}đ)
                      </h4>
                      <button
                        onClick={() => setSelectedClaim(null)}
                        className="text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3.5 rounded-xl border border-purple-100">
                      <div>
                        <span className="text-stone-400 block">Họ và tên:</span>
                        <strong className="text-stone-900">{selectedClaim.fullName || 'Chưa cung cấp'}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Lớp / Phòng:</span>
                        <strong className="text-stone-900">{selectedClaim.schoolClassOrDepartment || 'Chưa cung cấp'}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">SĐT MoMo:</span>
                        <strong className="text-rose-600 font-mono text-sm">{selectedClaim.momoPhone || 'Chưa cung cấp'}</strong>
                      </div>
                      {selectedClaim.guardianNote && (
                        <div className="sm:col-span-3 pt-2 border-t border-stone-100">
                          <span className="text-stone-400 block">Ghi chú phụ huynh/người giám hộ:</span>
                          <span className="italic text-stone-700">{selectedClaim.guardianNote}</span>
                        </div>
                      )}
                    </div>

                    {/* Step-by-step MoMo manual action */}
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateClaimStatus(selectedClaim.claimCode, 'verified')}
                          className="px-3.5 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 cursor-pointer"
                        >
                          1. Xác minh thông tin hợp lệ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateClaimStatus(selectedClaim.claimCode, 'pending_transfer')}
                          className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                        >
                          2. Đặt trạng thái chờ chuyển tiền
                        </button>
                      </div>

                      {/* Final step: Confirm MoMo Transfer with Transaction Reference ID */}
                      <div className="p-3.5 rounded-xl bg-white border border-emerald-300 space-y-2">
                        <label className="block text-xs font-bold text-emerald-900">
                          3. Xác nhận đã chuyển tiền MoMo thủ công:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nhập Mã giao dịch MoMo thực tế (VD: 12345678901)"
                            value={momoRefInput}
                            onChange={(e) => setMomoRefInput(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateClaimStatus(selectedClaim.claimCode, 'transferred', {
                                momoTransactionRef: momoRefInput,
                              })
                            }
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg cursor-pointer"
                          >
                            Đánh dấu "Đã chuyển tiền"
                          </button>
                        </div>
                      </div>

                      {/* Reject option */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Lý do từ chối trao giải (nếu có gian lận / thông tin sai)..."
                          value={rejectionInput}
                          onChange={(e) => setRejectionInput(e.target.value)}
                          className="flex-1 px-3 py-1 text-xs rounded-lg border border-stone-200"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateClaimStatus(selectedClaim.claimCode, 'rejected', {
                              rejectionReason: rejectionInput,
                            })
                          }
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Từ chối trao giải
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PRIZE TIERS & BUDGET CONFIG */}
            {activeTab === 'prizes' && (
              <div className="space-y-6">
                
                {/* 1. Budget Configuration Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 to-amber-50 border border-purple-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-purple-950 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-purple-700" />
                        <span>Cài Đặt Ngân Sách Giải Thưởng 20/10</span>
                      </h4>
                      <p className="text-xs text-stone-600 mt-0.5">
                        Tổng ngân sách ban tổ chức trường dành cho các phần quà chuyển khoản MoMo.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={100000}
                        step={50000}
                        value={editableBudget}
                        onChange={(e) => setEditableBudget(Number(e.target.value) || 0)}
                        className="w-40 px-3 py-2 text-sm font-mono font-bold rounded-xl border border-purple-300 bg-white text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveBudget}
                        disabled={savingSettings}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer disabled:opacity-50"
                      >
                        {savingSettings ? 'Đang lưu...' : 'Lưu ngân sách'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-stone-600 pt-2 border-t border-purple-200/60">
                    <div>
                      Đã trao: <strong className="text-emerald-700 font-mono">{awardedAmount.toLocaleString('vi-VN')}đ</strong>
                    </div>
                    <div>
                      Còn lại: <strong className="text-rose-700 font-mono">{remainingBudget.toLocaleString('vi-VN')}đ</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Prize Tiers Customization */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-stone-900">
                        Cấu hình các mức giải thưởng MoMo (Tối thiểu 10.000 VNĐ)
                      </h4>
                      <p className="text-xs text-stone-500">
                        Có thể chỉnh sửa mệnh giá, số lượng giải, hoặc thêm mức giải thưởng mới.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddNewTier}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm mức giải</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveTiers}
                        disabled={savingSettings}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{savingSettings ? 'Đang lưu...' : 'Lưu thay đổi giải'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Editable Tiers Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {editableTiers.map((tier, idx) => (
                      <div
                        key={tier.id || idx}
                        className="p-4 rounded-2xl border-2 border-stone-200 bg-white space-y-3 shadow-sm hover:border-purple-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={tier.label}
                            onChange={(e) => handleTierChange(idx, 'label', e.target.value)}
                            placeholder="Nhãn (VD: 20.000đ)"
                            className="font-bold text-sm text-stone-900 border-b border-stone-300 focus:outline-none focus:border-purple-600 w-28 px-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteTier(tier.id)}
                            className="text-stone-400 hover:text-red-600 text-xs cursor-pointer p-1"
                            title="Xóa giải này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-stone-500 block text-[10px] uppercase font-bold">Mệnh giá (VNĐ)</label>
                            <input
                              type="number"
                              min={10000}
                              step={5000}
                              value={tier.amount}
                              onChange={(e) => handleTierChange(idx, 'amount', Number(e.target.value) || 10000)}
                              className="w-full px-2 py-1 text-xs font-mono font-bold rounded border border-stone-300"
                            />
                          </div>
                          <div>
                            <label className="text-stone-500 block text-[10px] uppercase font-bold">Tổng số giải</label>
                            <input
                              type="number"
                              min={1}
                              value={tier.totalQuantity}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 1;
                                handleTierChange(idx, 'totalQuantity', val);
                                if (tier.remainingQuantity > val) {
                                  handleTierChange(idx, 'remainingQuantity', val);
                                }
                              }}
                              className="w-full px-2 py-1 text-xs font-mono font-bold rounded border border-stone-300"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
                          <span>Còn lại: <strong>{tier.remainingQuantity}</strong> giải</span>
                          <span className="font-mono text-purple-700 font-bold">
                            {(tier.amount * tier.totalQuantity).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: TICKETS MANAGEMENT */}
            {activeTab === 'tickets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">Phát hành vé dự thưởng mới</h4>
                    <p className="text-xs text-stone-500">Mã vé dùng để học sinh/giáo viên tham gia quay số MoMo.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={newTicketCount}
                      onChange={(e) => setNewTicketCount(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-xs border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateTickets}
                      className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo vé</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1">
                  {tickets.map((t) => (
                    <div
                      key={t.code}
                      className={`p-2 rounded-xl text-xs font-mono text-center border ${
                        t.isUsed ? 'bg-stone-100 text-stone-400 border-stone-200' : 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                      }`}
                    >
                      <div>{t.code}</div>
                      <span className="text-[10px] block font-sans font-normal">
                        {t.isUsed ? `Đã quay (${t.prizeWon ? t.prizeWon.toLocaleString() + 'đ' : '0đ'})` : 'Chưa dùng'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: AUDIT LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <strong className="text-purple-900 block">{log.action}</strong>
                      <span className="text-stone-600">{log.details}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 shrink-0 font-mono">
                      {new Date(log.timestamp).toLocaleString('vi-VN')} ({log.adminUser})
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

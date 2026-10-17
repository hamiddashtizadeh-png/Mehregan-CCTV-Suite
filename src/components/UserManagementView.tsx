import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { FoundationDataResponse, PublicUser } from '../types/foundation';

interface UserManagementViewProps {
  foundationData: FoundationDataResponse;
  onRefresh: () => Promise<void>;
  onSwitchUser: (userId: number) => Promise<void>;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  foundationData,
  onRefresh,
  onSwitchUser,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<string[]>(['WAREHOUSE_KEEPER']);
  const [newInstallerPartyId, setNewInstallerPartyId] = useState<string>('');

  const [resetPassUserId, setResetPassUserId] = useState<number | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('newPass@123');

  const [manageRolesUserId, setManageRolesUserId] = useState<number | null>(null);
  const [editingRoleCodes, setEditingRoleCodes] = useState<string[]>([]);
  const [editingInstallerPartyId, setEditingInstallerPartyId] = useState<string>('');

  const [statusMsg, setStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; textFa: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const installerParties = (foundationData.parties || []).filter(
    (p) => (p.roles || []).includes('INSTALLER')
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/foundation/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          fullName: newFullName,
          jobTitle: newJobTitle,
          password: newPassword,
          roleCodes: selectedRoleCodes,
          installerPartyId: newInstallerPartyId ? Number(newInstallerPartyId) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMsg({ type: 'ERROR', textFa: data.messageFa || 'خطا در ثبت کاربر.' });
      } else {
        setStatusMsg({ type: 'SUCCESS', textFa: data.messageFa });
        setShowCreateModal(false);
        setNewUsername('');
        setNewFullName('');
        setNewJobTitle('');
        setNewInstallerPartyId('');
        await onRefresh();
      }
    } catch {
      setStatusMsg({ type: 'ERROR', textFa: 'خطای شبکه در ثبت کاربر.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: PublicUser) => {
    setStatusMsg(null);
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/foundation/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMsg({ type: 'ERROR', textFa: data.messageFa || 'خطا در تغییر وضعیت کاربر.' });
      } else {
        setStatusMsg({ type: 'SUCCESS', textFa: data.messageFa });
        await onRefresh();
      }
    } catch {
      setStatusMsg({ type: 'ERROR', textFa: 'خطا در تغییر وضعیت.' });
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUserId) return;
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/foundation/users/${resetPassUserId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: adminNewPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMsg({ type: 'ERROR', textFa: data.messageFa || 'خطا در بازنشانی کلمه عبور.' });
      } else {
        setStatusMsg({ type: 'SUCCESS', textFa: data.messageFa });
        setResetPassUserId(null);
      }
    } catch {
      setStatusMsg({ type: 'ERROR', textFa: 'خطای شبکه.' });
    }
  };

  const handleSaveRoles = async () => {
    if (!manageRolesUserId) return;
    setStatusMsg(null);
    try {
      await fetch(`/api/foundation/users/${manageRolesUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installerPartyId: editingInstallerPartyId ? Number(editingInstallerPartyId) : null,
        }),
      });

      const res = await fetch(`/api/foundation/users/${manageRolesUserId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleCodes: editingRoleCodes }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMsg({ type: 'ERROR', textFa: data.messageFa || 'خطا در تخصیص نقش‌ها.' });
      } else {
        setStatusMsg({ type: 'SUCCESS', textFa: data.messageFa });
        setManageRolesUserId(null);
        await onRefresh();
      }
    } catch {
      setStatusMsg({ type: 'ERROR', textFa: 'خطای شبکه در به‌روزرسانی نقش‌ها.' });
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between ${
            statusMsg.type === 'SUCCESS'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
              : 'border-red-300 bg-red-50 text-red-950'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {statusMsg.type === 'SUCCESS' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
            )}
            <span>{statusMsg.textFa}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="underline hover:no-underline"
          >
            بستن
          </button>
        </div>
      )}

      {/* Top action row */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                مدیریت کاربران و هویت در دیتابیس داخلی (Internal DB Identity)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                تعریف کاربران، انتساب نقش‌های دیتابیسی، فعال/تعلیق و بازنشانی رمز عبور مستقل از هرگونه سرویس خارجی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>تعریف کاربر جدید در دیتابیس</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                <th className="py-2.5 px-3">نام کاربری</th>
                <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                <th className="py-2.5 px-3">سمت سازمانی</th>
                <th className="py-2.5 px-3">نقش‌های منتسب در دیتابیس</th>
                <th className="py-2.5 px-3">وضعیت حساب</th>
                <th className="py-2.5 px-3 text-center">عملیات امنیتی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {foundationData.users.map((u) => {
                const assignedRoles = foundationData.userRoleAssignments
                  .filter((a) => a.userId === u.id)
                  .map((a) => a.roleCode);
                const isCurrentActive = u.id === foundationData.activeUser.id;
                const linkedInstaller = u.installerPartyId
                  ? (foundationData.parties || []).find((p) => p.id === u.installerPartyId)
                  : null;

                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900" dir="ltr">
                      @{u.username}
                      {u.isInitialAdmin && (
                        <span className="mr-2 text-[10px] font-sans font-semibold text-amber-700">
                          (ادمین پیش‌فرض)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <div>{u.fullName}</div>
                      {linkedInstaller && (
                        <div className="text-[10px] text-indigo-700 font-semibold flex items-center gap-1 mt-0.5">
                          <span>🔧 کارتابل نصاب: {linkedInstaller.fullName}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{u.jobTitle}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
                        {assignedRoles.length > 0 ? (
                          assignedRoles.map((r) => (
                            <span key={r} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">
                              {r}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">بدون نقش</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          u.status === 'ACTIVE' ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'فعال (ACTIVE)' : 'معلق (SUSPENDED)'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSwitchUser(u.id)}
                          disabled={isCurrentActive || u.status !== 'ACTIVE'}
                          className={`rounded border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            isCurrentActive
                              ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40'
                          }`}
                        >
                          {isCurrentActive ? 'نشست فعال' : 'تست با این کاربر'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setManageRolesUserId(u.id);
                            setEditingRoleCodes(assignedRoles);
                            setEditingInstallerPartyId(u.installerPartyId ? String(u.installerPartyId) : '');
                          }}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          title="تغییر نقش‌ها و اتصال نصاب"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setResetPassUserId(u.id)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          title="بازنشانی کلمه عبور کاربر توسط مدیر"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                        </button>

                        {u.id !== 1 && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                              u.status === 'ACTIVE'
                                ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'تعلیق' : 'فعال‌سازی'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-3">
              تعریف کاربر جدید در دیتابیس
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    نام کاربری (لاتین)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    placeholder="e.g. reza_sales"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    کلمه عبور اولیه
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    نام و نام خانوادگی
                  </label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    required
                    placeholder="رضا حسینی"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    سمت سازمانی
                  </label>
                  <input
                    type="text"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    required
                    placeholder="کارشناس انبار و کنترل کالا"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  انتخاب نقش‌های اولیه:
                </label>
                <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  {foundationData.roles.map((r) => {
                    const checked = selectedRoleCodes.includes(r.code);
                    return (
                      <label key={r.code} className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoleCodes([...selectedRoleCodes, r.code]);
                            } else {
                              setSelectedRoleCodes(selectedRoleCodes.filter((c) => c !== r.code));
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        <span>{r.titleFa}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اتصال پرونده نصاب (جهت کارتابل اختصاصی نصاب):
                </label>
                <select
                  value={newInstallerPartyId}
                  onChange={(e) => setNewInstallerPartyId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 bg-white"
                >
                  <option value="">-- بدون اتصال (کاربر اداری / عادی) --</option>
                  {installerParties.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      🔧 {inst.fullName} ({inst.partyCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'در حال ایجاد...' : 'ثبت کاربر در دیتابیس'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin Password Reset */}
      {resetPassUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-3">
              بازنشانی کلمه عبور کاربر توسط مدیر
            </h3>
            <form onSubmit={handleAdminResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  کلمه عبور جدید
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPassUserId(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  تایید و ذخیره
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage User Roles */}
      {manageRolesUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-3">
              ویرایش نقش‌های منتسب در دیتابیس
            </h3>
            <div className="space-y-2">
              {foundationData.roles.map((r) => {
                const checked = editingRoleCodes.includes(r.code);
                return (
                  <label
                    key={r.code}
                    className="flex items-center justify-between p-2.5 rounded border border-slate-200 bg-slate-50 cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{r.titleFa}</div>
                      <div className="font-mono text-[11px] text-slate-500">{r.code}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingRoleCodes([...editingRoleCodes, r.code]);
                        } else {
                          setEditingRoleCodes(editingRoleCodes.filter((c) => c !== r.code));
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </label>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                اتصال پرونده نصاب مسئول:
              </label>
              <select
                value={editingInstallerPartyId}
                onChange={(e) => setEditingInstallerPartyId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 bg-white font-medium"
              >
                <option value="">-- بدون اتصال (غیرنصاب) --</option>
                {installerParties.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    🔧 {inst.fullName} ({inst.partyCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setManageRolesUserId(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveRoles}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                ذخیره نقش‌ها
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

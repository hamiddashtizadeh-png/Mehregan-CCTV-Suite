import React, { useState } from 'react';
import {
  Shield,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { FoundationDataResponse, RbacEvaluationResult } from '../types/foundation';

interface RbacConsoleViewProps {
  foundationData: FoundationDataResponse;
  onRefresh: () => Promise<void>;
}

export const RbacConsoleView: React.FC<RbacConsoleViewProps> = ({
  foundationData,
  onRefresh,
}) => {
  const [selectedSimUserId, setSelectedSimUserId] = useState<number>(
    foundationData.activeUser.id
  );
  const [selectedSimPermCode, setSelectedSimPermCode] = useState<string>(
    'foundation.users.manage'
  );
  const [overrideReasonFa, setOverrideReasonFa] = useState<string>(
    'استثنای صریح مدیریتی جهت ممیزی سیستم'
  );
  const [evalResult, setEvalResult] = useState<RbacEvaluationResult | null>(null);
  const [selectedRoleTab, setSelectedRoleTab] = useState<string>('OWNER');
  const [statusMsg, setStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; textFa: string } | null>(
    null
  );

  const handleEvaluate = async (uid = selectedSimUserId, pCode = selectedSimPermCode) => {
    try {
      const res = await fetch('/api/foundation/rbac/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, permissionCode: pCode }),
      });
      const data = await res.json();
      if (data.ok) {
        setEvalResult(data.evaluation);
      }
    } catch {
      // transient
    }
  };

  const handleSetOverride = async (effect: 'DENY' | 'ALLOW' | 'REMOVE') => {
    setStatusMsg(null);
    try {
      const res = await fetch('/api/foundation/rbac/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedSimUserId,
          permissionCode: selectedSimPermCode,
          effect,
          reasonFa: overrideReasonFa,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMsg({
          type: 'ERROR',
          textFa: data.messageFa || 'عدم مجوز ثبت استثنا در دیتابیس (403 Forbidden).',
        });
      } else {
        setStatusMsg({ type: 'SUCCESS', textFa: data.messageFa });
        await onRefresh();
        await handleEvaluate(selectedSimUserId, selectedSimPermCode);
      }
    } catch {
      setStatusMsg({ type: 'ERROR', textFa: 'خطا در ثبت استثنا.' });
    }
  };

  const handleToggleRolePermission = async (roleCode: string, permissionCode: string) => {
    setStatusMsg(null);
    try {
      const res = await fetch('/api/foundation/rbac/toggle-role-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleCode, permissionCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMsg({
          type: 'ERROR',
          textFa: data.messageFa || 'تغییر مجوز نقش توسط Middleware امنیتی رد شد (403).',
        });
      } else {
        setStatusMsg({ type: 'SUCCESS', textFa: data.messageFa });
        await onRefresh();
      }
    } catch {
      setStatusMsg({ type: 'ERROR', textFa: 'خطا در تغییر مجوزهای نقش.' });
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

      {/* Simulator Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                موتور ارزیابی زنده قاعده دسترسی: Explicit Deny &gt; Explicit Grant &gt; Role Permission
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                تست و راستی‌آزمایی ریاضی اولویت دسترسی‌ها مستقیماً بر اساس جداول دیتابیس PostgreSQL
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                انتخاب کاربر جهت آزمایش یا اعمال استثنا
              </label>
              <select
                value={selectedSimUserId}
                onChange={(e) => {
                  const uid = Number(e.target.value);
                  setSelectedSimUserId(uid);
                  handleEvaluate(uid, selectedSimPermCode);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
              >
                {foundationData.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} (@{u.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                انتخاب مجوز دیتابیسی (Permission Code)
              </label>
              <select
                value={selectedSimPermCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setSelectedSimPermCode(code);
                  handleEvaluate(selectedSimUserId, code);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
              >
                {foundationData.permissions.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.titleFa}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                شرح دلیل استثنا جهت ثبت در Audit Log
              </label>
              <input
                type="text"
                value={overrideReasonFa}
                onChange={(e) => setOverrideReasonFa(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleEvaluate()}
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                ارزیابی آنی مجوز
              </button>
              <button
                type="button"
                onClick={() => handleSetOverride('DENY')}
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 whitespace-nowrap shrink-0"
                title="بالاترین اولویت دسترسی: رد قطعی بدون توجه به نقش"
              >
                ثبت منع صریح (Explicit Deny)
              </button>
              <button
                type="button"
                onClick={() => handleSetOverride('ALLOW')}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap shrink-0"
                title="اولویت دوم: اعطای موردی بدون نیاز به داشتن نقش"
              >
                ثبت مجوز صریح (Explicit Grant)
              </button>
              <button
                type="button"
                onClick={() => handleSetOverride('REMOVE')}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                حذف استثنا (بازگشت به نقش)
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-slate-50 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2">
                نتیجه تحلیل موتور امنیتی RBAC دیتابیس:
              </div>
              {evalResult ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {evalResult.allowed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                      )}
                      <span className={evalResult.allowed ? 'text-emerald-800' : 'text-red-800'}>
                        نتیجه نهایی: {evalResult.allowed ? 'مجاز (ALLOWED)' : 'مسدود (DENIED)'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      Rule: {evalResult.matchedRule}
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium leading-relaxed">
                    {evalResult.explanationFa}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-[11px] text-slate-600">
                    <div className="rounded border border-slate-200 bg-white p-2.5">
                      <div className="font-sans font-semibold text-slate-800 mb-1">
                        نقش‌های منتسب کاربر:
                      </div>
                      <div>{evalResult.assignedRoles.join(', ') || 'NONE'}</div>
                    </div>
                    <div className="rounded border border-slate-200 bg-white p-2.5">
                      <div className="font-sans font-semibold text-slate-800 mb-1">
                        نقش‌های دارای مجوز در دیتابیس:
                      </div>
                      <div>{evalResult.rolesGrantingPermission.join(', ') || 'NONE'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-600">
                  برای مشاهده زنجیره تصمیم‌گیری دیتابیس، روی دکمه «ارزیابی آنی مجوز» کلیک کنید.
                </div>
              )}
            </div>

            {/* Existing Overrides in DB */}
            <div className="border-t border-slate-200 pt-3">
              <div className="text-xs font-bold text-slate-800 mb-2">
                استثناهای فعال در جدول user_permission_overrides ({foundationData.userPermissionOverrides.length} مورد):
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {foundationData.userPermissionOverrides.map((ov) => {
                  const targetUser = foundationData.users.find((u) => u.id === ov.userId);
                  return (
                    <div
                      key={ov.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{targetUser?.fullName}</span>
                        <span className="mx-1.5">·</span>
                        <span className="font-mono text-slate-700">{ov.permissionCode}</span>
                        <span className="mx-1.5">·</span>
                        <span className="text-slate-600">{ov.reasonFa}</span>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          ov.effect === 'DENY' ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {ov.effect === 'DENY' ? 'EXPLICIT_DENY' : 'EXPLICIT_GRANT'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Permissions Matrix in DB */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ماتریس مجوزهای نقش در دیتابیس (جدول role_permissions)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                حتی نقش OWNER نیز مجوزهای خود را کاملاً از این جدول می‌گیرد و در صورت حذف ردیف، دسترسی آن لغو می‌گردد.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {foundationData.roles.map((r) => (
              <button
                key={r.code}
                type="button"
                onClick={() => setSelectedRoleTab(r.code)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedRoleTab === r.code
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.code}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                <th className="py-2 px-3">کد مجوز (Permission Code)</th>
                <th className="py-2 px-3">ماژول</th>
                <th className="py-2 px-3">عنوان مجوز</th>
                <th className="py-2 px-3">وضعیت انتساب به [{selectedRoleTab}] در دیتابیس</th>
                <th className="py-2 px-3">تغییر وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {foundationData.permissions.map((perm) => {
                const isGranted = foundationData.rolePermissions.some(
                  (rp) => rp.roleCode === selectedRoleTab && rp.permissionCode === perm.code
                );
                return (
                  <tr key={perm.code} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900" dir="ltr">
                      {perm.code}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{perm.moduleNameFa}</td>
                    <td className="py-2.5 px-3 text-slate-800">{perm.titleFa}</td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      {isGranted ? (
                        <span className="text-emerald-700">GRANTED_IN_DB</span>
                      ) : (
                        <span className="text-slate-400">NOT_ASSIGNED</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleToggleRolePermission(selectedRoleTab, perm.code)}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {isGranted ? 'لغو مجوز' : 'اعطای مجوز'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

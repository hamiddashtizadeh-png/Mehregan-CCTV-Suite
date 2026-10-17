import React, { useState } from 'react';
import { FileText, Search, ShieldAlert } from 'lucide-react';
import { AuditLogRecord } from '../types/foundation';

interface AuditLogViewProps {
  logs: AuditLogRecord[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = logs.filter((log) => {
    const matchCat = filterCategory === 'ALL' || log.category === filterCategory;
    const matchSearch =
      !searchQuery.trim() ||
      log.detailsFa.includes(searchQuery) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.traceId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              لاگ‌های تغییرناپذیر ممیزی و رویدادهای امنیتی (Immutable Audit Log)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              ثبت رویدادهای ورود، تغییرات مجوز، انتساب نقش‌ها، تلاش‌های غیرمجاز و عملیات سیستمی با کد رهگیری یکتا
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در شرح، کاربر یا Trace ID..."
              className="rounded-lg border border-slate-300 pl-3 pr-8 py-1.5 text-xs text-slate-900 w-64"
            />
            <Search className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2" />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {['ALL', 'SECURITY', 'AUTH', 'RBAC', 'SETTINGS', 'MIGRATION'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  filterCategory === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'ALL' ? 'همه رویدادها' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
              <th className="py-2.5 px-3">کد رهگیری (Trace ID)</th>
              <th className="py-2.5 px-3">کاربر و نقش</th>
              <th className="py-2.5 px-3">دسته / رویداد</th>
              <th className="py-2.5 px-3">وضعیت</th>
              <th className="py-2.5 px-3">شرح رویداد و متادیتا (پالایش‌شده از کلمات عبور)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap" dir="ltr">
                  {log.traceId}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span className="font-bold text-slate-900">@{log.actorUsername}</span>
                  <span className="mx-1 text-slate-400">·</span>
                  <span className="font-mono text-[11px] text-slate-500">{log.actorRoleSummary}</span>
                </td>
                <td className="py-2.5 px-3 font-mono whitespace-nowrap" dir="ltr">
                  {log.category} / {log.action}
                </td>
                <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                  {log.status === 'SUCCESS' ? (
                    <span className="text-emerald-700">SUCCESS</span>
                  ) : log.status === 'DENIED' ? (
                    <span className="text-red-700 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      <span>DENIED</span>
                    </span>
                  ) : (
                    <span className="text-amber-700">FAILED</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-800">
                  <div>{log.detailsFa}</div>
                  {Object.keys(log.sanitizedMetadata || {}).length > 0 && (
                    <div
                      dir="ltr"
                      className="mt-1 font-mono text-[11px] text-slate-500 truncate max-w-xl"
                    >
                      {JSON.stringify(log.sanitizedMetadata)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

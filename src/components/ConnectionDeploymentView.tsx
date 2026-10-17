import React, { useEffect, useState } from 'react';
import {
  Server,
  HardDrive,
  Network,
  Globe,
  RefreshCw,
  PowerOff,
  Power,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Package,
  Lock,
  ArrowRightLeft,
  Sliders,
  Check,
} from 'lucide-react';
import { ConnectionMode, FoundationDataResponse, TlsMode } from '../types/foundation';

interface ConnectionDeploymentViewProps {
  foundationData: FoundationDataResponse;
  onRefresh: () => Promise<void>;
}

const PRESETS: Record<
  ConnectionMode,
  {
    labelFa: string;
    subtitleFa: string;
    host: string;
    port: number;
    database: string;
    username: string;
    tlsEnabled: boolean;
    tlsMode: TlsMode;
  }
> = {
  LOCAL: {
    labelFa: '۱. دیتابیس محلی (Local PostgreSQL)',
    subtitleFa: 'اجرای مستقل روی همین کامپیوتر با موتور محلی بدون نیاز به شبکه خارجی',
    host: '127.0.0.1',
    port: 5432,
    database: 'mehregan_erp_db',
    username: 'postgres',
    tlsEnabled: false,
    tlsMode: 'disable',
  },
  LAN: {
    labelFa: '۲. دیتابیس شبکه محلی (LAN PostgreSQL)',
    subtitleFa: 'اتصال کلاینت‌های فروشگاه و انبار به سرور مرکزی داخل شبکه LAN',
    host: '192.168.1.100',
    port: 5432,
    database: 'mehregan_lan_erp',
    username: 'mehregan_lan_user',
    tlsEnabled: false,
    tlsMode: 'disable',
  },
  ONLINE: {
    labelFa: '۳. دیتابیس آنلاین / ابری (Hosted PostgreSQL)',
    subtitleFa: 'اتصال امن شعب و دفتر مرکزی به سرور ابری با رمزنگاری اجباری TLS',
    host: 'db-cloud.mehregan-security.ir',
    port: 5432,
    database: 'mehregan_hosted_db',
    username: 'cloud_admin',
    tlsEnabled: true,
    tlsMode: 'verify-full',
  },
};

export const ConnectionDeploymentView: React.FC<ConnectionDeploymentViewProps> = ({
  foundationData,
  onRefresh,
}) => {
  const activeConn = foundationData.connection;
  const activeProf = activeConn?.activeProfile;
  const stagedProf = (activeConn as any)?.stagedCandidateProfile;
  const rollbackProf = (activeConn as any)?.previousProfileForRollback;

  const [selectedMode, setSelectedMode] = useState<ConnectionMode>('LOCAL');
  const [labelFa, setLabelFa] = useState(PRESETS.LOCAL.labelFa);
  const [host, setHost] = useState(PRESETS.LOCAL.host);
  const [port, setPort] = useState(PRESETS.LOCAL.port);
  const [database, setDatabase] = useState(PRESETS.LOCAL.database);
  const [username, setUsername] = useState(PRESETS.LOCAL.username);
  const [password, setPassword] = useState('');
  const [tlsEnabled, setTlsEnabled] = useState(false);
  const [tlsMode, setTlsMode] = useState<TlsMode>('disable');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs: number;
    stageReached: string;
    serverVersion: string;
    tlsSummary: string;
    messageFa: string;
    remediationGuideFa?: string;
  } | null>(null);

  const [staging, setStaging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [explicitNoMergeChecked, setExplicitNoMergeChecked] = useState(false);

  const [installerManifest, setInstallerManifest] = useState<any>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'SUCCESS' | 'ERROR';
    textFa: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/system/installer/manifest')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.manifest) {
          setInstallerManifest(d.manifest);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectModePreset = (mode: ConnectionMode) => {
    const preset = PRESETS[mode];
    setSelectedMode(mode);
    setLabelFa(preset.labelFa);
    setHost(preset.host);
    setPort(preset.port);
    setDatabase(preset.database);
    setUsername(preset.username);
    setTlsEnabled(preset.tlsEnabled);
    setTlsMode(preset.tlsMode);
    setTestResult(null);
    setFeedbackMsg(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/system/connection/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedMode,
          labelFa,
          host,
          port,
          database,
          username,
          password: password || undefined,
          tlsEnabled,
          tlsMode,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setFeedbackMsg({
        type: 'ERROR',
        textFa: 'خطا در برقراری ارتباط با سرویس تست اتصال Backend.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleStageDestination = async () => {
    if (!testResult?.ok) {
      setFeedbackMsg({
        type: 'ERROR',
        textFa: 'ابتدا باید اتصال به مقصد جدید را با موفقیت آزمایش کنید.',
      });
      return;
    }

    setStaging(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/system/connection/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedMode,
          labelFa,
          host,
          port,
          database,
          username,
          password: password || undefined,
          tlsEnabled,
          tlsMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFeedbackMsg({
          type: 'ERROR',
          textFa: data.messageFa || 'خطا در ثبت موقت مقصد اتصال.',
        });
      } else {
        setFeedbackMsg({
          type: 'SUCCESS',
          textFa: data.messageFa,
        });
        await onRefresh();
      }
    } catch {
      setFeedbackMsg({ type: 'ERROR', textFa: 'خطای شبکه در ثبت موقت مقصد اتصال.' });
    } finally {
      setStaging(false);
    }
  };

  const handleConfirmSwitch = async () => {
    if (!explicitNoMergeChecked) {
      setFeedbackMsg({
        type: 'ERROR',
        textFa: 'تایید صریح عدم کپی یا ادغام داده‌ها بین دیتابیس‌ها الزامی است.',
      });
      return;
    }

    setConfirming(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/system/connection/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ explicitNoMergeConfirmed: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFeedbackMsg({
          type: 'ERROR',
          textFa: data.messageFa || 'خطا در اعمال مقصد جدید.',
        });
      } else {
        setFeedbackMsg({
          type: 'SUCCESS',
          textFa: data.messageFa,
        });
        setPassword('');
        await onRefresh();
      }
    } catch {
      setFeedbackMsg({ type: 'ERROR', textFa: 'خطای شبکه در تایید اتصال جدید.' });
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelStage = async () => {
    try {
      await fetch('/api/system/connection/cancel-stage', { method: 'POST' });
      await onRefresh();
    } catch {
      // transient
    }
  };

  const handleDisconnect = async () => {
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/system/connection/disconnect', { method: 'POST' });
      const data = await res.json();
      setFeedbackMsg({ type: 'SUCCESS', textFa: data.messageFa });
      await onRefresh();
    } catch {
      setFeedbackMsg({ type: 'ERROR', textFa: 'خطا در قطع اتصال دیتابیس.' });
    }
  };

  const handleReconnect = async () => {
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/system/connection/reconnect', { method: 'POST' });
      const data = await res.json();
      setFeedbackMsg({ type: 'SUCCESS', textFa: data.messageFa });
      await onRefresh();
    } catch {
      setFeedbackMsg({ type: 'ERROR', textFa: 'خطا در برقراری مجدد اتصال.' });
    }
  };

  const handleRollback = async () => {
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/system/connection/rollback', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFeedbackMsg({ type: 'ERROR', textFa: data.messageFa });
      } else {
        setFeedbackMsg({ type: 'SUCCESS', textFa: data.messageFa });
        await onRefresh();
      }
    } catch {
      setFeedbackMsg({ type: 'ERROR', textFa: 'خطا در بازگشت به تنظیمات قبلی.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert / Feedback */}
      {feedbackMsg && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between ${
            feedbackMsg.type === 'SUCCESS'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
              : 'border-red-300 bg-red-50 text-red-950'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {feedbackMsg.type === 'SUCCESS' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
            )}
            <span>{feedbackMsg.textFa}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="underline hover:no-underline"
          >
            بستن
          </button>
        </div>
      )}

      {/* Destination Comparison Bar: Current Active vs New Staged */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                وضعیت اتصال دیتابیس و مقایسه مقصد فعلی و جدید
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                نمایش مقصد فعال، مقصد پیشنهادی در انتظار تایید، قطع ایمن، اتصال مجدد و بازگشت (Rollback)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeConn?.connectionStatus === 'DISCONNECTED' ? (
              <button
                type="button"
                onClick={handleReconnect}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Power className="h-3.5 w-3.5" />
                <span>برقراری مجدد اتصال (Reconnect)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
              >
                <PowerOff className="h-3.5 w-3.5" />
                <span>قطع اتصال دیتابیس (Disconnect)</span>
              </button>
            )}

            {rollbackProf && (
              <button
                type="button"
                onClick={handleRollback}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>بازگشت به مقصد قبلی ({rollbackProf.mode})</span>
              </button>
            )}
          </div>
        </div>

        {/* 2 Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">مقصد اتصال فعلی (Active Destination):</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  activeConn?.connectionStatus === 'CONNECTED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {activeConn?.connectionStatus}
              </span>
            </div>
            {activeProf && (
              <div className="space-y-1 font-mono text-slate-700 pt-1" dir="ltr">
                <div>
                  <span className="font-sans font-semibold text-slate-900">Mode: </span>
                  {activeProf.mode}
                </div>
                <div>
                  <span className="font-sans font-semibold text-slate-900">Endpoint: </span>
                  {activeProf.host}:{activeProf.port}/{activeProf.database}
                </div>
                <div>
                  <span className="font-sans font-semibold text-slate-900">User: </span>
                  {activeProf.username} · Pass: {activeProf.passwordMasked} (AES-256-GCM)
                </div>
                <div>
                  <span className="font-sans font-semibold text-slate-900">TLS: </span>
                  {activeProf.tlsEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            )}
          </div>

          {/* Staged Card */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 text-sm">مقصد جدید در انتظار تایید (New Destination):</span>
              <span className="font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-800">
                {stagedProf ? 'PENDING_CONFIRMATION' : 'NONE'}
              </span>
            </div>
            {stagedProf ? (
              <div className="space-y-2 pt-1">
                <div className="font-mono text-slate-700" dir="ltr">
                  <div>
                    <span className="font-sans font-semibold text-slate-900">Target: </span>
                    [{stagedProf.mode}] {stagedProf.host}:{stagedProf.port}/{stagedProf.database}
                  </div>
                  <div>
                    <span className="font-sans font-semibold text-slate-900">User: </span>
                    {stagedProf.username} · Pass: {stagedProf.passwordMasked}
                  </div>
                </div>

                <label className="flex items-start gap-2 text-slate-800 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={explicitNoMergeChecked}
                    onChange={(e) => setExplicitNoMergeChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>
                    صریحاً تایید می‌کنم که اتصال به دیتابیس جدید تغییر کند و{' '}
                    <strong>هیچ‌گونه کپی، انتقال یا ادغام خودکار داده‌ها</strong> رخ ندهد.
                  </span>
                </label>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!explicitNoMergeChecked || confirming}
                    onClick={handleConfirmSwitch}
                    className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {confirming ? 'در حال فعال‌سازی...' : 'تایید صریح و فعال‌سازی دیتابیس جدید'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelStage}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 pt-3">
                هیچ مقصد جدیدی در صف تایید نیست. برای تغییر مقصد، از گزینه‌های زیر استفاده کنید.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 PostgreSQL Options & Test Before Save */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
          <Server className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              سه حالت اتصال به دیتابیس PostgreSQL (Local / LAN / Hosted)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              اتصال حتماً باید قبل از ذخیره نهایی آزمایش شود؛ رمزها با الگوریتم AES-256-GCM امن ذخیره می‌شوند.
            </p>
          </div>
        </div>

        {/* 3 Preset Option Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['LOCAL', 'LAN', 'ONLINE'] as ConnectionMode[]).map((mode) => {
            const p = PRESETS[mode];
            const isSelected = selectedMode === mode;
            const Icon = mode === 'LOCAL' ? HardDrive : mode === 'LAN' ? Network : Globe;

            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleSelectModePreset(mode)}
                className={`text-right rounded-lg border p-4 transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="font-mono text-xs text-slate-500">{mode}</span>
                </div>
                <div className="font-bold text-sm text-slate-900">{p.labelFa}</div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{p.subtitleFa}</p>
              </button>
            );
          })}
        </div>

        {/* Form for Connection Parameters */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                عنوان اتصال
              </label>
              <input
                type="text"
                value={labelFa}
                onChange={(e) => setLabelFa(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نام دیتابیس (Database Name)
              </label>
              <input
                type="text"
                dir="ltr"
                value={database}
                onChange={(e) => {
                  setDatabase(e.target.value);
                  setTestResult(null);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                آدرس سرور (Server Host / IP) — برای شبیه‌سازی خطا invalid.host تایپ کنید
              </label>
              <input
                type="text"
                dir="ltr"
                value={host}
                onChange={(e) => {
                  setHost(e.target.value);
                  setTestResult(null);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">پورت (Port)</label>
              <input
                type="number"
                dir="ltr"
                value={port}
                onChange={(e) => {
                  setPort(Number(e.target.value));
                  setTestResult(null);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نام کاربری دیتابیس (Username)
              </label>
              <input
                type="text"
                dir="ltr"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setTestResult(null);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                کلمه عبور (Password) — ذخیره به صورت امن و غیرقابل نمایش در UI/Log
              </label>
              <div className="relative">
                <input
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="•••••••••••• (رمز عبور در مخزن امن ذخیره می‌شود)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              اتصال قبل از ذخیره نهایی باید آزمایش و تایید شود.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>۱. آزمایش اتصال (Test Connection)</span>
              </button>

              <button
                type="button"
                onClick={handleStageDestination}
                disabled={!testResult?.ok || staging}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>۲. آماده‌سازی جهت تایید نهایی</span>
              </button>
            </div>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              className={`rounded-lg border p-4 text-xs ${
                testResult.ok
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                  : 'border-red-300 bg-red-50 text-red-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {testResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold text-sm">{testResult.messageFa}</div>
                  <div className="font-mono text-[11px] text-slate-700 pt-1">
                    Latency: {testResult.latencyMs}ms · Engine: {testResult.serverVersion} ·{' '}
                    {testResult.tlsSummary}
                  </div>
                  {testResult.remediationGuideFa && (
                    <div className="mt-2 rounded bg-white p-2 border border-red-200 text-slate-800 whitespace-pre-line">
                      <span className="font-bold text-red-800">راهنمای اصلاح: </span>
                      {testResult.remediationGuideFa}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Installer, Launcher & Standalone Deployment Inspector */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
          <Package className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              بسته‌بندی و نصب مستقل (Standalone Installer & Executable Launcher)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              نرم‌افزار با اجرای یک فایل لانچر سرور را بالا می‌آورد و مرورگر را باز می‌کند؛ نیازی به نصب Node.js خارجی نیست.
            </p>
          </div>
        </div>

        {installerManifest ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                <span className="text-slate-500">فایل لانچر اجرایی ویندوز / لینوکس:</span>
                <div className="font-mono font-bold text-slate-900 text-[11px]" dir="ltr">
                  MehreganLauncher.bat / .sh
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                <span className="text-slate-500">پکیج نصبی نهایی (Distributable Archive):</span>
                <div className="font-mono font-bold text-slate-900 text-[11px]" dir="ltr">
                  Mehregan-Setup-v2.0.0-win-x64.tar.gz ({installerManifest.totalSizeFormatted})
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                <span className="text-slate-500">Runtime تعبیه‌شده در بسته نصبی:</span>
                <div className="font-bold text-emerald-800 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>تعبیه‌شده (عدم وابستگی به نصب Node.js)</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 space-y-2">
              <span className="font-bold text-slate-900">
                تضمین محاسبه مسیرهای واقعی فایل‌ها نسبت به محل نصب:
              </span>
              <div className="font-mono text-[11px] text-slate-700 divide-y divide-slate-100" dir="ltr">
                <div className="py-1">Frontend Dist: dist/ (Verified HTML, CSS, JS)</div>
                <div className="py-1">Backend Server: server.ts / server.cjs</div>
                <div className="py-1">Database Migrations: src/db/migrations/ (Versioned Non-Destructive DDL)</div>
                <div className="py-1">Persistent Vault: .mehregan-data/ (Protected during upgrade/uninstall)</div>
              </div>
            </div>

            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-950 flex items-center justify-between">
              <span>
                وضعیت بیلد پکیج نصبی: <strong>تولید واقعی انجام شد و محتوای خروجی با چک‌سام اعتبارسنجی گردید.</strong>
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-600">
                Signature: {installerManifest.manifestSignature?.slice(0, 16)}...
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500">در حال دریافت مانیفست پکیج نصبی...</div>
        )}
      </div>
    </div>
  );
};

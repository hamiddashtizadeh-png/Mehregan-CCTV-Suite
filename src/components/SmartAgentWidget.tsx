import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  Package,
  CreditCard,
  Zap,
  HelpCircle,
  FileText,
  Building2,
  ShieldAlert,
  ListPlus,
  Scale,
  Receipt
} from 'lucide-react';
import { FoundationDataResponse } from '../types/foundation';
import {
  AgentMessage,
  processAgentCommand,
  processAgentCommandOnline,
  format3Digit,
  ExpensePreviewPayload,
  InvoicePreviewPayload,
  JournalVoucherPreviewPayload,
  PaymentReceiptPreviewPayload
} from '../utils/agentEngine';
import { diagnoseError } from '../utils/assistantKnowledge';

interface ClarificationInlineFormProps {
  missingField?: string;
  onSubmitDetails: (detailsText: string) => void;
}

const ClarificationInlineForm: React.FC<ClarificationInlineFormProps> = ({
  missingField,
  onSubmitDetails,
}) => {
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [dateJalali, setDateJalali] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts: string[] = [];
    if (partyName.trim()) parts.push(`نام طرف حساب: ${partyName.trim()}`);
    if (amount.trim()) parts.push(`مبلغ: ${amount.trim()} تومان`);
    if (dateJalali.trim()) parts.push(`تاریخ: ${dateJalali.trim()}`);
    if (description.trim()) parts.push(`بابت: ${description.trim()}`);

    if (parts.length === 0) return;

    onSubmitDetails(`تکمیل جزئیات مالی: ${parts.join(' | ')}`);
    setPartyName('');
    setAmount('');
    setDateJalali('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 bg-white p-2.5 rounded-xl border border-amber-300 shadow-2xs space-y-2">
      <div className="text-[10px] font-extrabold text-amber-900 border-b border-amber-100 pb-1 flex items-center justify-between">
        <span>📋 تکمیل سریع مشخصات (لایه پرسشگری)</span>
        {missingField && (
          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">
            ورود: {missingField}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <label className="block text-slate-600 mb-0.5 font-bold">نام شخص / طرف حساب:</label>
          <input
            type="text"
            placeholder="مثلا: علی رضایی"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-slate-600 mb-0.5 font-bold">مبلغ دقیق (تومان):</label>
          <input
            type="text"
            placeholder="مثلا: 500000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-slate-600 mb-0.5 font-bold">تاریخ شمسی:</label>
          <input
            type="text"
            placeholder="مثلا: 1405/01/25"
            value={dateJalali}
            onChange={(e) => setDateJalali(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-slate-600 mb-0.5 font-bold">عنوان / بابت کالا:</label>
          <input
            type="text"
            placeholder="مثلا: تسویه حساب خریدهای قبلی"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!partyName.trim() && !amount.trim() && !dateJalali.trim() && !description.trim()}
        className="w-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1 shadow-2xs"
      >
        <Send className="w-3 h-3 rotate-180" />
        <span>ارسال جزئیات برای حسابدار ارشد</span>
      </button>
    </form>
  );
};

interface SmartAgentWidgetProps {
  foundationData: FoundationDataResponse | null;
  onRefresh: () => Promise<void>;
  onNavigateTab: (tab: any) => void;
  systemError?: string | null;
  onClearError?: () => void;
}

export const SmartAgentWidget: React.FC<SmartAgentWidgetProps> = ({
  foundationData,
  onRefresh,
  onNavigateTab,
  systemError,
  onClearError,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome',
      sender: 'AGENT',
      text: 'با درود. اینجانب **حسابدار ارشد رسمی مهرگان** هستم 👔💼\nمی‌توانید دستورات مالی، صدور فاکتور، اسناد حسابداری، استعلام بانک و کاردکس انبار را اعلام فرمایید (مانند: *100 هزار تومان هزینه پیک*، *فاکتور فروش برای مشتری*، یا *موجودی بانک*). در صورت ابهام، سوالات تکمیلی پرسیده خواهد شد.',
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      intent: 'GENERAL_CHAT',
    },
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [hasUnreadDiagnostic, setHasUnreadDiagnostic] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle system error auto-popup / alert
  useEffect(() => {
    if (systemError) {
      setHasUnreadDiagnostic(true);
      const diag = diagnoseError(systemError);
      const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      const errorMsg: AgentMessage = {
        id: `err_${Date.now()}`,
        sender: 'SYSTEM_ERROR',
        text: `⚠️ **بازرسی حسابرسی متوجه خطای عملیاتی گردید:**\n${systemError}`,
        timestamp: timeStr,
        intent: 'SYSTEM_DIAGNOSTIC',
        diagnostic: diag,
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  }, [systemError]);

  // Voice Output (Speech Synthesis Text-to-Speech in Persian)
  const speakText = (text: string) => {
    if (!speechEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`~]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fa-IR';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // SpeechSynthesis silent fallback
    }
  };

  // Voice Input (SpeechRecognition for Persian STT)
  const toggleVoiceRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('مرورگر شما از قابلیت تشخیص گفتار صوتی پشتیبانی نمی‌کند. لطفاً متن را تایپ نمایید.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'fa-IR';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
        handleSend(transcript);
      };

      rec.onerror = () => {
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Handle Command Submission
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isThinking) return;

    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    // Add user message
    const userMsg: AgentMessage = {
      id: `u_${Date.now()}`,
      sender: 'USER',
      text,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    try {
      // Async call with Gemini AI / Senior Accountant fallback
      const agentMsg = await processAgentCommandOnline(text, foundationData);
      setMessages((prev) => [...prev, agentMsg]);

      if (agentMsg.cardAction?.navigateTab) {
        onNavigateTab(agentMsg.cardAction.navigateTab);
      }

      if (agentMsg.text) {
        speakText(agentMsg.text);
      }
    } catch {
      const fallbackMsg = processAgentCommand(text, foundationData);
      setMessages((prev) => [...prev, fallbackMsg]);

      if (fallbackMsg.cardAction?.navigateTab) {
        onNavigateTab(fallbackMsg.cardAction.navigateTab);
      }

      if (fallbackMsg.text) {
        speakText(fallbackMsg.text);
      }
    } finally {
      setIsThinking(false);
    }
  };

  // Confirm Expense
  const handleConfirmExpense = async (payload: ExpensePreviewPayload, msgId: string) => {
    try {
      setSubmittingAction(true);
      const res = await fetch('/api/treasury/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleFa: payload.title,
          amount: payload.amount,
          categoryFa: payload.category,
          cashBoxId: payload.cashBoxId || 1,
          dateJalali: payload.dateJalali,
          descriptionFa: `ثبت هوشمند توسط حسابدار ارشد - ${payload.title}`,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        await onRefresh();
        const successMsg: AgentMessage = {
          id: `succ_${Date.now()}`,
          sender: 'AGENT',
          text: `✅ **سند هزینه با موفقیت در دفتر روزنامه ثبت شد!**\nکد سند: \`${
            data.expense?.expenseCode || 'EX-NEW'
          }\` | مبلغ: **${payload.amountFormatted} تومان**`,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, cardAction: undefined } : m)).concat(successMsg)
        );
        speakText(`سند هزینه با مبلغ ${payload.amountFormatted} تومان ثبت گردید.`);
      } else {
        throw new Error(data.messageFa || 'تراکنش ناموفق بود.');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'SYSTEM_ERROR',
          text: `❌ خطا در ثبت هزینه: ${err.message || 'عدم دسترسی به داده‌ها'}`,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Confirm Invoice Issuance
  const handleConfirmInvoice = async (payload: InvoicePreviewPayload, msgId: string) => {
    try {
      setSubmittingAction(true);
      const endpoint = payload.type === 'PURCHASE' ? '/api/purchases/invoices' : '/api/sales/invoices';
      const bodyPayload = payload.type === 'PURCHASE'
        ? {
            supplierId: payload.partyId || 1,
            invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
            dateJalali: payload.dateJalali,
            warehouseId: payload.warehouseId || 1,
            items: payload.items.map((i) => ({
              itemId: i.itemId || 1,
              quantity: i.quantity || 1,
              unitPriceIrr: Math.round((i.unitPrice || payload.totalAmount) * 10), // convert to IRR
            })),
          }
        : {
            customerId: payload.partyId || 1,
            invoiceNumber: `SINV-${Date.now().toString().slice(-5)}`,
            dateJalali: payload.dateJalali,
            sourceWarehouseId: payload.warehouseId || 1,
            items: payload.items.map((i) => ({
              itemId: i.itemId || 1,
              quantity: i.quantity || 1,
              unitPriceIrr: Math.round((i.unitPrice || payload.totalAmount) * 10),
            })),
            paymentType: 'CREDIT',
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (data.ok) {
        await onRefresh();
        const invNum = data.invoice?.invoiceNumber || 'NEW-INV';
        const successMsg: AgentMessage = {
          id: `succ_${Date.now()}`,
          sender: 'AGENT',
          text: `✅ **${payload.type === 'PURCHASE' ? 'فاکتور خرید' : 'فاکتور فروش'} «${invNum}» با موفقیت صادر شد!**\nمبلغ کل: **${payload.totalAmountFormatted} تومان** | طرف حساب: **${payload.partyName}**`,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, cardAction: undefined } : m)).concat(successMsg)
        );
        speakText(`فاکتور شماره ${invNum} با موفقیت صادر گردید.`);
      } else {
        throw new Error(data.messageFa || 'تراکنش ناموفق بود.');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'SYSTEM_ERROR',
          text: `❌ خطا در صدور فاکتور: ${err.message || 'عدم دسترسی به داده‌ها'}`,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Confirm Journal Voucher Creation
  const handleConfirmJournalVoucher = async (payload: JournalVoucherPreviewPayload, msgId: string) => {
    try {
      setSubmittingAction(true);
      const res = await fetch('/api/accounting/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docDateJalali: payload.dateJalali,
          docType: 'GENERAL',
          descriptionFa: payload.description,
          entries: payload.entries.map((e) => ({
            accountCode: e.accountCode,
            descriptionFa: payload.description,
            debitIrr: Math.round(e.debitIrr * 10),
            creditIrr: Math.round(e.creditIrr * 10),
          })),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        await onRefresh();
        const docNum = data.document?.docNumber || 'DOC-NEW';
        const successMsg: AgentMessage = {
          id: `succ_${Date.now()}`,
          sender: 'AGENT',
          text: `✅ **سند حسابداری دوطرفه شماره «${docNum}» در دفتر روزنامه ثبت شد!**\nمبلغ تراز: **${payload.totalAmountFormatted} تومان**`,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, cardAction: undefined } : m)).concat(successMsg)
        );
        speakText(`سند حسابداری شماره ${docNum} موازنه و ثبت شد.`);
      } else {
        throw new Error(data.messageFa || 'تراکنش ناموفق بود.');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'SYSTEM_ERROR',
          text: `❌ خطا در ثبت سند حسابداری: ${err.message}`,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Confirm Payment/Receipt Voucher
  const handleConfirmPaymentReceipt = async (payload: PaymentReceiptPreviewPayload, msgId: string) => {
    try {
      setSubmittingAction(true);
      const res = await fetch('/api/treasury/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: payload.type === 'PAYMENT' ? 'PAYMENT' : 'RECEIPT',
          partyId: payload.partyId || 1,
          amountIrr: Math.round(payload.amount * 10),
          paymentMethod: payload.paymentMethod,
          bankAccountId: payload.bankAccountId,
          cashBoxId: payload.cashBoxId,
          dateJalali: payload.dateJalali,
          descriptionFa: `قبض ${payload.type === 'PAYMENT' ? 'پرداخت' : 'دریافت'} - ${payload.partyName}`,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        await onRefresh();
        const txNum = data.transaction?.txNumber || 'TX-NEW';
        const successMsg: AgentMessage = {
          id: `succ_${Date.now()}`,
          sender: 'AGENT',
          text: `✅ **قبض ${payload.type === 'PAYMENT' ? 'پرداخت' : 'دریافت'} «${txNum}» صادر گردید!**\nمبلغ: **${payload.amountFormatted} تومان** | حساب: **${payload.sourceTargetTitle}**`,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, cardAction: undefined } : m)).concat(successMsg)
        );
        speakText(`قبض خزانه با موفقیت صادر شد.`);
      } else {
        throw new Error(data.messageFa || 'تراکنش ناموفق بود.');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'SYSTEM_ERROR',
          text: `❌ خطا در صدور قبض خزانه: ${err.message}`,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Cancel Pending Card Action
  const handleCancelCardAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              cardAction: undefined,
              text: `${m.text}\n\n*(عملیات فوق توسط کاربر لغو گردید)*`,
            }
          : m
      )
    );
  };

  return (
    <div className="fixed bottom-5 left-5 z-50 select-none dir-rtl font-sans">
      {/* Floating Widget Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setHasUnreadDiagnostic(false);
          }}
          className="group relative flex items-center gap-2.5 bg-slate-900 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-2xl border border-slate-700 transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-6 h-6 text-emerald-400 group-hover:text-white transition-colors" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs font-bold tracking-tight">حسابدار ارشد رسمی مهرگان</span>

          {hasUnreadDiagnostic && (
            <span className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-lg animate-bounce">
              !
            </span>
          )}
        </button>
      )}

      {/* Expanded Agent Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[430px] h-[560px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="relative p-2 bg-emerald-600/20 rounded-xl border border-emerald-500/30">
                <Bot className="w-5 h-5 text-emerald-400" />
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                  <span>حسابدار ارشد رسمی مهرگان</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.2 rounded border border-emerald-500/30 font-mono font-bold">
                    SENIOR AI
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  تحلیلگر مالی، صدور فاکتور، اسناد حسابداری و عیب‌یابی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSpeechEnabled(!speechEnabled)}
                title={speechEnabled ? 'غیرفعال‌سازی خواندن صوتی' : 'فعال‌سازی خواندن صوتی'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {speechEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] font-medium text-slate-700 scrollbar-none">
            <button
              type="button"
              onClick={() => handleSend('100 هزار تومان هزینه خرید پلاستیک ثبت کن')}
              className="shrink-0 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 px-2.5 py-1 rounded-lg transition-colors text-slate-800 flex items-center gap-1"
            >
              <DollarSign className="w-3 h-3 text-emerald-600" />
              <span>ثبت هزینه</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend('صدور فاکتور فروش برای مشتری')}
              className="shrink-0 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-lg transition-colors text-slate-800 flex items-center gap-1"
            >
              <Receipt className="w-3 h-3 text-blue-600" />
              <span>فاکتور فروش</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend('سند حسابداری ثبت کن')}
              className="shrink-0 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 px-2.5 py-1 rounded-lg transition-colors text-slate-800 flex items-center gap-1"
            >
              <Scale className="w-3 h-3 text-purple-600" />
              <span>سند حسابداری</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend('موجودی بانک چقدره؟')}
              className="shrink-0 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 px-2.5 py-1 rounded-lg transition-colors text-slate-800 flex items-center gap-1"
            >
              <CreditCard className="w-3 h-3 text-teal-600" />
              <span>موجودی بانک</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend('موجودی انبار')}
              className="shrink-0 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 px-2.5 py-1 rounded-lg transition-colors text-slate-800 flex items-center gap-1"
            >
              <Package className="w-3 h-3 text-indigo-600" />
              <span>کاردکس انبار</span>
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto bg-slate-100/50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'USER' ? 'items-start' : 'items-end'
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl p-3 shadow-xs space-y-2 ${
                    msg.sender === 'USER'
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : msg.sender === 'SYSTEM_ERROR'
                      ? 'bg-red-50 text-red-950 border border-red-200 rounded-tl-xs'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs'
                  }`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-1 text-[10px] opacity-75 font-mono">
                    <span className="font-bold flex items-center gap-1">
                      {msg.sender === 'USER' ? (
                        'مدیر / کاربر'
                      ) : msg.sender === 'SYSTEM_ERROR' ? (
                        <span className="text-red-700 flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3" /> عیب‌یاب حسابرسی
                        </span>
                      ) : (
                        <span className="text-emerald-700 flex items-center gap-1 font-bold">
                          <Sparkles className="w-3 h-3" /> حسابدار ارشد رسمی
                        </span>
                      )}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Body */}
                  <div className="whitespace-pre-line leading-relaxed font-sans text-xs">
                    {msg.text}
                  </div>

                  {/* Interactive Probing / Clarification Card */}
                  {msg.cardAction?.type === 'CLARIFICATION' && msg.cardAction.clarificationPayload && (
                    <div className="mt-2.5 rounded-xl border-2 border-amber-400 bg-amber-50/90 p-3 space-y-2 text-slate-900 shadow-sm">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-1.5 text-amber-900">
                        <span className="font-extrabold text-xs flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-amber-600" />
                          <span>سوال و لایه پرسشگری حسابدار ارشد</span>
                        </span>
                        <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                          Clarification Loop
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold text-slate-800 leading-relaxed">
                        {msg.cardAction.clarificationPayload.questionFa}
                      </p>

                      {/* Interactive Inline Clarification Form */}
                      <ClarificationInlineForm
                        missingField={msg.cardAction.clarificationPayload.missingField}
                        onSubmitDetails={(detailsText) => handleSend(detailsText)}
                      />

                      {/* Quick 1-Click Action Suggestions */}
                      <div className="space-y-1.5 pt-1 border-t border-amber-200/80">
                        <span className="text-[10px] font-bold text-amber-900 block">یا گزینه‌های پیشنهادی سریع زیر را انتخاب کنید:</span>
                        {msg.cardAction.clarificationPayload.suggestedOptions.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSend(opt.actionPrompt)}
                            className="w-full text-right bg-white hover:bg-amber-100 border border-amber-300 text-slate-900 text-[11px] font-bold p-2 rounded-lg transition-all shadow-2xs hover:border-amber-500 cursor-pointer flex items-center justify-between"
                          >
                            <span>{opt.label}</span>
                            <ArrowLeft className="w-3 h-3 text-amber-700 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Report Summary Card */}
                  {msg.reportData && (
                    <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 p-2.5 space-y-1.5 text-slate-800">
                      <div className="font-bold text-[11px] text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                        <span>{msg.reportData.title}</span>
                      </div>
                      <div className="space-y-1">
                        {msg.reportData.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 last:border-0"
                          >
                            <span className="text-slate-600">{item.label}:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{item.value}</span>
                              {item.badge && (
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-bold">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expense Confirmation Preview Card */}
                  {msg.cardAction?.type === 'EXPENSE_CONFIRMATION' && msg.cardAction.expensePayload && (
                    <div className="mt-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/80 p-3 space-y-2 text-slate-900 shadow-sm">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5 text-emerald-900">
                        <span className="font-extrabold text-xs flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          پیش‌نمایش کارت ثبت هزینه
                        </span>
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                          در انتظار تایید
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px]">عنوان هزینه:</span>
                          <span className="font-bold">{msg.cardAction.expensePayload.title}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">مبلغ نهایی:</span>
                          <span className="font-extrabold text-emerald-700 text-xs">
                            {msg.cardAction.expensePayload.amountFormatted} تومان
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">محل پرداخت:</span>
                          <span className="font-semibold">{msg.cardAction.expensePayload.cashBoxTitle}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">تاریخ ثبت:</span>
                          <span className="font-mono text-slate-700">{msg.cardAction.expensePayload.dateJalali}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-emerald-200">
                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() =>
                            handleConfirmExpense(msg.cardAction!.expensePayload!, msg.id)
                          }
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{submittingAction ? 'در حال ثبت...' : 'تایید و ثبت نهایی'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() => handleCancelCardAction(msg.id)}
                          className="bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                        >
                          لغو
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Invoice Confirmation Preview Card */}
                  {msg.cardAction?.type === 'INVOICE_CONFIRMATION' && msg.cardAction.invoicePayload && (
                    <div className="mt-2.5 rounded-xl border-2 border-blue-500 bg-blue-50/80 p-3 space-y-2 text-slate-900 shadow-sm">
                      <div className="flex items-center justify-between border-b border-blue-200 pb-1.5 text-blue-900">
                        <span className="font-extrabold text-xs flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-blue-600" />
                          پیش‌نمایش {msg.cardAction.invoicePayload.type === 'PURCHASE' ? 'فاکتور خرید' : 'فاکتور فروش'}
                        </span>
                        <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                          در انتظار تایید
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px]">طرف حساب:</span>
                          <span className="font-bold">{msg.cardAction.invoicePayload.partyName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">مبلغ کل فاکتور:</span>
                          <span className="font-extrabold text-blue-700 text-xs">
                            {msg.cardAction.invoicePayload.totalAmountFormatted} تومان
                          </span>
                        </div>
                        <div className="col-span-2 bg-white rounded-lg p-1.5 border border-blue-200 text-[10px]">
                          <span className="font-bold block text-slate-600 mb-0.5">اقلام فاکتور:</span>
                          {msg.cardAction.invoicePayload.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between border-b border-slate-100 last:border-0 py-0.5">
                              <span>{it.title} ({it.quantity} عدد)</span>
                              <span className="font-bold">{format3Digit(it.totalPrice)} تومان</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-blue-200">
                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() =>
                            handleConfirmInvoice(msg.cardAction!.invoicePayload!, msg.id)
                          }
                          className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{submittingAction ? 'در حال ثبت...' : 'تایید و صدور قطعی فاکتور'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() => handleCancelCardAction(msg.id)}
                          className="bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                        >
                          لغو
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Journal Voucher Confirmation Preview Card */}
                  {msg.cardAction?.type === 'JOURNAL_VOUCHER_CONFIRMATION' && msg.cardAction.journalVoucherPayload && (
                    <div className="mt-2.5 rounded-xl border-2 border-purple-500 bg-purple-50/80 p-3 space-y-2 text-slate-900 shadow-sm">
                      <div className="flex items-center justify-between border-b border-purple-200 pb-1.5 text-purple-900">
                        <span className="font-extrabold text-xs flex items-center gap-1.5">
                          <Scale className="w-4 h-4 text-purple-600" />
                          پیش‌نمایش سند حسابداری دوطرفه
                        </span>
                        <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                          دفتر روزنامه
                        </span>
                      </div>

                      <div className="text-[10px] space-y-1">
                        <div className="bg-white p-1.5 rounded-lg border border-purple-200 space-y-1">
                          <div className="font-bold text-slate-700 border-b border-slate-100 pb-0.5">ردیف‌های بدهکار / بستانکار:</div>
                          {msg.cardAction.journalVoucherPayload.entries.map((entry, idx) => (
                            <div key={idx} className="flex justify-between items-center py-0.5 border-b border-slate-50 last:border-0">
                              <span className="font-mono text-slate-600">[{entry.accountCode}] {entry.accountTitle}</span>
                              <span className={`font-bold ${entry.debitIrr > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                {entry.debitIrr > 0 ? `بدهکار: ${format3Digit(entry.debitIrr)}` : `بستانکار: ${format3Digit(entry.creditIrr)}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-purple-200">
                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() =>
                            handleConfirmJournalVoucher(msg.cardAction!.journalVoucherPayload!, msg.id)
                          }
                          className="flex-1 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{submittingAction ? 'در حال ثبت...' : 'تایید و ثبت در دفتر روزنامه'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() => handleCancelCardAction(msg.id)}
                          className="bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                        >
                          لغو
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payment/Receipt Confirmation Preview Card */}
                  {msg.cardAction?.type === 'PAYMENT_RECEIPT_CONFIRMATION' && msg.cardAction.paymentReceiptPayload && (
                    <div className="mt-2.5 rounded-xl border-2 border-teal-500 bg-teal-50/80 p-3 space-y-2 text-slate-900 shadow-sm">
                      <div className="flex items-center justify-between border-b border-teal-200 pb-1.5 text-teal-900">
                        <span className="font-extrabold text-xs flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-teal-600" />
                          پیش‌نمایش قبض {msg.cardAction.paymentReceiptPayload.type === 'PAYMENT' ? 'پرداخت' : 'دریافت'}
                        </span>
                        <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                          عملیات خزانه
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px]">طرف حساب:</span>
                          <span className="font-bold">{msg.cardAction.paymentReceiptPayload.partyName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">مبلغ:</span>
                          <span className="font-extrabold text-teal-700 text-xs">
                            {msg.cardAction.paymentReceiptPayload.amountFormatted} تومان
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">منبع / مقصد:</span>
                          <span className="font-semibold">{msg.cardAction.paymentReceiptPayload.sourceTargetTitle}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">روش پرداخت:</span>
                          <span className="font-mono text-slate-700">{msg.cardAction.paymentReceiptPayload.paymentMethod}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-teal-200">
                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() =>
                            handleConfirmPaymentReceipt(msg.cardAction!.paymentReceiptPayload!, msg.id)
                          }
                          className="flex-1 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{submittingAction ? 'در حال ثبت...' : 'تایید و صدور قبض'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() => handleCancelCardAction(msg.id)}
                          className="bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                        >
                          لغو
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Navigation Action Button */}
                  {msg.cardAction?.type === 'NAVIGATE' && msg.cardAction.navigateTab && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab(msg.cardAction!.navigateTab);
                        }}
                        className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <span>{msg.cardAction.title}</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Diagnostic Resolution Card */}
                  {msg.diagnostic && (
                    <div className="mt-2 rounded-xl bg-white border border-red-200 p-2.5 space-y-2 text-slate-900">
                      <div className="font-bold text-[11px] text-red-800 flex items-center gap-1.5 border-b border-red-100 pb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        <span>علت ریشه‌ای: {msg.diagnostic.causeFa}</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-700">
                        <span className="font-bold block text-[10px] text-slate-500">راهکار پیشنهادی:</span>
                        {msg.diagnostic.resolutionFa.map((res, i) => (
                          <div key={i} className="flex items-start gap-1">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{res}</span>
                          </div>
                        ))}
                      </div>

                      {msg.diagnostic.quickAction && (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateTab(msg.diagnostic!.quickAction!.tab);
                            if (onClearError) onClearError();
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
                        >
                          {msg.diagnostic.quickAction.label}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex flex-col items-end">
                <div className="bg-white text-slate-700 border border-slate-200 rounded-2xl rounded-tl-xs p-3 shadow-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
                  <span className="text-xs font-medium">حسابدار ارشد در حال بررسی و تحلیل مالی...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input & Voice Controls */}
          <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVoiceRecording}
              title={isRecording ? 'توقف ضبط صوتی' : 'دستور صوتی فارسی'}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-blue-600" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="دستور مالی، ثبت فاکتور یا استعلام حساب..."
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Eye,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import type { OperatorNotificationItem } from '../types';

interface OperatorNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshNeeded?: () => void;
}

export const OperatorNotificationDrawer: React.FC<OperatorNotificationDrawerProps> = ({
  isOpen,
  onClose,
  onRefreshNeeded,
}) => {
  const { lang } = useLanguage();
  const bn = lang === 'bn';

  const [notifications, setNotifications] = useState<OperatorNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedNotif, setSelectedNotif] = useState<OperatorNotificationItem | null>(null);

  // Triage modal state
  const [triageAction, setTriageAction] = useState<string>('VERIFY_AND_CREATE_INCIDENT');
  const [triageNotes, setTriageNotes] = useState<string>('');
  const [triaging, setTriaging] = useState<boolean>(false);
  const [triageSuccessMsg, setTriageSuccessMsg] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{
        unread_count: number;
        total_count: number;
        notifications: OperatorNotificationItem[];
      }>('/api/v1/operator/notifications');
      setNotifications(res.notifications ?? []);
      setUnreadCount(res.unread_count ?? 0);
    } catch (e) {
      console.warn('Could not fetch operator notifications:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleAcknowledge = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/v1/operator/notifications/${id}/acknowledge`, { method: 'POST' });
      await fetchNotifications();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      alert(err.message || 'Acknowledgement failed');
    }
  };

  const handleExecuteTriage = async () => {
    if (!selectedNotif) return;
    try {
      setTriaging(true);
      setTriageSuccessMsg(null);
      const res = await apiFetch<any>(`/api/v1/operator/reports/${selectedNotif.report_id}/triage`, {
        method: 'POST',
        body: JSON.stringify({
          action: triageAction,
          notes: triageNotes || `Triaged via Operator Command Console as ${triageAction}`,
          severity_override: selectedNotif.severity,
          debris_detected: selectedNotif.debris_present,
        }),
      });

      setTriageSuccessMsg(
        bn
          ? `রিপোর্ট সফলভাবে সম্পন্ন হয়েছে (${res.triage_status})`
          : `Report triaged successfully as ${res.triage_status}`
      );
      await fetchNotifications();
      if (onRefreshNeeded) onRefreshNeeded();
      setTimeout(() => {
        setSelectedNotif(null);
        setTriageSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Triage failed');
    } finally {
      setTriaging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl h-full bg-[#0a0f1d] border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {bn ? 'অপারেটর নাগরিক রিপোর্ট নোটিফিকেশন' : 'Operator Citizen Report Inbox'}
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-extrabold animate-pulse">
                    {unreadCount} {bn ? 'নতুন' : 'NEW'}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                {bn
                  ? 'শুধুমাত্র দায়িত্বপ্রাপ্ত অপারেটর এই ইনবক্স দেখতে পাবেন'
                  : 'Restricted Operator-Only Triage and Verification Console'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-sky-400" />
              {bn ? 'নোটিফিকেশন লোড হচ্ছে…' : 'Loading notifications…'}
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-slate-600" />
              <p>{bn ? 'কোনো নতুন নাগরিক রিপোর্ট নেই' : 'No new citizen reports in queue'}</p>
            </div>
          )}

          {!loading &&
            notifications.map((item) => {
              const isUnread = item.status === 'UNREAD';
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedNotif(item);
                    setTriageNotes('');
                  }}
                  className={`p-3.5 rounded-xl border transition cursor-pointer relative ${
                    isUnread
                      ? 'bg-[#111a33] border-sky-500/40 hover:border-sky-400'
                      : 'bg-[#0d1424] border-slate-800/80 hover:border-slate-700 opacity-80'
                  }`}
                >
                  {isUnread && (
                    <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                  )}

                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-sky-400">
                      {item.report_id} &bull; {item.zone_name}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.created_at.slice(11, 16)}</span>
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-2 mb-2">{item.description}</p>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        item.severity === 'Severe'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : item.severity === 'Waterlogged'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {item.severity}
                    </span>

                    <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold">
                      {Math.round(item.credibility_score * 100)}% {item.credibility_band}
                    </span>

                    {item.road_blocked && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-600/30 text-rose-300">
                        {bn ? 'রাস্তা বন্ধ' : 'Road Blocked'}
                      </span>
                    )}

                    {item.debris_present && (
                      <span className="px-1.5 py-0.5 rounded bg-orange-950/60 border border-orange-600/30 text-orange-300">
                        {bn ? 'বর্জ্য / আবর্জনা' : 'Debris Hazard'}
                      </span>
                    )}

                    {item.has_photo && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-600/30 text-cyan-300 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {bn ? 'ছবি সংযুক্ত' : 'Photo Attached'}
                      </span>
                    )}
                  </div>

                  {item.gemini_summary && (
                    <div className="mt-2 p-2 rounded bg-sky-950/40 border border-sky-600/30 text-[10px] text-sky-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{item.gemini_summary}</span>
                    </div>
                  )}

                  {/* Acknowledge Action */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 text-[10px]">
                      {item.status === 'ACKNOWLEDGED'
                        ? bn
                          ? `নিশ্চিত করেছেন: ${item.acknowledged_by ?? 'অপারেটর'}`
                          : `Acknowledged by ${item.acknowledged_by ?? 'Operator'}`
                        : item.status === 'RESOLVED'
                        ? bn
                          ? 'সমাধান সম্পন্ন'
                          : 'Triaged / Resolved'
                        : bn
                        ? 'অপেক্ষমান'
                        : 'Action required'}
                    </span>

                    {isUnread ? (
                      <button
                        onClick={(e) => handleAcknowledge(item.id, e)}
                        className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold transition"
                      >
                        {bn ? 'প্রাপ্তিস্বীকার করুন' : 'Acknowledge'}
                      </button>
                    ) : (
                      <span className="text-sky-400 flex items-center gap-1 font-semibold">
                        {bn ? 'পর্যালোচনা করুন' : 'Review & Triage'} <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Selected Report Triage Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0e1628] border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#121c33]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
                <h4 className="text-sm font-bold text-white">
                  {bn ? 'নাগরিক রিপোর্ট ট্রায়াজ ও যাচাই' : 'Citizen Report Triage & Verification'}
                </h4>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Report Summary */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                  <span>ID: {selectedNotif.report_id}</span>
                  <span>{selectedNotif.created_at}</span>
                </div>
                <p className="text-slate-200 text-sm font-medium">{selectedNotif.description}</p>
                <div className="flex gap-2 text-[11px] font-semibold">
                  <span className="text-cyan-400">{selectedNotif.zone_name}</span>
                  <span className="text-slate-500">&bull;</span>
                  <span className="text-amber-400">{selectedNotif.severity}</span>
                  <span className="text-slate-500">&bull;</span>
                  <span className="text-purple-400">
                    {Math.round(selectedNotif.credibility_score * 100)}% Credibility
                  </span>
                </div>
              </div>

              {/* Photo Evidence Preview */}
              {selectedNotif.has_photo && selectedNotif.photo_url && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    {bn ? 'নাগরিক সংযুক্ত ছবি (অফ-চেইন সংরক্ষিত)' : 'Citizen Photo Evidence (Off-Chain Storage)'}
                  </label>
                  <div className="rounded-xl border border-slate-700 overflow-hidden bg-black/60 max-h-56 flex items-center justify-center relative">
                    <img
                      src={selectedNotif.photo_url}
                      alt="Citizen evidence"
                      className="w-full h-auto object-cover max-h-56"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-slate-300 font-mono">
                      SHA-256: {selectedNotif.photo_hash ? selectedNotif.photo_hash.slice(0, 16) + '...' : 'Verified'}
                    </div>
                  </div>
                </div>
              )}

              {/* Gemini Vision AI Advisory Note */}
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  {selectedNotif.gemini_provider === 'gemini'
                    ? bn
                      ? 'জেমিনাই ভিশন এআই বিশ্লেষণ (পরামর্শমূলক)'
                      : 'Gemini Vision AI Analysis (Advisory Only)'
                    : bn
                    ? 'সিমুলেশন / নিয়ম-ভিত্তিক বিশ্লেষণ'
                    : 'Simulation / Rule-Based Analysis'}
                </div>
                <p className="text-[11px] text-slate-300">
                  {selectedNotif.gemini_summary ||
                    (bn
                      ? 'চাক্ষুষ যাচাইকরণ রিপোর্টটি নিশ্চিত করেছে। পাম্প সক্রিয়করণের জন্য লোকাল সেফটি গেট বাধ্যতামূলক।'
                      : 'Visual evidence corroborates water accumulation. Physical pump activation requires local safety interlocks.')}
                </p>
              </div>

              {/* Triage Decision Choice */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300">
                  {bn ? 'অপারেটর সিদ্ধান্ত ও পরবর্তী পদক্ষেপ *' : 'Operator Action & Forwarding *'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTriageAction('VERIFY_AND_CREATE_INCIDENT')}
                    className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition ${
                      triageAction === 'VERIFY_AND_CREATE_INCIDENT'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">{bn ? 'যাচাই ও সক্রিয় করুন' : 'Verify & Create Incident'}</div>
                    <div className="text-[10px] opacity-80">
                      {bn ? 'অপারেশনাল ম্যাপ ও কিউতে যুক্ত করুন' : 'Promote to live incident response'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTriageAction('FORWARD_TO_ANALYST')}
                    className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition ${
                      triageAction === 'FORWARD_TO_ANALYST'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">{bn ? 'বিশ্লেষকের কাছে পাঠান' : 'Forward to Analyst'}</div>
                    <div className="text-[10px] opacity-80">
                      {bn ? 'জিপিইউ ও সিসিটিভি বিশদ যাচাই' : 'Regional GPU/sensor verification'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTriageAction('ESCALATE_DEBRIS')}
                    className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition ${
                      triageAction === 'ESCALATE_DEBRIS'
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">{bn ? 'বর্জ্য অপসারণে পাঠান' : 'Escalate Debris to Admin'}</div>
                    <div className="text-[10px] opacity-80">
                      {bn ? 'ডিএনসিসি পরিচ্ছন্নতা টিম পাঠান' : 'Trigger city conservancy dispatch'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTriageAction('REJECT')}
                    className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition ${
                      triageAction === 'REJECT'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">{bn ? 'বাতিল বা সমাধানকৃত' : 'Reject as Duplicate'}</div>
                    <div className="text-[10px] opacity-80">
                      {bn ? 'মিথ্যা বা ডুপ্লিকেট হিসেবে চিহ্নিত' : 'Mark as spam or redundant'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {bn ? 'অপারেটর মন্তব্য ও পর্যবেক্ষণ' : 'Operator Notes & Field Reasoning'}
                </label>
                <textarea
                  rows={2}
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder={
                    bn
                      ? 'পর্যবেক্ষণের বিবরণ বা নির্দেশিকা লিখুন…'
                      : 'Enter field verification notes or instructions…'
                  }
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {triageSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {triageSuccessMsg}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#121c33] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {bn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={triaging}
                onClick={handleExecuteTriage}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center gap-1.5 disabled:opacity-60"
              >
                {triaging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {bn ? 'সিদ্ধান্ত নিশ্চিত করুন' : 'Confirm Triage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

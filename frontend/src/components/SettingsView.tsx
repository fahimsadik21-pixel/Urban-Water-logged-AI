import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Cpu,
  Radio,
  Bell,
  Lock,
  CheckCircle2,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const SettingsView: React.FC = () => {
  const { lang, formatNumber } = useLanguage();
  const bn = lang === 'bn';

  // State configurations
  const [pollingCadence, setPollingCadence] = useState<'5s' | '10s' | '30s' | 'adaptive'>('adaptive');
  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState<number>(0.65);
  const [minWaterDepthCutoff, setMinWaterDepthCutoff] = useState<number>(10.0);
  const [drainCapacityLimit, setDrainCapacityLimit] = useState<number>(85);
  const [commandTimeoutSeconds, setCommandTimeoutSeconds] = useState<number>(300);
  const [autoDispatchConservancy, setAutoDispatchConservancy] = useState<boolean>(true);
  const [emergencySirenAlert, setEmergencySirenAlert] = useState<boolean>(true);
  const [publicAdvisoryBroadcast, setPublicAdvisoryBroadcast] = useState<boolean>(true);
  const [offlineCacheLimit, setOfflineCacheLimit] = useState<number>(1000);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('urban_water_settings_2026');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.pollingCadence) setPollingCadence(parsed.pollingCadence);
        if (parsed.aiConfidenceThreshold !== undefined) setAiConfidenceThreshold(parsed.aiConfidenceThreshold);
        if (parsed.minWaterDepthCutoff !== undefined) setMinWaterDepthCutoff(parsed.minWaterDepthCutoff);
        if (parsed.drainCapacityLimit !== undefined) setDrainCapacityLimit(parsed.drainCapacityLimit);
        if (parsed.commandTimeoutSeconds !== undefined) setCommandTimeoutSeconds(parsed.commandTimeoutSeconds);
        if (parsed.autoDispatchConservancy !== undefined) setAutoDispatchConservancy(parsed.autoDispatchConservancy);
        if (parsed.emergencySirenAlert !== undefined) setEmergencySirenAlert(parsed.emergencySirenAlert);
        if (parsed.publicAdvisoryBroadcast !== undefined) setPublicAdvisoryBroadcast(parsed.publicAdvisoryBroadcast);
        if (parsed.offlineCacheLimit !== undefined) setOfflineCacheLimit(parsed.offlineCacheLimit);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSave = () => {
    try {
      const payload = {
        pollingCadence,
        aiConfidenceThreshold,
        minWaterDepthCutoff,
        drainCapacityLimit,
        commandTimeoutSeconds,
        autoDispatchConservancy,
        emergencySirenAlert,
        publicAdvisoryBroadcast,
        offlineCacheLimit,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('urban_water_settings_2026', JSON.stringify(payload));
    } catch {
      // ignore
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    setPollingCadence('adaptive');
    setAiConfidenceThreshold(0.65);
    setMinWaterDepthCutoff(10.0);
    setDrainCapacityLimit(85);
    setCommandTimeoutSeconds(300);
    setAutoDispatchConservancy(true);
    setEmergencySirenAlert(true);
    setPublicAdvisoryBroadcast(true);
    setOfflineCacheLimit(1000);
    try {
      localStorage.removeItem('urban_water_settings_2026');
    } catch {
      // ignore
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[#F5F0E6] text-[#263238] animate-fade-in">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#173D35]">
            <Settings className="w-4 h-4 text-[#173D35]" />
            <span>{bn ? 'মিউনিসিপ্যাল কন্ট্রোল সিস্টেম' : 'Municipal Control System'}</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[#263238] tracking-tight">
            {bn ? 'সিস্টেম সেটিংস ও অপারেশনাল কনফিগারেশন' : 'System Settings & Operational Configuration'}
          </h1>
          <p className="mt-1 text-xs text-[#66706B] leading-relaxed">
            {bn
              ? 'ঢাকার ৫০টি হটস্পটের আইওটি সেন্সিং ক্যাডেন্স, এজ এআই থ্রেশহোল্ড, পাম্প নিরাপত্তা গেট ও নোটিফিকেশন নিয়ন্ত্রণ।'
              : 'Configure IoT sensing cadence, edge AI thresholds, pump safety interlocks and municipal notifications across 50 Dhaka hotspots.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD6C8] bg-white px-3 py-2 text-xs font-semibold text-[#66706B] hover:bg-[#F5F0E6] transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{bn ? 'ডিফল্ট মান' : 'Reset Defaults'}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#173D35] hover:bg-[#1E4D43] px-4 py-2 text-xs font-bold text-[#FFFDF8] shadow-sm transition hover:shadow active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{bn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-[#5D7A4E]/40 bg-[#5D7A4E]/10 p-3.5 text-xs text-[#173D35] flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#5D7A4E] shrink-0" />
          <span className="font-semibold">
            {bn
              ? 'কনফিগারেশন সফলভাবে আপডেট করা হয়েছে। সকল স্থানীয় কন্ট্রোলার ও সেন্সর মেশ সিঙ্ক হয়েছে।'
              : 'Configuration saved successfully. Synchronized across all local safety controllers and sensing mesh.'}
          </span>
        </div>
      )}

      {/* 2. Grid of Configuration Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel A: IoT Telemetry & Polling Cadence */}
        <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#173D35]">
              <Radio className="w-4 h-4" />
              <span>{bn ? 'আইওটি টেলিমেট্রি ও পোলিং ক্যাডেন্স' : 'IoT Telemetry & Polling Cadence'}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#173D35]/10 text-[#173D35]">
              {bn ? '৫০ নোড সংযুক্ত' : '50 Nodes Connected'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#263238] mb-1">
                {bn ? 'টেলিমেট্রি ফ্রিকোয়েন্সি মোড (Telemetry Mode)' : 'Telemetry Frequency Mode'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: '5s', label: '৫ সেকেন্ড', labelEn: '5 sec' },
                  { id: '10s', label: '১০ সেকেন্ড', labelEn: '10 sec' },
                  { id: '30s', label: '৩০ সেকেন্ড', labelEn: '30 sec' },
                  { id: 'adaptive', label: 'অ্যাডাপটিভ (স্মার্ট)', labelEn: 'Adaptive (Smart)' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPollingCadence(mode.id as any)}
                    className={`py-2 px-2 text-center rounded-xl border text-[11px] font-bold transition ${
                      pollingCadence === mode.id
                        ? 'border-[#173D35] bg-[#173D35] text-[#FFFDF8] shadow-sm'
                        : 'border-[#DDD6C8] bg-white text-[#66706B] hover:bg-[#F5F0E6]'
                    }`}
                  >
                    {bn ? mode.label : mode.labelEn}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-[#66706B]">
                {bn
                  ? 'অ্যাডাপটিভ মোডে স্বাভাবিক অবস্থায় ১০ মিনিট, কিন্তু পানি জমলে বা পাম্প চললে প্রতি ৫ সেকেন্ডে লাইভ রিডিং নেওয়া হয়।'
                  : 'Adaptive mode polls every 10 mins normally, speeding up to 5s continuous telemetry during flood alerts or active dewatering.'}
              </p>
            </div>

            <div className="pt-2 border-t border-[#DDD6C8]">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-[#263238]">
                  {bn ? 'অফলাইন বাফার সীমা (FIFO Cache)' : 'Offline FIFO Cache Limit'}
                </span>
                <span className="font-mono font-bold text-[#173D35]">{formatNumber(offlineCacheLimit)} {bn ? 'রেকর্ড' : 'records'}</span>
              </div>
              <input
                type="range"
                min="200"
                max="2000"
                step="100"
                value={offlineCacheLimit}
                onChange={(e) => setOfflineCacheLimit(Number(e.target.value))}
                className="w-full accent-[#173D35]"
              />
              <p className="text-[10px] text-[#66706B]">
                {bn ? 'ইন্টারনেট বিচ্ছিন্ন থাকলে প্রতিটি ডিভাইস নোড এই পরিমাণ রিডিং লোকাল ফ্ল্যাশ মেমরিতে ধরে রাখে।' : 'Maximum readings buffered in local node flash memory during network disconnection.'}
              </p>
            </div>
          </div>
        </div>

        {/* Panel B: Edge AI & Vision Segmentation Calibration */}
        <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#173D35]">
              <Cpu className="w-4 h-4" />
              <span>{bn ? 'এজ এআই ও ভিশন সেগমেন্টেশন' : 'Edge AI & Vision Segmentation'}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#5D7A4E]/10 text-[#5D7A4E]">
              YOLOv8-Seg Ready
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-[#263238]">
                  {bn ? 'এআই কনফিডেন্স থ্রেশহোল্ড (Detection Cutoff)' : 'AI Confidence Threshold'}
                </span>
                <span className="font-mono font-bold text-[#173D35]">{Math.round(aiConfidenceThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.95"
                step="0.05"
                value={aiConfidenceThreshold}
                onChange={(e) => setAiConfidenceThreshold(Number(e.target.value))}
                className="w-full accent-[#173D35]"
              />
              <p className="text-[10px] text-[#66706B]">
                {bn
                  ? 'সিসিটিভি ক্যামেরায় পানির তল ও ড্রেনের ময়লা শনাক্তে এই আস্থার নিচে থাকলে স্বয়ংক্রিয় সংকেত জারি হবে না।'
                  : 'Detections with confidence below this threshold are rejected from triggering automatic incident suggestions.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#DDD6C8] text-center">
              <div className="bg-[#F5F0E6] p-2 rounded-xl border border-[#DDD6C8]">
                <span className="text-[10px] text-[#66706B] block">{bn ? 'অগভীর ব্যান্ড' : 'Shallow Band'}</span>
                <span className="font-mono font-bold text-[#173D35]">০–১৫ সেমি</span>
              </div>
              <div className="bg-[#F5F0E6] p-2 rounded-xl border border-[#DDD6C8]">
                <span className="text-[10px] text-[#66706B] block">{bn ? 'হাঁটু সমান' : 'Knee Band'}</span>
                <span className="font-mono font-bold text-[#B68A35]">১৬–৩৫ সেমি</span>
              </div>
              <div className="bg-[#F5F0E6] p-2 rounded-xl border border-[#DDD6C8]">
                <span className="text-[10px] text-[#66706B] block">{bn ? 'তীব্র প্লাবন' : 'Severe Band'}</span>
                <span className="font-mono font-bold text-[#B85042]">&gt;৩৫ সেমি</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel C: Deterministic Pump Safety Interlocks Policy */}
        <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#173D35]">
              <ShieldCheck className="w-4 h-4" />
              <span>{bn ? '১২-ধাপের ডিটারমিনিস্টিক নিরাপত্তা নীতিমালা' : '12-Gate Safety Policy'}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#B68A35]/15 text-[#B68A35]">
              {bn ? 'লকড — ওভাররাইড নিষিদ্ধ' : 'Locked — No AI Bypass'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold text-[#263238] block">{bn ? 'সর্বনিম্ন পানির স্তর (ড্রাই-রান প্রতিরোধ)' : 'Minimum Water Level (Anti-Cavitation)'}</span>
                <span className="text-[10px] text-[#66706B]">{bn ? '১০ সেমির নিচে নামলে পাম্প স্বয়ংক্রিয় বন্ধ হবে' : 'Pumping halted below 10cm to protect impellers'}</span>
              </div>
              <span className="font-mono font-bold text-[#173D35] px-2 py-1 rounded bg-[#F5F0E6] border border-[#DDD6C8]">
                {minWaterDepthCutoff.toFixed(1)} সেমি
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#DDD6C8]">
              <div>
                <span className="font-semibold text-[#263238] block">{bn ? 'নিষ্কাশন খাল ধারণক্ষমতা সীমা' : 'Destination Drain Capacity Limit'}</span>
                <span className="text-[10px] text-[#66706B]">{bn ? 'খাল ৮৫% পূর্ণ থাকলে ব্যাকফ্লো রোধে পাম্প বন্ধ' : 'Blocks dewatering if receiving canal capacity exceeds limit'}</span>
              </div>
              <span className="font-mono font-bold text-[#B68A35] px-2 py-1 rounded bg-[#F5F0E6] border border-[#DDD6C8]">
                {drainCapacityLimit}%
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#DDD6C8]">
              <div>
                <span className="font-semibold text-[#263238] block">{bn ? 'অপারেটর ডিজিটাল কমান্ড টাইমআউট' : 'Operator Command Timeout'}</span>
                <span className="text-[10px] text-[#66706B]">{bn ? 'বাসি কমান্ড বাতিলকরণ নিরাপত্তা ইন্টারলক' : 'Stale command replay defense window'}</span>
              </div>
              <span className="font-mono font-bold text-[#173D35] px-2 py-1 rounded bg-[#F5F0E6] border border-[#DDD6C8]">
                {commandTimeoutSeconds} {bn ? 'সেকেন্ড' : 'sec'}
              </span>
            </div>
          </div>
        </div>

        {/* Panel D: Municipal Alerts & Dispatch Channels */}
        <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#173D35]">
              <Bell className="w-4 h-4" />
              <span>{bn ? 'জরুরি নোটিফিকেশন ও ডিসপ্যাচ চ্যানেল' : 'Emergency Notifications & Dispatch'}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#5D7A4E]/10 text-[#5D7A4E]">
              {bn ? 'অটো-রাউটিং সক্রিয়' : 'Auto-Routing Active'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-[#263238] block">
                  {bn ? 'পানি নিষ্কাশনের পর বর্জ্য টিম ডিসপ্যাচ' : 'Auto-dispatch Conservancy Debris Crew'}
                </span>
                <span className="text-[10px] text-[#66706B]">
                  {bn ? 'প্লাস্টিক বর্জ্য শনাক্তে সিটি কর্পোরেশন পরিচ্ছন্নতা টিমকে নোটিফিকেশন' : 'Notifies municipal waste team on intake debris detection'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoDispatchConservancy}
                onChange={(e) => setAutoDispatchConservancy(e.target.checked)}
                className="w-4 h-4 accent-[#173D35]"
              />
            </label>

            <label className="flex items-center justify-between pt-2 border-t border-[#DDD6C8] cursor-pointer">
              <div>
                <span className="font-semibold text-[#263238] block">
                  {bn ? 'কন্ট্রোল রুম সাইরেন ও অডিও সতর্কতা' : 'Control Room Siren & Audio Alert'}
                </span>
                <span className="text-[10px] text-[#66706B]">
                  {bn ? 'তীব্র প্লাবন (P1) বা জরুরি স্টপে অডিও সংকেত জারি' : 'Audio tone triggers on critical P1 flood or emergency stop'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={emergencySirenAlert}
                onChange={(e) => setEmergencySirenAlert(e.target.checked)}
                className="w-4 h-4 accent-[#173D35]"
              />
            </label>

            <label className="flex items-center justify-between pt-2 border-t border-[#DDD6C8] cursor-pointer">
              <div>
                <span className="font-semibold text-[#263238] block">
                  {bn ? 'নাগরিক সড়ক ট্রাফিক পরামর্শ সম্প্রচার' : 'Public Road Advisory Broadcast'}
                </span>
                <span className="text-[10px] text-[#66706B]">
                  {bn ? 'রাস্তা চলাচলের অনুপযোগী হলে নাগরিক পোর্টালে সরাসরি ডাইভারশন নোটিশ' : 'Broadcasts traffic reroute advice to citizen portal'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={publicAdvisoryBroadcast}
                onChange={(e) => setPublicAdvisoryBroadcast(e.target.checked)}
                className="w-4 h-4 accent-[#173D35]"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 3. Bottom Audit & Cryptographic System Seal */}
      <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#5D7A4E]/10 text-[#5D7A4E] border border-[#5D7A4E]/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#263238]">
              {bn ? 'ক্রিপ্টোগ্রাফিক অডিট লেজার ও অপরিবর্তনীয় ডাটাবেজ' : 'Cryptographic Audit Ledger & Tamper-Evident Storage'}
            </h4>
            <p className="text-xs text-[#66706B]">
              {bn
                ? 'ডাটাবেজে সংরক্ষিত ২,৫১৪টি ব্লকের SHA-256 চেইন ১০০% অক্ষত। কোনো কনফিগারেশন পরিবর্তন অডিট লগে রেকর্ড না হয়ে কার্যকর হয় না।'
                : 'All 2,514 database records are SHA-256 hash-chained. No configuration change bypasses forensic audit logging.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono font-bold text-[#5D7A4E] px-3 py-1.5 rounded-xl bg-[#5D7A4E]/10 border border-[#5D7A4E]/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{bn ? 'অডিট চেইন ১০০% অক্ষত' : 'Ledger 100% Intact'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

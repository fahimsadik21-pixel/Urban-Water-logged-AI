import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  X,
  CheckCircle2,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Maximize2,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch } from '../lib/api';

export interface VideoTourStageConfig {
  stageNumber: number;
  id: string;
  targetTab: string;
  persona: 'civic' | 'analyst' | 'operator' | 'admin';
  expectedState: string;
  titleBn: string;
  titleEn: string;
  narrationBn: string;
  narrationEn: string;
  actionBn: string;
  actionEn: string;
}

export const VIDEO_TOUR_STAGES: VideoTourStageConfig[] = [
  {
    stageNumber: 1,
    id: 'STAGE_1_CIVIC',
    targetTab: 'public_sim',
    persona: 'civic',
    expectedState: 'CITIZEN_REPORT_RECEIVED',
    titleBn: 'ধাপ ১: নাগরিক রিপোর্ট ও ট্রাফিক সতর্কতা',
    titleEn: 'Stage 1: Civic Report & Public Advisory',
    narrationBn:
      'নাগরিক সেবা পোর্টালে ফার্মগেট আনন্দ মোড়ে বৃষ্টির পর জলাবদ্ধতার সতর্কতা প্রদর্শন ও নাগরিকের নিকট হতে ছবি সহ রিপোর্ট গ্রহণ।',
    narrationEn:
      'Citizen receives waterlogging advisory for Farmgate Ananda Mor and submits localized report with synthetic photo.',
    actionBn: 'ফার্মগেটে নাগরিক রিপোর্ট গ্রহণ সম্পন্ন (Tracking ID তৈরি)',
    actionEn: 'Citizen report registered with secure tracking ID.',
  },
  {
    stageNumber: 2,
    id: 'STAGE_2_MAP_SEVERE',
    targetTab: 'operations',
    persona: 'analyst',
    expectedState: 'SENSOR_RISE_DETECTED',
    titleBn: 'ধাপ ২: লাইভ অপারেশন্স ম্যাপ ও তীব্র জলাবদ্ধতা শনাক্ত',
    titleEn: 'Stage 2: Live Operations Map & Severe Hotspot Inundation',
    narrationBn:
      'লাইভ অপারেশন মানচিত্রে ফার্মগেট এলাকা লাল চিহ্নে "Severe" হিসেবে প্রদর্শিত হচ্ছে এবং রাস্তার যান চলাচল অনুপযোগী (Impassable) ঘোষণা করা হয়েছে।',
    narrationEn:
      'Farmgate marker turns red (Severe, 24.8 cm depth). Road declared impassable with active incident priority P1.',
    actionBn: 'মানচিত্রে সিমুলেশন প্রজেকশন ওভারলে সক্রিয় (লাল মার্কার)',
    actionEn: 'Simulation overlay active: Farmgate marked Severe.',
  },
  {
    stageNumber: 3,
    id: 'STAGE_3_EDGE_VISION',
    targetTab: 'fleet',
    persona: 'analyst',
    expectedState: 'CAMERA_EVIDENCE_ANALYZED',
    titleBn: 'ধাপ ৩: সিসিটিভি ক্যামেরা ও এজ এআই ভিশন বিশ্লেষণ',
    titleEn: 'Stage 3: Edge CCTV Camera & Computer Vision Inference',
    narrationBn:
      'সিসিটিভি ক্যামেরা ফ্রেম ফ্রেম-বাই-ফ্রেম YOLOv8-seg মডেলে প্রসেস করে পানির তলদেশ সেগমেন্টেশন এবং ড্রেনের মুখে বর্জ্য শনাক্ত করা হয়েছে।',
    narrationEn:
      'Edge camera streams analyzed via YOLOv8-seg model, segmenting flood polygon and detecting plastic inlet blockage.',
    actionBn: 'এআই ভিশন ইনফ্যারেন্স সম্পন্ন (৯৭.৩% নিশ্চিততা ও SHA-256 এভিডেন্স হ্যাশ)',
    actionEn: 'Vision inference complete (97.3% conf, evidence hash sealed).',
  },
  {
    stageNumber: 4,
    id: 'STAGE_4_ANALYST_TRIAGE',
    targetTab: 'intelligence',
    persona: 'analyst',
    expectedState: 'ANALYST_REVIEW_REQUIRED',
    titleBn: 'ধাপ ৪: অ্যানালিস্ট ইনটেলিজেন্স ও নিষ্কাশন সুপারিশ',
    titleEn: 'Stage 4: Hydrological Analyst Triage & Dewatering Request',
    narrationBn:
      'বিশ্লেষক সিসিটিভি ফ্রেম, ডাব্লিউএলএস সেন্সর পাঠ (২৪.৮ সেমি) এবং নাগরিক রিপোর্ট মিলিয়ে ফিউশন নিশ্চিত করেন এবং মোবাইল পাম্প ইউনিট ডিসপ্যাচের সুপারিশ পাঠান।',
    narrationEn:
      'Hydrological analyst corroborates multi-modal evidence and submits formal recommendation for mobile pump dispatch.',
    actionBn: 'অ্যানালিস্ট সুপারিশ অনুমোদিত (মোবাইল ইউনিট M-PUMP_014 প্রস্তাবিত)',
    actionEn: 'Analyst approved dewatering recommendation for M-PUMP_014.',
  },
  {
    stageNumber: 5,
    id: 'STAGE_5_ADMIN_OVERSIGHT',
    targetTab: 'admin',
    persona: 'admin',
    expectedState: 'ADMIN_ACKNOWLEDGED',
    titleBn: 'ধাপ ৫: সিটি কর্পোরেশন নির্বাহী অনুমোদন ও রিসোর্স বরাদ্দ',
    titleEn: 'Stage 5: Central Municipal Admin Authorization & Asset Allocation',
    narrationBn:
      'সিটি কর্পোরেশনের কেন্দ্রীয় কমান্ড থেকে ঘটনার গুরুত্ব P1 অনুমোদন করা হয় এবং ডিজেল জেনারেটর সহ মোবাইল পাম্প ট্রেলার ও ক্রু ফিল্ডে পাঠানো হয়।',
    narrationEn:
      'Central municipal command acknowledges incident P1 severity and formally assigns mobile dewatering trailer #14 and crew.',
    actionBn: 'প্রশাসনিক অনুমোদন সম্পন্ন (অপারেটর কিউতে প্রেরণ)',
    actionEn: 'Administrative dispatch decree issued to Operator Queue.',
  },
  {
    stageNumber: 6,
    id: 'STAGE_6_OPERATOR_SAFETY',
    targetTab: 'pumps',
    persona: 'operator',
    expectedState: 'SIMULATED_PUMP_ACTIVE',
    titleBn: 'ধাপ ৬: অপারেটর ১২-গেট নিরাপত্তা পরীক্ষণ ও ডিজিটাল সাইন',
    titleEn: 'Stage 6: Operator 12-Gate Deterministic Safety & Signed Actuation',
    narrationBn:
      'পাম্প চালুর পূর্বে ১২টি সেফটি গেট (ড্রেন ক্যাপাসিটি, ড্রাই-রান, মোটর তাপমাত্রা, ই-স্টপ) যাচাই করে অপারেটর ক্রিপ্টোগ্রাফিক সাইন দেন এবং লোকাল কন্ট্রোলার একনলেজ করে।',
    narrationEn:
      'Operator verifies all 12 deterministic safety interlocks before signing. Simulated local edge controller acknowledges command.',
    actionBn: 'লোকাল কন্ট্রোলার একনলেজমেন্ট প্রাপ্ত (৪০.০ লি/সে নিষ্কাশন সক্রিয়)',
    actionEn: 'Simulated local controller acknowledged: 40.0 L/s flow active.',
  },
  {
    stageNumber: 7,
    id: 'STAGE_7_WATER_RECEDING',
    targetTab: 'operations',
    persona: 'analyst',
    expectedState: 'WATER_LEVEL_RECOVERING',
    titleBn: 'ধাপ ৭: পানি নিষ্কাশন সফল ও মানচিত্রে রিকভারি',
    titleEn: 'Stage 7: Water Receded & Dynamic Map Recovery to Normal',
    narrationBn:
      'বেগুনবাড়ি খালে পানি অপসারণের পর পানির গভীরতা ৪.৫ সেমিতে নেমে এসেছে। মানচিত্রে লাল মার্কার পরিবর্তিত হয়ে নিরাপদ "Normal" অবস্থায় ফিরে এসেছে।',
    narrationEn:
      'Continuous dewatering reduces water depth to 4.5 cm (< 10cm safe threshold). Map dynamically clears severe status to Normal.',
    actionBn: 'মানচিত্র রিকভারি সম্পন্ন (পানি স্তর স্বাভাবিক, সক্রিয় ঘটনার সংখ্যা হ্রাস)',
    actionEn: 'Map projection recovered to Normal; active incident count dropped.',
  },
  {
    stageNumber: 8,
    id: 'STAGE_8_DEBRIS_AUDIT',
    targetTab: 'admin',
    persona: 'admin',
    expectedState: 'RESOLVED',
    titleBn: 'ধাপ ৮: পোস্ট-ড্রেন বর্জ্য অপসারণ ও ব্লকচেইন অডিট প্রমাণ',
    titleEn: 'Stage 8: Post-Dewatering Debris Triage & Immutable Audit Verification',
    narrationBn:
      'পানি নামার পর ড্রেন মুখে জমে থাকা প্লাস্টিক বর্জ্য অপসারণে পরিচ্ছন্নতা দল পাঠানো হয়েছে এবং সম্পূর্ণ অপারেশনের অপরিবর্তনীয় SHA-256 লেজার ১০০% ভেরিফাইড।',
    narrationEn:
      'Post-dewatering debris cleared by rapid conservancy crew. Complete end-to-end operation cryptographically verified via SHA-256 ledger.',
    actionBn: 'অডিট লেজার ১০০% অক্ষুণ্ণ (VERIFIED) ও ট্যাম্পার টেস্ট সফল',
    actionEn: 'Audit chain verified intact (VERIFIED); tamper detection proven.',
  },
];

interface VideoDemoTourDockProps {
  isOpen: boolean;
  onClose: () => void;
  activeRun: any;
  onRunUpdated: (updatedRun: any) => void;
  onNavigateTab: (tab: string) => void;
  onOpenFullModal: () => void;
}

export const VideoDemoTourDock: React.FC<VideoDemoTourDockProps> = ({
  isOpen,
  onClose,
  activeRun,
  onRunUpdated,
  onNavigateTab,
  onOpenFullModal,
}) => {
  const { lang } = useLanguage();
  const bn = lang === 'bn';

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 5 | 15>(1);
  const [countdown, setCountdown] = useState<number>(4);
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastApiStatus, setLastApiStatus] = useState<{ method: string; url: string; code: number; latency: number } | null>(null);

  const countdownIntervalRef = useRef<number | null>(null);

  const stage = VIDEO_TOUR_STAGES[currentStageIndex];

  // Helper to execute API call with latency tracking
  const callApiWithTracking = useCallback(async <T,>(method: string, url: string, body?: any): Promise<T> => {
    const t0 = performance.now();
    const res = await apiFetch<T>(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    const t1 = performance.now();
    setLastApiStatus({
      method,
      url,
      code: 200,
      latency: Math.round(t1 - t0),
    });
    return res;
  }, []);

  // Sync current stage tab and persona
  const applyStageContext = useCallback(async (stg: VideoTourStageConfig, runId: string) => {
    onNavigateTab(stg.targetTab);
    try {
      await callApiWithTracking('POST', `/api/v1/simulation/runs/${runId}/select-persona`, {
        persona: stg.persona,
      });
    } catch {
      // ignore
    }
  }, [callApiWithTracking, onNavigateTab]);

  // Execute transition to a given stage index
  const goToStage = useCallback(async (targetIdx: number) => {
    if (!activeRun) return;
    const clamped = Math.max(0, Math.min(targetIdx, VIDEO_TOUR_STAGES.length - 1));
    const targetStage = VIDEO_TOUR_STAGES[clamped];
    setCurrentStageIndex(clamped);
    setLoading(true);

    try {
      // 1. Apply UI tab and demo persona
      await applyStageContext(targetStage, activeRun.demo_run_id);

      // 2. Advance backend state machine towards targetStage expectedState
      let currentRunState = activeRun.current_state;
      let maxSteps = 4;
      while (maxSteps > 0 && currentRunState !== targetStage.expectedState) {
        maxSteps--;
        try {
          const res = await callApiWithTracking<any>(
            'POST',
            `/api/v1/simulation/runs/${activeRun.demo_run_id}/next-step`
          );
          currentRunState = res.current_state;
          onRunUpdated(res);
          if (res.current_state === targetStage.expectedState) break;
        } catch {
          break;
        }
      }
      setCountdown(Math.max(1, Math.round(4 / speedMultiplier)));
    } catch (err) {
      console.error('Error during video tour step:', err);
    } finally {
      setLoading(false);
    }
  }, [activeRun, applyStageContext, callApiWithTracking, onRunUpdated, speedMultiplier]);

  // Next step handler
  const handleNextStep = useCallback(() => {
    if (currentStageIndex < VIDEO_TOUR_STAGES.length - 1) {
      void goToStage(currentStageIndex + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentStageIndex, goToStage]);

  // Previous step handler
  const handlePrevStep = useCallback(() => {
    if (currentStageIndex > 0) {
      const prevIdx = currentStageIndex - 1;
      setCurrentStageIndex(prevIdx);
      const prevStage = VIDEO_TOUR_STAGES[prevIdx];
      if (activeRun) {
        void applyStageContext(prevStage, activeRun.demo_run_id);
      }
    }
  }, [activeRun, applyStageContext, currentStageIndex]);

  // Reset handler
  const handleResetTour = useCallback(async () => {
    if (!activeRun) return;
    setIsPlaying(false);
    setLoading(true);
    try {
      const res = await callApiWithTracking<any>(
        'POST',
        `/api/v1/simulation/runs/${activeRun.demo_run_id}/reset`
      );
      onRunUpdated(res);
      setCurrentStageIndex(0);
      onNavigateTab(VIDEO_TOUR_STAGES[0].targetTab);
      setCountdown(4);
    } catch (err) {
      console.error('Error resetting tour:', err);
    } finally {
      setLoading(false);
    }
  }, [activeRun, callApiWithTracking, onNavigateTab, onRunUpdated]);

  // Auto-play timer effect
  useEffect(() => {
    if (!isPlaying || !isOpen) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    const intervalTime = 1000 / speedMultiplier;
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleNextStep();
          return Math.max(1, Math.round(4 / speedMultiplier));
        }
        return prev - 1;
      });
    }, intervalTime);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [handleNextStep, isPlaying, isOpen, speedMultiplier]);

  // Initial stage alignment on open
  useEffect(() => {
    if (isOpen && activeRun) {
      void applyStageContext(VIDEO_TOUR_STAGES[currentStageIndex], activeRun.demo_run_id);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-5xl rounded-2xl border border-amber-500/40 bg-slate-950/95 shadow-2xl backdrop-blur-xl transition-all duration-300 text-slate-100 ${
        isMinimized ? 'p-3' : 'p-4 sm:p-5'
      }`}
      role="region"
      aria-label={bn ? 'ভিডিও ডেমো ট্যুর কন্ট্রোলার' : 'Video Demo Tour Controller'}
    >
      {/* 1. Header Bar: Tour Title, Stage Counter, Presentation Controls */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-600 to-yellow-500 text-slate-950 font-black shadow-md">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold tracking-tight text-white truncate">
                {bn ? 'ভিডিও ডেমো ট্যুর (হ্যাকাতন প্রেজেন্টেশন মোড)' : 'Video Demo Tour (Hackathon Presentation Mode)'}
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                {bn ? `ধাপ ${stage.stageNumber} / ৮` : `Stage ${stage.stageNumber} of 8`}
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Icons: Full Modal, Minimize, Exit */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenFullModal}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-700 transition"
            title={bn ? 'পূর্ণাঙ্গ সিমুলেশন কন্ট্রোল প্যানেল খুলুন' : 'Open Full Control Modal'}
          >
            <Maximize2 className="h-3 w-3" />
            <span className="hidden sm:inline">{bn ? 'পূর্ণ প্যানেল' : 'Details'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized((prev) => !prev)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title={isMinimized ? 'Expand' : 'Collapse'}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition"
            title={bn ? 'ট্যুর বন্ধ করুন' : 'Exit Tour'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Expanded Tour Narration & Context Area */}
      {!isMinimized && (
        <div className="py-3 space-y-3">
          {/* Stage Progress Bar (8 Interactive Step Dots) */}
          <div className="grid grid-cols-8 gap-1.5">
            {VIDEO_TOUR_STAGES.map((stg, i) => {
              const isPast = i < currentStageIndex;
              const isCurrent = i === currentStageIndex;
              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => void goToStage(i)}
                  className={`group flex flex-col items-center gap-1 text-left transition ${
                    isCurrent ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`h-1.5 w-full rounded-full transition-all ${
                      isCurrent
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                        : isPast
                        ? 'bg-emerald-500'
                        : 'bg-slate-800'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-400 truncate hidden md:block">
                    {i + 1}. {stg.persona}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Stage Narration Banner */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-3 sm:p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-bold text-amber-300">
                  {bn ? stage.titleBn : stage.titleEn}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-slate-400">Page:</span>
                <strong className="text-cyan-300">/{stage.targetTab}</strong>
                <span className="text-slate-400 ml-2">Role:</span>
                <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 uppercase text-[10px]">
                  {stage.persona}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              📢 <strong>{bn ? 'ধারাভাষ্য (Voiceover):' : 'Voiceover Script:'}</strong>{' '}
              {bn ? stage.narrationBn : stage.narrationEn}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {bn ? stage.actionBn : stage.actionEn}
              </span>
              {lastApiStatus && (
                <span className="font-mono text-[10px] text-slate-400">
                  ⚡ {lastApiStatus.method} {lastApiStatus.url.replace('/api/v1/simulation/runs/', '.../')} (
                  {lastApiStatus.code} OK • {lastApiStatus.latency}ms)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Bottom Playback Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Play/Pause, Step Advance, Speed Multiplier */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-md transition ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>{bn ? `পজ (${countdown}s)` : `Pause (${countdown}s)`}</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>{bn ? 'অটো-প্লে শুরু করুন' : 'Start Auto-Play'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStageIndex === 0 || loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-300 transition"
            title={bn ? 'পূর্ববর্তী ধাপ' : 'Previous Step'}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleNextStep}
            disabled={currentStageIndex >= VIDEO_TOUR_STAGES.length - 1 || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold text-slate-200 transition"
            title={bn ? 'পরবর্তী ধাপ' : 'Next Step'}
          >
            <span>{bn ? 'পরবর্তী ধাপ' : 'Next Step'}</span>
            <SkipForward className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => void handleResetTour()}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-amber-300 transition"
            title={bn ? 'পুনরায় শুরু (Reset)' : 'Reset Tour'}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Speed Selector & Disclaimer Notice */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-400 px-1.5 font-sans text-[10px]">{bn ? 'গতি:' : 'Speed:'}</span>
            {([1, 5, 15] as const).map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => setSpeedMultiplier(sp)}
                className={`px-2 py-0.5 rounded-lg font-bold transition ${
                  speedMultiplier === sp
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>

          <span className="hidden xl:inline-block text-[10px] text-slate-400 italic">
            {bn ? '⚠️ সিমুলেশন ডেমো — কোনো বাস্তব কমান্ড প্রেরণ করা হয় না।' : '⚠️ Sandbox environment. No real field command issued.'}
          </span>
        </div>
      </div>
    </div>
  );
};

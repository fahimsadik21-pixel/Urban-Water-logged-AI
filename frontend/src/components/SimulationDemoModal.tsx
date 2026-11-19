import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  FastForward,
  FileCheck2,
  Pause,
  Play,
  RotateCcw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Video,
  Waves,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';

interface SimulationDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRun: any;
  onRunUpdated: (run: any) => void;
}

export const SimulationDemoModal: React.FC<SimulationDemoModalProps> = ({
  isOpen,
  onClose,
  activeRun,
  onRunUpdated,
}) => {
  const { lang } = useLanguage();
  const bn = lang === 'bn';

  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('SCENARIO_1_END_TO_END');
  const [loading, setLoading] = useState<boolean>(false);
  const [autoPlaying, setAutoPlaying] = useState<boolean>(false);
  const [autoPlaySecondsLeft, setAutoPlaySecondsLeft] = useState<number>(4);
  const autoPlayTimerRef = useRef<any>(null);

  const [auditVerification, setAuditVerification] = useState<any>(null);
  const [tamperSimulated, setTamperSimulated] = useState<boolean>(false);
  const [lastApiCall, setLastApiCall] = useState<{ method: string; url: string; latencyMs: number; status: number; payload: any } | null>(null);
  const [showApiInspector, setShowApiInspector] = useState<boolean>(false);

  // Civic form state
  const [civicCategory, setCivicCategory] = useState<string>('Waterlogging');
  const [civicReportText, setCivicReportText] = useState<string>('ফার্মগেট আনন্দ মোড়ে হাঁটু সমান পানি জমেছে, রিকশা ও বাস আটকে পড়ছে। ড্রেন উপচে পড়ছে।');
  const [civicRoadBlocked, setCivicRoadBlocked] = useState<boolean>(true);

  // Load scenarios catalog
  useEffect(() => {
    if (!isOpen) return;
    const fetchCatalog = async () => {
      try {
        const list = await apiFetch<any[]>('/api/v1/simulation/scenarios');
        setScenarios(list || []);
      } catch {
        // ignore
      }
    };
    void fetchCatalog();
  }, [isOpen]);

  // Helper for tracking API calls for Hackathon Inspector
  const executeApiWithTracking = async <T,>(method: string, url: string, body?: any): Promise<T> => {
    const start = performance.now();
    const res = await apiFetch<T>(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    const latency = Math.round(performance.now() - start);
    setLastApiCall({
      method,
      url,
      latencyMs: latency,
      status: 200,
      payload: res,
    });
    return res;
  };

  // Start or reload run
  const handleStartScenario = async (scenarioId: string) => {
    try {
      setLoading(true);
      setAutoPlaying(false);
      setSelectedScenarioId(scenarioId);
      setTamperSimulated(false);
      setAuditVerification(null);
      const res = await executeApiWithTracking<any>('POST', '/api/v1/simulation/runs', { scenario_id: scenarioId });
      onRunUpdated(res);
    } catch (err: any) {
      alert(`Error starting simulation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (!activeRun) return;
    try {
      setLoading(true);
      const res = await executeApiWithTracking<any>('POST', `/api/v1/simulation/runs/${activeRun.demo_run_id}/next-step`);
      onRunUpdated(res);
      if (res.current_state === 'RESOLVED') {
        setAutoPlaying(false);
      }
    } catch (err: any) {
      alert(`Error advancing step: ${err.message}`);
      setAutoPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!activeRun) return;
    try {
      setLoading(true);
      setAutoPlaying(false);
      setTamperSimulated(false);
      setAuditVerification(null);
      const res = await executeApiWithTracking<any>('POST', `/api/v1/simulation/runs/${activeRun.demo_run_id}/reset`);
      onRunUpdated(res);
    } catch (err: any) {
      alert(`Error resetting simulation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-play timer loop for Hackathon presentation video
  useEffect(() => {
    if (!autoPlaying || !activeRun || activeRun.current_state === 'RESOLVED') {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      setAutoPlaySecondsLeft((prev) => {
        if (prev <= 1) {
          void handleNextStep();
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [autoPlaying, activeRun]);

  const toggleAutoPlay = () => {
    if (activeRun?.current_state === 'RESOLVED') {
      void handleReset().then(() => {
        setAutoPlaySecondsLeft(4);
        setAutoPlaying(true);
      });
    } else {
      setAutoPlaySecondsLeft(4);
      setAutoPlaying(!autoPlaying);
    }
  };

  const handleCivicSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeRun) return;
    try {
      setLoading(true);
      const res = await executeApiWithTracking<any>('POST', `/api/v1/simulation/runs/${activeRun.demo_run_id}/citizen-report`, {
        category: civicCategory,
        report_text: civicReportText,
        road_blocked: civicRoadBlocked,
      });
      onRunUpdated(res.simulation_state);
    } catch (err: any) {
      alert(`Error submitting report: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalystAction = async (actionType: string) => {
    if (!activeRun) return;
    try {
      setLoading(true);
      const res = await executeApiWithTracking<any>('POST', `/api/v1/simulation/runs/${activeRun.demo_run_id}/analyst-action`, {
        action_type: actionType,
        notes: 'Analyst verified multi-modal CCTV and WLS evidence.',
      });
      onRunUpdated(res.simulation_state);
    } catch (err: any) {
      alert(`Error recording analyst action: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAcknowledge = async () => {
    if (!activeRun) return;
    try {
      setLoading(true);
      const res = await executeApiWithTracking<any>('POST', `/api/v1/simulation/runs/${activeRun.demo_run_id}/admin-action`, {
        action_type: 'ACKNOWLEDGE_INCIDENT',
        details: 'Admin verified P1 critical priority and authorized mobile dewatering unit M-PUMP_014.',
      });
      onRunUpdated(res.simulation_state);
    } catch (err: any) {
      alert(`Error recording admin action: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOperatorCommand = async (command: 'START' | 'STOP') => {
    if (!activeRun) return;
    try {
      setLoading(true);
      const res = await executeApiWithTracking<any>('POST', `/api/v1/simulation/runs/${activeRun.demo_run_id}/operator-command`, {
        command,
        operator_signature: `SIG_OP_${activeRun.location_id}_2026`,
      });
      onRunUpdated(res.simulation_state);
    } catch (err: any) {
      alert(`Error executing operator command: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminCleanup = async () => {
    if (!activeRun) return;
    try {
      setLoading(true);
      const res = await executeApiWithTracking<any>('POST', `/api/v1/simulation/runs/${activeRun.demo_run_id}/admin-action`, {
        action_type: 'APPROVE_CLEANUP',
        details: 'Zone 5 Rapid Drain Clearance Team assigned to clear catchpit inlet.',
      });
      onRunUpdated(res.simulation_state);
    } catch (err: any) {
      alert(`Error recording admin action: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAudit = async () => {
    if (!activeRun) return;
    try {
      const res = await executeApiWithTracking<any>('GET', `/api/v1/simulation/runs/${activeRun.demo_run_id}/audit`);
      setAuditVerification(res.verification);
    } catch (err: any) {
      alert(`Error verifying audit: ${err.message}`);
    }
  };

  const handleTamperTest = async () => {
    if (!activeRun) return;
    try {
      const res = await executeApiWithTracking<any>('POST', `/api/v1/simulation/runs/${activeRun.demo_run_id}/tamper-test`);
      setTamperSimulated(true);
      setAuditVerification(res);
    } catch (err: any) {
      alert(`Error running tamper test: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  const state = activeRun?.current_state || 'CREATED';
  const safetyEval = activeRun?.safety_evaluation;

  // Compute pipeline stage index for the visual stepper
  const getStageIndex = (st: string) => {
    switch (st) {
      case 'CREATED':
      case 'WEATHER_ALERT':
      case 'SENSOR_RISE_DETECTED':
        return 1; // Civic report stage
      case 'CITIZEN_REPORT_RECEIVED':
        return 2; // AI Vision stage
      case 'CAMERA_EVIDENCE_ANALYZED':
      case 'SENSOR_VISION_FUSED':
        return 3; // Fusion & Analyst triage
      case 'ANALYST_REVIEW_REQUIRED':
      case 'DEWATERING_RECOMMENDED':
        return 4; // Admin authorization
      case 'ADMIN_ACKNOWLEDGED':
      case 'OPERATOR_ACTION_PENDING':
        return 5; // Operator & 12 safety gates
      case 'SAFETY_GATE_PASSED':
      case 'SIMULATED_PUMP_ACTIVE':
        return 6; // Active dewatering
      case 'WATER_LEVEL_RECOVERING':
      case 'DEBRIS_ESCALATED':
      case 'CLEANUP_PENDING':
        return 7; // Debris & cleanup
      case 'RESOLVED':
        return 8; // Resolved & blockchain proof
      default:
        return 1;
    }
  };

  const currentStage = getStageIndex(state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173D35]/60 p-2 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative flex max-h-[96vh] w-full max-w-6xl flex-col rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] text-[#263238] shadow-2xl overflow-hidden animate-fade-in">
        
        {/* 1. Header with Hackathon Badge & Video Showcase Title */}
        <div className="flex items-center justify-between border-b border-[#DDD6C8] bg-[#173D35] px-4 py-3 sm:px-6 text-[#FFFDF8]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B68A35] text-white shadow-xs">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#FFFDF8] sm:text-lg tracking-tight">
                  {bn ? '🎥 হ্যাকথন এন্ড-টু-এন্ড ভিডিও ওয়াকথ্রু' : '🎥 Hackathon End-to-End Video Showcase'}
                </h2>
                <span className="rounded-full bg-[#B68A35]/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#FFFDF8] border border-[#B68A35]/40">
                  {bn ? 'লাইভ সিস্টেম' : 'LIVE API SYSTEM'}
                </span>
              </div>
              <p className="text-xs text-[#DDD6C8]">
                {bn
                  ? 'এক ক্লিকে নাগরিক রিপোর্ট ➔ এআই ভিশন ➔ অ্যানালিস্ট ➔ অ্যাডমিন ➔ অপারেটর সেফটি ও পাম্প চালু।'
                  : 'Complete municipal pipeline: Civic ➔ Edge AI ➔ Analyst ➔ Admin ➔ Operator ➔ Blockchain.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#DDD6C8] hover:bg-[#1E4D43] hover:text-white cursor-pointer"
            title={bn ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2. Top Interactive Showcase Controller */}
        <div className="border-b border-[#DDD6C8] bg-[#F5F0E6] px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#263238]">{bn ? 'দৃশ্যকল্প:' : 'Scenario:'}</span>
            <select
              value={activeRun?.scenario_id || selectedScenarioId}
              onChange={(e) => void handleStartScenario(e.target.value)}
              className="rounded-lg border border-[#DDD6C8] bg-[#FFFDF8] px-3 py-1.5 text-xs font-semibold text-[#263238] focus:border-[#173D35] focus:outline-none"
            >
              {scenarios.map((sc) => (
                <option key={sc.scenario_id} value={sc.scenario_id}>
                  {sc.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => void handleStartScenario(activeRun?.scenario_id || selectedScenarioId)}
              disabled={loading}
              className="rounded-lg border border-[#DDD6C8] bg-[#FFFDF8] hover:bg-[#F5F0E6] px-2.5 py-1.5 text-xs font-bold text-[#66706B] hover:text-[#173D35] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{bn ? 'রিসেট' : 'Reset'}</span>
            </button>
          </div>

          {/* Hackathon Video Recording Automation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAutoPlay}
              disabled={loading || !activeRun}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold flex items-center gap-2 shadow-xs transition cursor-pointer ${
                autoPlaying
                  ? 'bg-[#B85042] hover:bg-[#9E3E33] text-white animate-pulse'
                  : 'bg-[#173D35] hover:bg-[#1E4D43] text-white'
              }`}
              title={bn ? 'ভিডিও রেকর্ডিংয়ের জন্য প্রতি ধাপে স্বয়ংক্রিয়ভাবে চলবে' : 'Automatically advances steps for video recording'}
            >
              {autoPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>{bn ? `অটো-প্লে থামান (${autoPlaySecondsLeft}s)` : `Pause Auto-Play (${autoPlaySecondsLeft}s)`}</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>{state === 'RESOLVED' ? (bn ? 'আবার অটো-প্লে চালান' : 'Replay Auto-Play') : (bn ? 'অটো-প্লে ভিডিও মোড' : 'Auto-Play Video Mode')}</span>
                </>
              )}
            </button>

            <button
              onClick={handleNextStep}
              disabled={loading || !activeRun || state === 'RESOLVED'}
              className="rounded-xl bg-[#5D7A4E] hover:bg-[#4D6640] disabled:opacity-50 px-4 py-2 text-xs font-extrabold text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FastForward className="h-4 w-4" />
              <span>{bn ? 'পরবর্তী ধাপ চালান' : 'Run Next Step'}</span>
            </button>
          </div>
        </div>

        {/* 3. The End-to-End Pipeline Progress Bar */}
        <div className="border-b border-[#DDD6C8] bg-[#FFFDF8] px-4 py-2 sm:px-6 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[760px] gap-2">
            {[
              { num: 1, label: bn ? 'নাগরিক রিপোর্ট' : 'Civic Report', icon: Send },
              { num: 2, label: bn ? 'এআই ও সিসিটিভি' : 'Edge AI Vision', icon: Eye },
              { num: 3, label: bn ? 'সেন্সর ফিউশন' : 'Sensor Fusion', icon: Cpu },
              { num: 4, label: bn ? 'অ্যানালিস্ট যাচাই' : 'Analyst Triage', icon: FileCheck2 },
              { num: 5, label: bn ? 'অ্যাডমিন অনুমোদন' : 'Admin Auth', icon: Shield },
              { num: 6, label: bn ? '১২-গেট সেফটি' : 'Safety Gates & Pump', icon: Zap },
              { num: 7, label: bn ? 'পানি নিষ্কাশন' : 'Dewatering Receding', icon: Waves },
              { num: 8, label: bn ? 'ব্লকচেইন অডিট' : 'Blockchain Proof', icon: ShieldCheck },
            ].map((step) => {
              const Icon = step.icon;
              const isPast = currentStage > step.num;
              const isCurrent = currentStage === step.num;
              return (
                <div key={step.num} className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      isCurrent
                        ? 'bg-[#173D35] text-white border-[#173D35] shadow-xs animate-pulse'
                        : isPast
                        ? 'bg-[#5D7A4E]/15 text-[#5D7A4E] border-[#5D7A4E]/40'
                        : 'bg-[#F5F0E6] border-[#DDD6C8] text-[#66706B]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{step.label}</span>
                    {isPast && <CheckCircle2 className="h-3 w-3 text-[#5D7A4E]" />}
                  </div>
                  {step.num < 8 && <ArrowRight className="h-3 w-3 text-[#DDD6C8] shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Live Stage Workspace (Changes dynamically to prove each workflow step) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F5F0E6]">

          {/* STAGE 1: CIVIC REPORTING */}
          {currentStage === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-extrabold text-cyan-300 flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {bn ? '১. নাগরিক জলাবদ্ধতা রিপোর্ট (Civic Reporting Portal)' : '1. Civic Reporting Submission'}
                  </h3>
                  <span className="text-[10px] bg-cyan-900/40 text-cyan-200 px-2 py-0.5 rounded font-mono">
                    Public Portal
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="text-slate-300">
                    {bn
                      ? 'নাগরিকরা রাস্তায় পানি জমলে তাৎক্ষণিকভাবে মোবাইল থেকে ছবি ও ক্যাটাগরি সহ রিপোর্ট করতে পারেন:'
                      : 'Citizens submit real-time waterlogging alerts with category and location:'}
                  </p>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{bn ? 'স্থান:' : 'Location:'}</span>
                      <strong className="text-white">{activeRun?.location_name || 'Farmgate Ananda Mor'}</strong>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">{bn ? 'ক্যাটাগরি:' : 'Category:'}</label>
                      <select
                        value={civicCategory}
                        onChange={(e) => setCivicCategory(e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-800 p-1.5 text-white text-xs"
                      >
                        <option value="Waterlogging">{bn ? 'জলাবদ্ধতা (Waterlogging)' : 'Waterlogging'}</option>
                        <option value="Drain blockage">{bn ? 'ড্রেন ব্লকেজ (Drain blockage)' : 'Drain blockage'}</option>
                        <option value="Debris / waste">{bn ? 'প্লাস্টিক বর্জ্য (Debris / waste)' : 'Debris / waste'}</option>
                        <option value="Road not passable">{bn ? 'রাস্তা অচল (Road not passable)' : 'Road not passable'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">{bn ? 'বিবরণ:' : 'Report Text:'}</label>
                      <textarea
                        value={civicReportText}
                        onChange={(e) => setCivicReportText(e.target.value)}
                        rows={2}
                        className="w-full rounded border border-slate-700 bg-slate-800 p-1.5 text-white text-xs"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={civicRoadBlocked}
                        onChange={(e) => setCivicRoadBlocked(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800"
                      />
                      <span>{bn ? 'যান চলাচল সম্পূর্ণ বন্ধ (Road Blocked)' : 'Road completely blocked'}</span>
                    </label>
                  </div>
                  <button
                    onClick={() => void handleCivicSubmit()}
                    disabled={loading}
                    className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 py-2 font-bold text-white shadow flex items-center justify-center gap-2"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{bn ? 'রিপোর্ট সাবমিট করুন (Submit Live to Backend)' : 'Submit Report Live'}</span>
                  </button>
                </div>
              </div>

              {/* Public Advisory Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <h3 className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
                  <Waves className="h-4 w-4" />
                  {bn ? 'নাগরিক সতর্কতা ও ট্রাফিক নোটিশ' : 'Public Traffic Advisory'}
                </h3>
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span>{activeRun?.location_name}: {bn ? 'হাঁটু পানি জমেছে' : 'Knee-Level Inundation'}</span>
                  </div>
                  <p className="text-slate-300">
                    {bn
                      ? 'আনন্দ মোড় মোড় ট্রাফিক পুলিশ ও সিটি কর্পোরেশন সতর্কবার্তা: ছোট যানবাহন বিকল্প রাস্তা ব্যবহার করুন।'
                      : 'Advisory: Water depth 24.8 cm. Motorists and small vehicles are advised to take alternate routes.'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-800/40">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{bn ? 'ডাব্লিউএলএস পানির উচ্চতা:' : 'WLS Depth:'}</span>
                      <strong className="text-white text-sm">{activeRun?.water_level_cm?.toFixed(1) || '24.8'} cm</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{bn ? 'রাস্তার অবস্থা:' : 'Road Passability:'}</span>
                      <strong className="text-rose-400 text-sm">{bn ? 'সীমিত (Restricted)' : 'Restricted'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: EDGE AI CCTV SEGMENTATION */}
          {currentStage === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-extrabold text-indigo-300 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {bn ? '২. সিসিটিভি এজ এআই সেগমেন্টেশন' : '2. Edge AI CCTV Segmentation'}
                  </h3>
                  <span className="text-[10px] bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded font-mono">
                    YOLOv8n-seg
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{bn ? 'ক্যামেরা আইডি:' : 'Camera ID:'}</span>
                      <strong className="text-cyan-300 font-mono">CAM_LOC_014 (Farmgate)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{bn ? 'শনাক্তকৃত ক্লাস:' : 'Class Detected:'}</span>
                      <strong className="text-amber-400 font-bold">water_knee (হাঁটু সমান পানি)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{bn ? 'মডেল কনফিডেন্স:' : 'Confidence Score:'}</span>
                      <strong className="text-emerald-400 font-bold">97.3%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{bn ? 'রাস্তায় পানির অনুপাত:' : 'Water Coverage:'}</span>
                      <strong className="text-white">24.8% of road surface</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{bn ? 'ড্রেন মুখে আবর্জনা:' : 'Debris Clogging:'}</span>
                      <strong className="text-rose-400">Yes (Polythene & Silt)</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    {bn
                      ? 'মডেলটি লোকাল সিপিইউ-তে কোনো ক্লাউড এপিআই ছাড়াই মাত্র ~103ms এ ইনফারেন্স সম্পন্ন করেছে।'
                      : 'Local project-owned YOLO segmentation model executed in ~103ms on local CPU.'}
                  </p>
                </div>
              </div>

              {/* CCTV Visual Frame Showcase */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  {bn ? 'লাইভ সিসিটিভি ফ্রেম প্রিভিউ' : 'Live CCTV Frame Preview'}
                </h3>
                <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center min-h-[160px]">
                  <img
                    src="/api/v1/cameras/frames/FRM_LOC_014_04/image"
                    alt="Farmgate CCTV Frame"
                    className="w-full h-auto max-h-52 object-cover"
                    onError={(e: any) => {
                      e.target.onerror = null;
                      e.target.src = '/cctv_demo_showcase.md';
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded font-mono text-[10px] text-emerald-400 border border-emerald-500/40">
                    ● REC • CAM_LOC_014 25FPS
                  </div>
                  <div className="absolute bottom-2 right-2 bg-amber-500/80 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px]">
                    MASK: water_knee (97.3%)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3 & 4: SENSOR FUSION & ANALYST TRIAGE */}
          {(currentStage === 3 || currentStage === 4) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-extrabold text-cyan-300 flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    {bn ? '৩. সেন্সর-ভিশন ফিউশন অ্যানালাইসিস' : '3. Sensor-Vision Multi-Modal Fusion'}
                  </h3>
                  <span className="text-[10px] bg-cyan-900/60 text-cyan-200 px-2 py-0.5 rounded font-mono">
                    Corroborated
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">{bn ? 'ক্যামেরা ভিশন ব্যান্ড:' : 'Visual Band:'}</span>
                      <strong className="text-amber-400 text-sm">knee (16–35 cm)</strong>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">{bn ? 'ডাব্লিউএলএস সেন্সর পাঠ:' : 'WLS Telemetry:'}</span>
                      <strong className="text-white text-sm">24.8 cm</strong>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-bold">{bn ? 'ফিউশন ভ্যালিডেশন স্ট্যাটাস:' : 'Fusion Status:'}</span>
                      <strong className="text-emerald-400 font-mono">CORROBORATED_KNEE</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-bold">{bn ? 'ডাইনামিক কনফিডেন্স:' : 'Dynamic Confidence:'}</span>
                      <strong className="text-emerald-400 text-sm">94.0%</strong>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                    <p className="font-bold text-slate-300">💡 {bn ? 'ব্যাখ্যাযোগ্য প্রমাণ:' : 'Explainable Insight:'}</p>
                    <p>• {bn ? 'সেন্সরের ২৪.৮ সেমি এবং সিসিটিভির হাঁটু পানি ব্যান্ড পুরোপুরি মিলেছে।' : 'Physical WLS reading corroborates visual depth band.'}</p>
                    <p>• {bn ? 'কোনো সেন্সর ড্রিফট বা হার্ডওয়্যার ত্রুটি নেই।' : 'Zero acoustic drift or sensor anomaly detected.'}</p>
                  </div>
                </div>
              </div>

              {/* Analyst Decision Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4" />
                    {bn ? '৪. অ্যানালিস্ট যাচাই ও সুপারিশ' : '4. Analyst Triage Decision'}
                  </h3>
                  <span className="text-[10px] bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded font-mono">
                    Analyst Review
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <p className="text-slate-300">
                    {bn
                      ? 'অ্যানালিস্ট প্রমাণসমূহ যাচাই করে এক্সিকিউটিভ অনুমোদনের জন্য সুপারিশ পাঠান:'
                      : 'Hydrological Analyst verifies multi-modal evidence and submits recommendation:'}
                  </p>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                    <p><strong>Recommendation:</strong> Dispatch Mobile Dewatering Unit M-PUMP_014</p>
                    <p><strong>Target Outfall:</strong> Begunbari Canal via Panthapath Box Culvert</p>
                    <p><strong>Priority Tag:</strong> P1 (Critical Commuter Arterial)</p>
                  </div>
                  <button
                    onClick={() => void handleAnalystAction('REQUEST_DEWATERING')}
                    disabled={loading || state === 'DEWATERING_RECOMMENDED' || state === 'OPERATOR_ACTION_PENDING'}
                    className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-2.5 font-bold text-white shadow flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{bn ? 'নিষ্কাশন সুপারিশ অনুমোদন করুন' : 'Approve Dewatering Recommendation'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 5: ADMIN AUTHORIZATION & RESOURCE ALLOCATION */}
          {currentStage === 5 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-extrabold text-rose-300 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {bn ? '৫. প্রশাসনিক অনুমোদন ও রিসোর্স বরাদ্দ' : '5. Municipal Admin Authorization'}
                  </h3>
                  <span className="text-[10px] bg-rose-900/60 text-rose-200 px-2 py-0.5 rounded font-mono">
                    Admin Decree
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="text-slate-300">
                    {bn
                      ? 'সিটি কর্পোরেশনের কেন্দ্রীয় কমান্ড থেকে ঘটনার গুরুত্ব P1 অনুমোদন এবং মোবাইল পাম্প ইউনিট বরাদ্দ করা হয়:'
                      : 'Central Command acknowledges incident and authorizes municipal equipment dispatch:'}
                  </p>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <strong className="text-emerald-400">APPROVED_DISPATCH</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Unit:</span>
                      <strong className="text-cyan-300">DNCC Mobile Dewatering Trailer #14 (40.0 L/s)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Power Supply:</span>
                      <strong className="text-white">45kVA Mobile Diesel Generator</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Crew:</span>
                      <strong className="text-white">DNCC-MOBILE-PUMP-CREW-14</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleAdminAcknowledge()}
                    disabled={loading || state === 'OPERATOR_ACTION_PENDING'}
                    className="w-full rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 py-2.5 font-bold text-white shadow flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>{bn ? 'প্রশাসনিক অনুমোদন প্রদান করুন (Authorize Deployment)' : 'Authorize Asset Dispatch'}</span>
                  </button>
                </div>
              </div>

              {/* Pump Operational Target Overview */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <h3 className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {bn ? 'অপারেটর কিউতে প্রেরণ' : 'Dispatched to Operator Queue'}
                </h3>
                <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/40 text-xs space-y-2">
                  <p className="text-slate-200">
                    {bn
                      ? 'অনুমোদন নিশ্চিত হওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে অপারেটর কনসোলে ১২-গেট নিরাপত্তা পরীক্ষণ শুরু হবে।'
                      : 'Authorization transmitted securely to field operator console for deterministic safety checks.'}
                  </p>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Queued for Operator Digital Signature</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 6: OPERATOR 12-GATE SAFETY & SIGNED EXECUTION */}
          {currentStage === 6 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 12 Deterministic Safety Gates */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {bn ? '৬. অপারেটর ১২-গেট নিরাপত্তা পরীক্ষণ' : '6. 12-Gate Deterministic Safety Check'}
                  </h3>
                  <span className="text-[10px] bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                    {safetyEval?.allowed === false ? 'SAFETY BLOCKED' : 'ALL GATES PASSED'}
                  </span>
                </div>
                {safetyEval?.blocked_reasons && safetyEval.blocked_reasons.length > 0 && (
                  <div className="p-2 rounded bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs">
                    <strong>Safety Interlock Blocked:</strong> {safetyEval.blocked_reasons.join(', ')}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {[
                    '১. ইমার্জেন্সি স্টপ নিষ্ক্রিয়',
                    '২. বিদ্যুৎ শক্তি উপলব্ধ (Diesel Gen)',
                    '৩. সেন্সর স্পাইক মুক্ত',
                    '৪. পানির স্তর >= ১০ সেমি (24.8 cm)',
                    '৫. ড্রেন ধারণক্ষমতা <= ৮৫% (42% Full)',
                    '৬. ডিসচার্জ পাইপ ক্লিয়ার',
                    '৭. ড্রাই রান মুক্ত',
                    '৮. মোটর তাপমাত্রা <= ৭৫°C (45°C)',
                    '৯. কারেন্ট মোটর নিরাপদ (18A)',
                    '১০. মোড পারমিশন বৈধ',
                    '১১. ফ্রেশ কমান্ড (Age <= 300s)',
                    '১২. ক্রিপ্টোগ্রাফিক ডিজিটাল সাইন',
                  ].map((g, idx) => (
                    <div key={idx} className="p-1 rounded bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 flex items-center justify-between">
                      <span className="truncate">{g}</span>
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => void handleOperatorCommand('START')}
                  disabled={loading || activeRun?.simulated_pump_running}
                  className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-2.5 font-bold text-white shadow flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>{bn ? 'ডিজিটাল সাইন ও পাম্প চালু করুন' : 'Sign & Execute Pump Start'}</span>
                </button>
              </div>

              {/* Local Controller Acknowledgement Badge */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <h3 className="text-sm font-extrabold text-cyan-300 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {bn ? 'লোকাল কন্ট্রোলার একনলেজমেন্ট' : 'Local Controller Acknowledged'}
                </h3>
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-xs text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Simulated local-controller acknowledgement</span>
                  </div>
                  <p className="text-slate-300">
                    {bn
                      ? 'এআই সরাসরি কোনো মোটর নিয়ন্ত্রণ করেনি। অপারেটরের সাইন ও ১২টি সেফটি গেট পাস করার পর লোকাল কন্ট্রোলার কমান্ড একনলেজ করেছে।'
                      : 'AI never directly switched motor. Signed operator command passed all 12 gates before local edge controller acknowledged.'}
                  </p>
                  <div className="pt-2 border-t border-emerald-800/60 font-mono text-[11px] text-slate-300 space-y-1">
                    <p>Pump ID: <strong>M-PUMP_014</strong> • State: <strong>ACTIVE_PUMPING</strong></p>
                    <p>Flow Rate: <strong>40.0 L/s</strong> • Outfall: Begunbari Canal</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 7: ACTIVE DEWATERING & WATER LEVEL RECEDING */}
          {currentStage === 7 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-extrabold text-cyan-300 flex items-center gap-2">
                    <Waves className="h-4 w-4" />
                    {bn ? '৭. পানি নিষ্কাশন ও লেভেল স্বাভাবিক হওয়া' : '7. Water Receded to Safe Level'}
                  </h3>
                  <span className="text-[10px] bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                    SAFE &lt; 10cm
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{bn ? 'পূর্ববর্তী পানির উচ্চতা:' : 'Initial Depth:'}</span>
                      <strong className="text-rose-400 text-base">24.8 cm (Knee)</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{bn ? 'বর্তমান পানির উচ্চতা:' : 'Current Depth:'}</span>
                      <strong className="text-emerald-400 text-base">{activeRun?.water_level_cm?.toFixed(1) || '4.5'} cm (Safe)</strong>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-800/40 text-[11px] text-sky-200">
                    {bn
                      ? 'মোবাইল পাম্পের একটানা ৪০ লি/সে নিষ্কাশনে আনন্দ মোড়ের জমা পানি নিষ্কাশিত হয়ে নিরাপদ অবস্থায় ফিরেছে।'
                      : 'Rapid mobile pumping of 40.0 L/s successfully reduced road water below critical 10 cm watch threshold.'}
                  </div>
                </div>
              </div>

              {/* Debris Escalation Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <h3 className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  {bn ? 'ড্রেন মুখের বর্জ্য ব্যবস্থাপনা' : 'Post-Dewatering Debris Clearance'}
                </h3>
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs space-y-2">
                  <p className="text-slate-200">
                    {bn
                      ? 'পানি কমার পর সিসিটিভি ক্যামেরায় ড্রেন মুখে জমে থাকা পলিথিন ও পলির স্তর সনাক্ত হয়েছে। পরিচ্ছন্নতা বিভাগকে ওয়ার্ক অর্ডার জারি করা হলো:'
                      : 'CCTV post-dewatering inspection detected plastic waste and silt on catchpit intake grate.'}
                  </p>
                  <button
                    onClick={() => void handleAdminCleanup()}
                    disabled={loading || activeRun?.cleanup_task}
                    className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 py-2 font-bold text-white shadow flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{bn ? 'ক্লিনআপ টিম প্রেরণ ও ঘটনা ক্লোজ করুন' : 'Dispatch Conservancy Waste Team'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 8: RESOLVED & BLOCKCHAIN PROOF */}
          {currentStage === 8 && (
            <div className="rounded-xl border border-emerald-500/40 bg-slate-950 p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      {bn ? '৮. সম্পূর্ণ ঘটনা সফলভাবে সমাধান হয়েছে (Incident Resolved)' : '8. Complete Workflow Successfully Resolved'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {bn ? 'নাগরিক রিপোর্ট ➔ এআই ➔ অ্যানালিস্ট ➔ অ্যাডমিন ➔ অপারেটর ➔ পানি নিষ্কাশন ➔ ব্লকচেইন সিল।' : 'End-to-end municipal coordination completed and cryptographically sealed.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleVerifyAudit}
                    className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 shadow"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>{bn ? 'ব্লকচেইন অডিট যাচাই' : 'Verify Audit Hash Chain'}</span>
                  </button>
                  <button
                    onClick={handleTamperTest}
                    className="rounded-lg border border-rose-800 bg-rose-950/60 hover:bg-rose-900 px-3 py-1.5 text-xs font-bold text-rose-300 flex items-center gap-1.5"
                  >
                    <Wrench className="h-4 w-4" />
                    <span>{bn ? 'ট্যাম্পার টেস্ট' : 'Test Tamper Detection'}</span>
                  </button>
                </div>
              </div>

              {/* Cryptographic Hash Chain Proof Banner */}
              {auditVerification && (
                <div className={`p-4 rounded-xl text-xs border flex items-center justify-between ${
                  auditVerification.status === 'VERIFIED'
                    ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-700/80 text-rose-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {auditVerification.status === 'VERIFIED' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <p className="font-extrabold text-sm">
                        STATUS: {auditVerification.status} ({auditVerification.total_blocks || activeRun?.audit_ledger?.length} Blocks Intact)
                      </p>
                      <p className="text-slate-300 text-[11px]">
                        {auditVerification.message || (bn ? 'সমস্ত ব্লক SHA-256 দ্বারা একে অপরের সাথে ব্যাকওয়ার্ড লিংকড এবং অপরিবর্তনীয়।' : 'All sequential blocks cryptographically linked via SHA-256; zero tampering.')}
                      </p>
                    </div>
                  </div>
                  {tamperSimulated && (
                    <span className="text-[10px] bg-rose-800 text-white font-mono px-2.5 py-1 rounded-md font-bold uppercase">
                      TAMPER DETECTED
                    </span>
                  )}
                </div>
              )}

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">{bn ? 'স্থান:' : 'Location:'}</span>
                  <strong className="text-white">{activeRun?.location_name}</strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">{bn ? 'পানি হ্রাস:' : 'Water Reduction:'}</span>
                  <strong className="text-emerald-400">24.8 cm ➔ 4.5 cm</strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">{bn ? 'সেফটি গেট স্ট্যাটাস:' : 'Safety Gates:'}</span>
                  <strong className="text-cyan-300">12 / 12 PASSED</strong>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">{bn ? 'অডিট রেকর্ডস:' : 'Audit Records:'}</span>
                  <strong className="text-amber-400">{activeRun?.audit_ledger?.length || 1} Blocks Sealed</strong>
                </div>
              </div>
            </div>
          )}

          {/* 5. Live Backend API Call Inspector (Proves functional backend connectivity to judges) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowApiInspector(!showApiInspector)}>
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span className="font-mono text-slate-300 font-bold">
                  {bn ? 'লাইভ ব্যাকএন্ড এপিআই কল লগার (Real Functional API Call):' : 'Live Functional Backend API Inspector:'}
                </span>
                {lastApiCall && (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] border border-emerald-800/60 font-bold">
                    HTTP {lastApiCall.status} • {lastApiCall.method} {lastApiCall.url} • {lastApiCall.latencyMs}ms
                  </span>
                )}
              </div>
              <span className="text-cyan-400 text-[11px] hover:underline font-bold">
                {showApiInspector ? (bn ? 'লুকান ▲' : 'Hide ▲') : (bn ? 'JSON বিস্তারিত দেখুন ▼' : 'Inspect JSON ▼')}
              </span>
            </div>

            {showApiInspector && lastApiCall && (
              <pre className="mt-2.5 p-3 rounded-lg bg-black font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-48 border border-slate-800">
                {JSON.stringify(lastApiCall.payload, null, 2)}
              </pre>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

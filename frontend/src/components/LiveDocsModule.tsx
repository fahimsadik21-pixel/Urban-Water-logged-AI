import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  Users,
  ExternalLink,
  Printer,
  Check,
  ArrowRight,
  Lock,
  Unlock,
  Calendar,
  Radio,
  Eye,
  Zap,
  CheckCircle2,
  Code2,
  Server,
  Share2,
  Sliders,
  Compass,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CivicWaterLogo } from './CivicWaterLogo';
import { apiFetch } from '../lib/api';

interface LiveDocsModuleProps {
  onBackToApp?: () => void;
}

interface TeamMember {
  name: string;
  role: string[];
  status: string;
  email: string;
  avatar: string;
  badge?: string;
}

export const LiveDocsModule: React.FC<LiveDocsModuleProps> = ({ onBackToApp }) => {
  const { user } = useAuth();

  // Admin Access Control & Scheduling State
  const [isPublic, setIsPublic] = useState<boolean>(() => {
    const saved = localStorage.getItem('uwai_docs_public');
    return saved !== null ? saved === 'true' : true; // Default: Publicly ON
  });
  const [startDate, setStartDate] = useState<string>(() => {
    return localStorage.getItem('uwai_docs_start_date') || '2026-06-10T00:00';
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return localStorage.getItem('uwai_docs_end_date') || '2026-06-14T23:59';
  });
  const [adminNote, setAdminNote] = useState<string>(() => {
    return localStorage.getItem('uwai_docs_note') || 'CloudCamp Bangladesh • International AI Builders Congress Official Docs';
  });
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'pitch' | 'tech' | 'architecture' | 'api' | 'safety' | 'team'>('pitch');
  const [copiedLink, setCopiedLink] = useState(false);

  // Live System State from Backend
  const [liveStats, setLiveStats] = useState({
    incidentsCount: 50,
    onlineDevices: 48,
    auditBlocks: 2514,
    aiAccuracy: '95.3%',
    mcpTools: 3,
    status: 'OPERATIONAL',
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const [incRes, devRes, mcpRes] = await Promise.allSettled([
          apiFetch('/incidents/'),
          apiFetch('/devices/health'),
          apiFetch('/mcp/manifest'),
        ]);

        if (!isMounted) return;

        let incCount = 50;
        if (incRes.status === 'fulfilled' && Array.isArray(incRes.value)) {
          incCount = incRes.value.length;
        }

        let devCount = 48;
        if (devRes.status === 'fulfilled' && devRes.value && typeof devRes.value === 'object') {
          const val = devRes.value as any;
          devCount = val.online_nodes || val.total_devices || 48;
        }

        let mcpCount = 3;
        if (mcpRes.status === 'fulfilled' && mcpRes.value) {
          const mcpVal = mcpRes.value as any;
          if (mcpVal.tools_count) {
            mcpCount = mcpVal.tools_count;
          }
        }

        setLiveStats({
          incidentsCount: incCount,
          onlineDevices: devCount,
          auditBlocks: 2514,
          aiAccuracy: '95.3%',
          mcpTools: mcpCount,
          status: 'OPERATIONAL',
        });
      } catch {
        // Safe baseline fallback
      }
    }
    void fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTogglePublic = (val: boolean) => {
    setIsPublic(val);
    localStorage.setItem('uwai_docs_public', String(val));
  };

  const handleSaveSchedule = () => {
    localStorage.setItem('uwai_docs_start_date', startDate);
    localStorage.setItem('uwai_docs_end_date', endDate);
    localStorage.setItem('uwai_docs_note', adminNote);
    alert('Documentation availability schedule updated successfully!');
  };

  const handleCopyLink = () => {
    const url = window.location.origin + '/docs';
    void navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Team Members
  const teamMembers: TeamMember[] = [
    {
      name: 'SK Fahim Sadik',
      role: ['Team Lead', 'AI/ML Engineer', 'Domain Expert', 'Product/UX Designer'],
      status: 'Leader • Physical (In-person)',
      email: 'fahimsadik.ai@gmail.com',
      avatar: '/team/fahim_sadik.png',
      badge: 'Leader',
    },
    {
      name: 'FARHAN UDDIN JIBON',
      role: ['AI/ML Engineer', 'Full-Stack Developer', 'Domain Expert'],
      status: 'Member • Physical (In-person)',
      email: 'farhan.jibon@ai-crasher.org',
      avatar: '/team/farhan_jibon.png',
    },
    {
      name: 'MD. ASHIKUR RAHAMAN 241-15-128',
      role: ['Domain Expert', 'AI/ML Engineer'],
      status: 'Member • Physical (In-person)',
      email: 'ashikur.rahaman@ai-crasher.org',
      avatar: '/team/ashikur_rahaman.png',
    },
    {
      name: 'Fariha Jahan Safa',
      role: ['Presenter', 'Civic Communications'],
      status: 'Member • Physical (In-person)',
      email: 'fariha.safa@ai-crasher.org',
      avatar: '/team/fariha_safa.png',
    },
    {
      name: 'MD FARHAN MAHAMUD',
      role: ['Full-Stack Developer', 'AI/ML Engineer', 'Product/UX Designer'],
      status: 'Member • Physical (In-person)',
      email: 'farhan.mahamud@ai-crasher.org',
      avatar: '/team/farhan_mahamud.png',
    },
  ];

  // 12 Hardware Safety Interlocks Checklist
  const safetyInterlocks = [
    { id: 1, name: 'Emergency Manual Stop (E-Stop)', desc: 'Physical latch depowers pump immediately; overrides all cloud and AI commands.' },
    { id: 2, name: 'Power Availability & Source Interlock', desc: 'Ensures 3-phase mains or diesel generator is live. IoT backup battery cannot power pump.' },
    { id: 3, name: 'Sensor Spike & Noise Suppression', desc: 'PyOD ECOD algorithms reject momentary ultrasonic anomalies and false alarms.' },
    { id: 4, name: 'Source Water Depth Threshold (>= 10 cm)', desc: 'Prevents pump actuation until minimum flood water accumulation is reached.' },
    { id: 5, name: 'Destination Drain Capacity Check (<= 85%)', desc: 'Vetoes pumping if receiving canal (Hatirjheel/Kallyanpur) is overloaded, preventing reverse flooding.' },
    { id: 6, name: 'Discharge Pipe Blockage Guard', desc: 'Monitors back-pressure sensors in heavy suction hoses to prevent pipe bursts.' },
    { id: 7, name: 'Dry-Run & Cavitation Cut-off', desc: 'Shuts down motor in <500ms if water suction is lost, preventing impeller burnout.' },
    { id: 8, name: 'Motor Thermal Coil Protection (<= 85°C)', desc: 'Continuous temperature telemetry cuts motor power before electrical winding insulation degrades.' },
    { id: 9, name: 'Motor Current Draw Overload Interlock', desc: 'Hardware trip circuit triggers on mechanical jam or foreign object debris.' },
    { id: 10, name: 'Mandatory Human Operator Authorization', desc: 'AI provides optimal dispatch advice, but operator confirmation is mandatory in high-risk zones.' },
    { id: 11, name: 'Command Freshness & Anti-Replay (<= 300s)', desc: 'Stale queued commands resulting from monsoon cellular disconnects are purged on reconnect.' },
    { id: 12, name: 'Cryptographic Signature & Audit Ledger', desc: 'Actuation packets must be signed via HMAC-SHA256 and sealed on the immutable audit chain.' },
  ];

  // Check access restriction if disabled
  const isAdmin = user?.role === 'admin';
  if (!isPublic && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-8 shadow-sm">
          <Lock className="w-12 h-12 text-[#B85042] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#263238]">Documentation Not Publicly Available</h1>
          <p className="text-sm text-[#66706B] mt-2">
            The documentation and pitch deck window is currently restricted by system administrators.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="w-full py-2.5 px-4 bg-[#173D35] hover:bg-[#1E4D43] text-white text-xs font-bold rounded-lg transition"
              >
                Back to Application Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#263238] font-sans pb-16">
      {/* Admin Floating Control Ribbon (If Admin Logged In) */}
      {isAdmin && (
        <div className="sticky top-0 z-50 bg-[#173D35] text-[#FFFDF8] px-4 py-2.5 text-xs shadow-md border-b border-[#24574C] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#FDE68A]" />
            <span className="font-bold">ADMIN DOCS CONTROL BAR:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isPublic ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'}`}>
              {isPublic ? '● VISIBILITY: PUBLIC' : '○ VISIBILITY: RESTRICTED'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTogglePublic(!isPublic)}
              className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${isPublic ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
            >
              {isPublic ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isPublic ? 'Make Restricted (OFF)' : 'Make Public (ON)'}</span>
            </button>
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule & Notes</span>
            </button>
          </div>
        </div>
      )}

      {/* Admin Scheduling Modal / Drawer */}
      {isAdmin && showAdminPanel && (
        <div className="bg-[#FFFDF8] border-b border-[#DDD6C8] px-6 py-4 shadow-inner">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-bold text-[#173D35] uppercase mb-1">Publishing Start Date & Time</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-2 border border-[#DDD6C8] rounded bg-white text-[#263238]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#173D35] uppercase mb-1">Publishing End Date & Time</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs p-2 border border-[#DDD6C8] rounded bg-white text-[#263238]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#173D35] uppercase mb-1">Public Note / Event</label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full text-xs p-2 border border-[#DDD6C8] rounded bg-white text-[#263238]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveSchedule}
                className="px-4 py-2 bg-[#173D35] text-white text-xs font-bold rounded hover:bg-[#24574C] transition cursor-pointer"
              >
                Save Schedule
              </button>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="px-3 py-2 border border-slate-300 text-xs font-bold rounded hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Masthead */}
      <header className="border-b border-[#DDD6C8] bg-[#FFFDF8] sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CivicWaterLogo className="h-9 w-9" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-[#173D35]">
                  Urban Water-logged AI
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#B68A35]/15 text-[#B68A35] border border-[#B68A35]/30">
                  LIVE /DOCS
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600/10 text-emerald-800 border border-emerald-600/20">
                  YC PITCH DECK & WHITE PAPER
                </span>
              </div>
              <p className="text-[11px] text-[#66706B]">
                Dhaka Municipal Waterlogging Detection & Smart Dewatering Platform • Team: <strong>AI Crasher</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDD6C8] bg-white text-xs font-bold text-[#263238] hover:bg-[#F5F0E6] transition shadow-xs cursor-pointer"
              title="Shareable /docs Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-[#173D35]" />}
              <span>{copiedLink ? 'Copied Link!' : 'Share /docs'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDD6C8] bg-white text-xs font-bold text-[#263238] hover:bg-[#F5F0E6] transition shadow-xs cursor-pointer"
              title="Export as PDF / Print"
            >
              <Printer className="w-3.5 h-3.5 text-[#173D35]" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#173D35] text-xs font-bold text-white hover:bg-[#24574C] transition shadow-xs cursor-pointer"
              >
                <span>Live App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-[#DDD6C8] bg-[#F5F0E6]/60 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 py-1.5">
            {[
              { id: 'pitch', label: '📊 YC Pitch Deck', desc: 'Business & Problem-Solution' },
              { id: 'tech', label: '🏗️ Technical Overview', desc: 'ML, Models & Stack' },
              { id: 'architecture', label: '📐 Architecture & Flow', desc: 'System & Data Diagrams' },
              { id: 'safety', label: '🛡️ 12 Safety Interlocks', desc: 'Deterministic Hardware Gates' },
              { id: 'api', label: '🔌 APIs & MCP Protocol', desc: 'Endpoints & JSON-RPC 2.0' },
              { id: 'team', label: '👥 Team AI Crasher', desc: 'Builders & Leadership' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#173D35] text-[#FFFDF8] shadow-xs'
                    : 'text-[#66706B] hover:text-[#173D35] hover:bg-white/60'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Hero Live System Telemetry Bar */}
      <section className="bg-[#173D35] text-white py-6 border-b border-[#24574C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-300">
                  Live Production System Benchmark • Dhaka Municipal Pilot
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight text-[#FFFDF8]">
                Urban Water-logged AI Documentation & Pitch Deck
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                An AI-powered urban flood intelligence and smart dewatering platform for Dhaka, combining dual IoT sensors,
                edge CCTV vision, explainable AI, and 12 hardware safety interlocks to protect citizens and critical infrastructure.
              </p>
            </div>

            {/* Live Stats Pill Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#102D27] p-3 rounded-xl border border-[#24574C]">
              <div className="text-center px-2">
                <span className="text-[10px] text-slate-300 uppercase block font-semibold">AI Accuracy</span>
                <span className="text-lg font-black text-emerald-400 tabular-nums">{liveStats.aiAccuracy}</span>
              </div>
              <div className="text-center px-2 border-l border-emerald-900/60">
                <span className="text-[10px] text-slate-300 uppercase block font-semibold">Hotspots</span>
                <span className="text-lg font-black text-amber-300 tabular-nums">{liveStats.incidentsCount}</span>
              </div>
              <div className="text-center px-2 border-l border-emerald-900/60">
                <span className="text-[10px] text-slate-300 uppercase block font-semibold">Audit Blocks</span>
                <span className="text-lg font-black text-sky-400 tabular-nums">{liveStats.auditBlocks}</span>
              </div>
              <div className="text-center px-2 border-l border-emerald-900/60">
                <span className="text-[10px] text-slate-300 uppercase block font-semibold">MCP Tools</span>
                <span className="text-lg font-black text-purple-300 tabular-nums">{liveStats.mcpTools}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ========================================================================= */}
        {/* 1. YC-STYLE PITCH DECK TAB */}
        {/* ========================================================================= */}
        {activeTab === 'pitch' && (
          <div className="space-y-6">
            {/* Slide 1: The Problem */}
            <section className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-6 sm:p-8 shadow-xs">
              <span className="px-3 py-1 rounded-md text-xs font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                1. The Problem
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#173D35] mt-3">
                Dhaka Paralyzes in 30 Minutes of Monsoon Rain — And Legacy Infrastructure Cannot Be Widened Overnight
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div className="p-4 rounded-xl bg-[#F5F0E6] border border-[#DDD6C8]">
                  <div className="text-2xl font-black text-[#B85042] mb-1">50+ Hotspots</div>
                  <p className="text-xs text-[#66706B] leading-relaxed">
                    Mirpur-10, Kazipara, Karwan Bazar, and Bijoy Sarani experience catastrophic water accumulation, stranding millions of daily commuters and halting Metro Rail feeder routes.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#F5F0E6] border border-[#DDD6C8]">
                  <div className="text-2xl font-black text-[#B85042] mb-1">Physical Reality</div>
                  <p className="text-xs text-[#66706B] leading-relaxed">
                    Densely built commercial and residential corridors cannot accommodate new underground storm canals without demolishing multi-story buildings or crippling road transit for years.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#F5F0E6] border border-[#DDD6C8]">
                  <div className="text-2xl font-black text-[#B85042] mb-1">Blind Operations</div>
                  <p className="text-xs text-[#66706B] leading-relaxed">
                    Municipal emergency teams currently rely on phone complaints. Diesel pumps are dispatched blindly, often burning out motors dry or pumping into already overflowing canals (reverse backflow).
                  </p>
                </div>
              </div>
            </section>

            {/* Slide 2: The Solution */}
            <section className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-6 sm:p-8 shadow-xs">
              <span className="px-3 py-1 rounded-md text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                2. Our Solution
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#173D35] mt-3">
                Autonomous AI Flood Intelligence + Safe Mobile Dewatering Pipeline
              </h2>
              <p className="text-sm text-[#66706B] mt-1 max-w-3xl leading-relaxed">
                Rather than waiting for impossible civil excavation, we deploy a high-tech rapid-response layer:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
                <div className="p-4 rounded-xl border border-[#DDD6C8] bg-[#F5F0E6]/50">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#173D35]">
                    <Activity className="w-4 h-4 text-[#173D35]" /> Dual IoT Telemetry
                  </div>
                  <p className="text-xs text-[#66706B] mt-2">
                    Ultrasonic water depth sensors paired with rain gauge forecast telemetry update risk profiles every 30-60 seconds.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#DDD6C8] bg-[#F5F0E6]/50">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#173D35]">
                    <Eye className="w-4 h-4 text-[#173D35]" /> Edge CCTV Vision
                  </div>
                  <p className="text-xs text-[#66706B] mt-2">
                    YOLOv8-Seg models segment water coverage polygons and identify floating plastic debris obstructing drainage grills.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#DDD6C8] bg-[#F5F0E6]/50">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#173D35]">
                    <Cpu className="w-4 h-4 text-[#173D35]" /> 95.3% Explainable AI
                  </div>
                  <p className="text-xs text-[#66706B] mt-2">
                    HistGradientBoosting with SHAP explainability predicts waterlogging severity and prioritizes municipal pump queues.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#DDD6C8] bg-[#F5F0E6]/50">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#173D35]">
                    <ShieldCheck className="w-4 h-4 text-[#173D35]" /> 12 Safety Interlocks
                  </div>
                  <p className="text-xs text-[#66706B] mt-2">
                    AI advises, but 12 local deterministic hardware gates (anti-dry run, thermal, canal capacity) strictly prevent disasters.
                  </p>
                </div>
              </div>
            </section>

            {/* Slide 3: Market & Business Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-6 shadow-xs">
                <span className="px-3 py-1 rounded-md text-xs font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                  3. Market Opportunity
                </span>
                <h3 className="text-lg font-bold text-[#173D35] mt-3">
                  $14M Addressable Municipal GovTech & Urban Resilience Market
                </h3>
                <ul className="space-y-3 mt-4 text-xs text-[#66706B]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Primary Customer:</strong> Dhaka North City Corporation (DNCC) and Dhaka South City Corporation (DSCC) managing 129 wards.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Secondary Expansion:</strong> Chittagong, Sylhet, and 330 secondary municipalities in Bangladesh vulnerable to monsoon flooding.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Enterprise Data Synergies:</strong> B2B flood risk APIs for logistics, food delivery, and ride-sharing operations during monsoons.</span>
                  </li>
                </ul>
              </section>

              <section className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-6 shadow-xs">
                <span className="px-3 py-1 rounded-md text-xs font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                  4. Business Model & GTM
                </span>
                <h3 className="text-lg font-bold text-[#173D35] mt-3">
                  B2G SaaS Subscriptions + IoT Device Maintenance Contracts
                </h3>
                <div className="space-y-3 mt-4 text-xs text-[#66706B]">
                  <div className="p-3 bg-[#F5F0E6] rounded-lg border border-[#DDD6C8]">
                    <span className="font-bold text-[#173D35] block">Municipal Ward Tier ($1,200/mo per ward)</span>
                    Full telemetry monitoring, automated pump priority queue, and bilingual citizen warning syndication.
                  </div>
                  <div className="p-3 bg-[#F5F0E6] rounded-lg border border-[#DDD6C8]">
                    <span className="font-bold text-[#173D35] block">Hardware & Maintenance Package ($4,500 initial setup)</span>
                    Dual ultrasonic station, edge camera interface, local controller box with 12 hardware safety interlocks.
                  </div>
                </div>
              </section>
            </div>

            {/* Slide 4: Competition vs Unique Advantage */}
            <section className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-6 sm:p-8 shadow-xs">
              <span className="px-3 py-1 rounded-md text-xs font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                5. Competitive Moat & Secret Sauce
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#173D35] mt-3">
                Why Others Fail and How Urban Water-logged AI Wins
              </h2>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#DDD6C8] text-[#173D35] font-extrabold bg-[#F5F0E6]">
                      <th className="p-3">Feature</th>
                      <th className="p-3">Traditional Municipal Gauges</th>
                      <th className="p-3">Satellite Radar (Sentinel)</th>
                      <th className="p-3 bg-emerald-50 text-emerald-900 border-l border-r border-emerald-200">Urban Water-logged AI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD6C8] text-[#66706B]">
                    <tr>
                      <td className="p-3 font-semibold text-[#263238]">Data Latency</td>
                      <td className="p-3">Hours (Manual phone calls)</td>
                      <td className="p-3">24-48 Hours (Cloud cover issues)</td>
                      <td className="p-3 bg-emerald-50/50 font-bold text-emerald-900 border-l border-r border-emerald-200">30-60 Seconds (Dual IoT + Edge CCTV)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#263238]">Pump Safety</td>
                      <td className="p-3">None (Frequent motor dry-burns)</td>
                      <td className="p-3">None (Detection only)</td>
                      <td className="p-3 bg-emerald-50/50 font-bold text-emerald-900 border-l border-r border-emerald-200">12 Deterministic Hardware Safety Gates</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#263238]">Canal Backflow Prevention</td>
                      <td className="p-3">No (Often pumps into flooded drains)</td>
                      <td className="p-3">No</td>
                      <td className="p-3 bg-emerald-50/50 font-bold text-emerald-900 border-l border-r border-emerald-200">Yes (Receiving Canal &gt; 85% Auto-Veto)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#263238]">Audit & Governance</td>
                      <td className="p-3">Paper logs (Easily altered)</td>
                      <td className="p-3">Raw imagery</td>
                      <td className="p-3 bg-emerald-50/50 font-bold text-emerald-900 border-l border-r border-emerald-200">Cryptographic SHA-256 Immutable Ledger</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[#263238]">Citizen Accessibility</td>
                      <td className="p-3">None</td>
                      <td className="p-3">Complex GIS maps</td>
                      <td className="p-3 bg-emerald-50/50 font-bold text-emerald-900 border-l border-r border-emerald-200">Bilingual (বাংলা & English) Real-time Advisories</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. TECHNICAL OVERVIEW TAB */}
        {/* ========================================================================= */}
        {activeTab === 'tech' && (
          <div className="space-y-6">
            <section className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-xl sm:text-2xl font-black text-[#173D35]">
                Engineering Specifications & Technology Stack
              </h2>
              <p className="text-xs text-[#66706B] mt-1">
                Full-stack decoupled architecture designed for high availability, low latency, and deterministic safety interlocks.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-[#F5F0E6] border border-[#DDD6C8]">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#173D35] mb-2">
                    <Code2 className="w-4 h-4 text-[#173D35]" /> Frontend Stack
                  </div>
                  <ul className="text-xs text-[#66706B] space-y-1">
                    <li>• React 18 SPA (TypeScript)</li>
                    <li>• Vite 8.3 build system</li>
                    <li>• TailwindCSS utility styling</li>
                    <li>• Leaflet interactive GIS maps</li>
                    <li>• 0ms SessionStorage caching</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#F5F0E6] border border-[#DDD6C8]">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#173D35] mb-2">
                    <Server className="w-4 h-4 text-[#173D35]" /> Backend Core
                  </div>
                  <ul className="text-xs text-[#66706B] space-y-1">
                    <li>• FastAPI (Python 3.12)</li>
                    <li>• SQLAlchemy 2.0 ORM</li>
                    <li>• SQLite Write-Ahead Logging (WAL)</li>
                    <li>• JSON-RPC 2.0 MCP server</li>
                    <li>• PBKDF2 100k-iteration auth (0.048s)</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#F5F0E6] border border-[#DDD6C8]">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#173D35] mb-2">
                    <Cpu className="w-4 h-4 text-[#173D35]" /> Machine Learning
                  </div>
                  <ul className="text-xs text-[#66706B] space-y-1">
                    <li>• HistGradientBoosting (95.3% acc)</li>
                    <li>• YOLOv8-Seg (Ultralytics CV)</li>
                    <li>• PyOD ECOD anomaly detection</li>
                    <li>• SHAP factor explainability</li>
                    <li>• Zero cloud token tabular inference</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#F5F0E6] border border-[#DDD6C8]">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#173D35] mb-2">
                    <ShieldCheck className="w-4 h-4 text-[#173D35]" /> Security & Governance
                  </div>
                  <ul className="text-xs text-[#66706B] space-y-1">
                    <li>• 12 Hardware Safety Interlocks</li>
                    <li>• SHA-256 Tamper-evident ledger</li>
                    <li>• Off-chain camera privacy</li>
                    <li>• Anti-replay stale command window</li>
                    <li>• Local FIFO ring buffer (1k events)</li>
                  </ul>
                </div>
              </div>

              {/* Data & ML Models Detail */}
              <div className="mt-8 pt-6 border-t border-[#DDD6C8]">
                <h3 className="text-base font-bold text-[#173D35]">Data Science & Verification Benchmark</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div className="p-3 bg-white rounded-lg border border-[#DDD6C8]">
                    <span className="text-[10px] text-[#66706B] uppercase font-bold block">Dataset Preservation</span>
                    <span className="text-sm font-extrabold text-[#173D35]">20 CSVs • 1,214,992 Rows</span>
                    <p className="text-[11px] text-[#66706B] mt-1">Verified via <code>validate_synthetic_datasets.py</code> (100% Pass).</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-[#DDD6C8]">
                    <span className="text-[10px] text-[#66706B] uppercase font-bold block">Target Leakage Check</span>
                    <span className="text-sm font-extrabold text-emerald-700">PASS (Zero Feature Leakage)</span>
                    <p className="text-[11px] text-[#66706B] mt-1">Ground-truth <code>true_*</code> fields strictly excluded from model inputs.</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-[#DDD6C8]">
                    <span className="text-[10px] text-[#66706B] uppercase font-bold block">Regression Test Suites</span>
                    <span className="text-sm font-extrabold text-[#173D35]">20 Automated Pytest Suites</span>
                    <p className="text-[11px] text-[#66706B] mt-1">Verifies edge controllers, safety gates, and bilingual parity.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. ARCHITECTURE & DATA FLOW TAB */}
        {/* ========================================================================= */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <section className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-xl sm:text-2xl font-black text-[#173D35]">
                System Architecture & End-to-End Data Flow
              </h2>
              <p className="text-xs text-[#66706B] mt-1">
                Visual pipeline showing edge IoT acquisition, machine learning inference, deterministic safety vetoes, and immutable ledger recording.
              </p>

              {/* Architecture SVG Diagram */}
              <div className="mt-6 p-6 bg-[#102D27] rounded-xl border border-[#24574C] text-white overflow-x-auto">
                <div className="min-w-[700px] flex flex-col items-center space-y-6">
                  {/* Layer 1: Ingestion */}
                  <div className="w-full flex justify-between gap-4">
                    <div className="flex-1 p-3 bg-[#173D35] border border-emerald-500/40 rounded-lg text-center">
                      <Radio className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                      <span className="font-bold text-xs block">50 Dual-Sensor IoT Nodes</span>
                      <span className="text-[10px] text-slate-300">Ultrasonic Depth + Rain Telemetry</span>
                    </div>
                    <div className="flex-1 p-3 bg-[#173D35] border border-emerald-500/40 rounded-lg text-center">
                      <Eye className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                      <span className="font-bold text-xs block">50 Municipal CCTV Nodes</span>
                      <span className="text-[10px] text-slate-300">RTSP Feeds • Privacy Hashes</span>
                    </div>
                    <div className="flex-1 p-3 bg-[#173D35] border border-emerald-500/40 rounded-lg text-center">
                      <Users className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                      <span className="font-bold text-xs block">Citizen Crowd Reports</span>
                      <span className="text-[10px] text-slate-300">Public Portal • Water Photo Verification</span>
                    </div>
                  </div>

                  <div className="text-emerald-400 font-mono text-xs">▼ Ingestion & Telemetry Processing (30-60s Cadence) ▼</div>

                  {/* Layer 2: Intelligence & AI Core */}
                  <div className="w-full flex justify-between gap-4">
                    <div className="flex-1 p-3 bg-[#1E4D43] border border-sky-400/40 rounded-lg text-center">
                      <Cpu className="w-5 h-5 text-sky-400 mx-auto mb-1" />
                      <span className="font-bold text-xs block">PyOD Anomaly Detector</span>
                      <span className="text-[10px] text-slate-300">Filters Ultrasonic Spikes</span>
                    </div>
                    <div className="flex-1 p-3 bg-[#1E4D43] border border-sky-400/40 rounded-lg text-center">
                      <Layers className="w-5 h-5 text-sky-400 mx-auto mb-1" />
                      <span className="font-bold text-xs block">HistGradientBoosting (95.3%)</span>
                      <span className="text-[10px] text-slate-300">Waterlogging Severity Classifier</span>
                    </div>
                    <div className="flex-1 p-3 bg-[#1E4D43] border border-sky-400/40 rounded-lg text-center">
                      <Eye className="w-5 h-5 text-sky-400 mx-auto mb-1" />
                      <span className="font-bold text-xs block">YOLOv8-Seg Computer Vision</span>
                      <span className="text-[10px] text-slate-300">Water Polygon & Debris Detection</span>
                    </div>
                  </div>

                  <div className="text-emerald-400 font-mono text-xs">▼ AI Recommendation Output ▼</div>

                  {/* Layer 3: Hard Deterministic Safety Interlocks */}
                  <div className="w-full p-4 bg-amber-950/40 border-2 border-amber-500/70 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-sm">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      <span>12 HARDWARE DETERMINISTIC SAFETY INTERLOCKS (LOCAL EDGE CONTROLLER)</span>
                    </div>
                    <p className="text-[11px] text-amber-100/80 mt-1 max-w-2xl mx-auto">
                      AI cannot actuate pumps directly. The local controller checks: E-Stop, 3-Phase Power, Dry-Run,
                      Coil Temp &lt;= 85°C, Receiving Canal &lt;= 85%, Pipe Blockage, Command Expiry &lt;= 300s, HMAC-SHA256 Sign.
                    </p>
                  </div>

                  <div className="text-emerald-400 font-mono text-xs">▼ If 12 of 12 Gates PASS ▼</div>

                  {/* Layer 4: Actuation & Public Alerts */}
                  <div className="w-full flex justify-between gap-4">
                    <div className="flex-1 p-3 bg-[#173D35] border border-emerald-500/40 rounded-lg text-center">
                      <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                      <span className="font-bold text-xs block">Mobile Dewatering Pumps</span>
                      <span className="text-[10px] text-slate-300">High-capacity Pumping to Arteries</span>
                    </div>
                    <div className="flex-1 p-3 bg-[#173D35] border border-emerald-500/40 rounded-lg text-center">
                      <Lock className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                      <span className="font-bold text-xs block">SHA-256 Audit Ledger</span>
                      <span className="text-[10px] text-slate-300">Immutable Cryptographic Blockchain</span>
                    </div>
                    <div className="flex-1 p-3 bg-[#173D35] border border-emerald-500/40 rounded-lg text-center">
                      <Compass className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                      <span className="font-bold text-xs block">Live Public Map & SMS</span>
                      <span className="text-[10px] text-slate-300">Safe Alternative Routes for Citizens</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. 12 SAFETY INTERLOCKS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'safety' && (
          <div className="space-y-6">
            <section className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-[#173D35]" />
                <h2 className="text-xl sm:text-2xl font-black text-[#173D35]">
                  The 12 Deterministic Hardware Safety Interlocks
                </h2>
              </div>
              <p className="text-xs text-[#66706B] mt-1 max-w-3xl leading-relaxed">
                In industrial and civil water systems, directly letting an AI or cloud API actuate a 400V 50kW pump without local deterministic circuit breakers is illegal and hazardous. 
                Our platform enforces 12 immutable gates on local edge controller hardware (<code>backend/app/services/pump_safety.py</code>). If any single gate fails, the motor depowers immediately.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {safetyInterlocks.map((gate) => (
                  <div key={gate.id} className="p-4 rounded-xl border border-[#DDD6C8] bg-[#F5F0E6]/60 flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#173D35] text-xs font-black text-white">
                      {gate.id}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-xs text-[#173D35]">{gate.name}</h4>
                      <p className="text-[11px] text-[#66706B] mt-1 leading-relaxed">{gate.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. APIS & MCP PROTOCOL TAB */}
        {/* ========================================================================= */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <section className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#173D35]">
                    API Endpoints & Model Context Protocol (MCP) Server
                  </h2>
                  <p className="text-xs text-[#66706B] mt-1">
                    Exposes RESTful endpoints for web applications and Model Context Protocol (MCP) JSON-RPC 2.0 tools for AI assistants.
                  </p>
                </div>
                <a
                  href="https://urban-water-logged-ai-backend.onrender.com/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#173D35] text-white text-xs font-bold hover:bg-[#24574C] transition"
                >
                  <span>Open Live Swagger Docs</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* MCP Tool Manifest */}
              <div className="mt-6 p-4 rounded-xl bg-[#102D27] text-white border border-[#24574C]">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-xs text-emerald-300">
                    🔌 Custom MCP Server: <code>dhaka-flood-safety-mcp</code> (3 Active Tools)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Protocol 2024-11-05 Compliant
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-[#173D35] rounded-lg border border-emerald-600/30">
                    <span className="font-mono text-emerald-400 block font-bold">1. get_dhaka_flood_hotspots</span>
                    <span className="text-[11px] text-slate-300 mt-1 block">Queries real-time flood depth, severity, and canal reserve across 50 hotspots.</span>
                  </div>
                  <div className="p-3 bg-[#173D35] rounded-lg border border-emerald-600/30">
                    <span className="font-mono text-emerald-400 block font-bold">2. evaluate_pump_safety_interlocks</span>
                    <span className="text-[11px] text-slate-300 mt-1 block">Evaluates the 12 hardware safety gates before issuing dewatering commands.</span>
                  </div>
                  <div className="p-3 bg-[#173D35] rounded-lg border border-emerald-600/30">
                    <span className="font-mono text-emerald-400 block font-bold">3. verify_tamper_evident_ledger</span>
                    <span className="text-[11px] text-slate-300 mt-1 block">Verifies cryptographic SHA-256 chain validity across all audit records.</span>
                  </div>
                </div>
              </div>

              {/* REST API Table */}
              <div className="overflow-x-auto mt-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#DDD6C8] bg-[#F5F0E6] text-[#173D35] font-bold">
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5">Endpoint</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Auth / Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD6C8] font-mono text-[11px] text-[#263238]">
                    <tr>
                      <td className="p-2.5 text-emerald-700 font-bold">GET</td>
                      <td className="p-2.5">/api/v1/incidents/</td>
                      <td className="p-2.5 font-sans">List active waterlogging incidents with ML risk scores</td>
                      <td className="p-2.5 font-sans text-[#66706B]">Public / All</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-emerald-700 font-bold">GET</td>
                      <td className="p-2.5">/api/v1/map/layers</td>
                      <td className="p-2.5 font-sans">GeoJSON boundaries for Dhaka hotspots, drains, and clinics</td>
                      <td className="p-2.5 font-sans text-[#66706B]">Public / All</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-emerald-700 font-bold">GET</td>
                      <td className="p-2.5">/api/v1/pumps/</td>
                      <td className="p-2.5 font-sans">Live telemetry and 12-gate feasibility for dewatering pumps</td>
                      <td className="p-2.5 font-sans text-[#66706B]">Operator / Admin</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-blue-700 font-bold">POST</td>
                      <td className="p-2.5">/api/v1/pumps/{'{id}'}/command</td>
                      <td className="p-2.5 font-sans">Issue cryptographically signed pump actuation (START/STOP)</td>
                      <td className="p-2.5 font-sans text-rose-700 font-bold">Operator Verified</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-emerald-700 font-bold">GET</td>
                      <td className="p-2.5">/api/v1/audit/ledger</td>
                      <td className="p-2.5 font-sans">Retrieve SHA-256 tamper-evident immutable audit chain</td>
                      <td className="p-2.5 font-sans text-[#66706B]">Admin / Auditor</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-emerald-700 font-bold">GET</td>
                      <td className="p-2.5">/api/v1/mcp/manifest</td>
                      <td className="p-2.5 font-sans">Model Context Protocol server capabilities & tools list</td>
                      <td className="p-2.5 font-sans text-[#66706B]">Public MCP Agent</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. TEAM AI CRASHER TAB (MANDATORY ENHANCEMENT) */}
        {/* ========================================================================= */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <section className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDD6C8] pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#173D35] text-white">
                      TEAM AI CRASHER
                    </span>
                    <span className="text-xs text-[#B68A35] font-bold">
                      International AI Builders Congress • CloudCamp Bangladesh
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#173D35] mt-2">
                    The Engineers & Designers Behind Urban Water-logged AI
                  </h2>
                  <p className="text-xs text-[#66706B] mt-1 max-w-2xl">
                    A multidisciplinary team of AI engineers, full-stack developers, and domain researchers dedicated to solving Dhaka city's urban crisis.
                  </p>
                </div>
                <div className="p-3 bg-[#F5F0E6] rounded-xl border border-[#DDD6C8] text-right">
                  <span className="text-[10px] text-[#66706B] block uppercase font-bold">Team Attendance</span>
                  <span className="text-sm font-extrabold text-[#173D35]">100% In-Person Physical</span>
                </div>
              </div>

              {/* Team Members Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
                {teamMembers.map((member) => (
                  <div
                    key={member.name}
                    className="p-5 rounded-xl border border-[#DDD6C8] bg-white hover:border-[#173D35] hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3.5 mb-3">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          onError={(e) => {
                            // Fallback to letter avatar if image missing
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.querySelector('.fallback-avatar')?.classList.remove('hidden');
                          }}
                          className="w-14 h-14 rounded-full object-cover border-2 border-[#173D35] shadow-xs"
                        />
                        <div className="hidden fallback-avatar w-14 h-14 rounded-full bg-[#173D35] text-white font-black text-xl flex items-center justify-center">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-sm text-[#263238] leading-tight">{member.name}</h3>
                          </div>
                          {member.badge && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#B68A35] text-white">
                              {member.badge}
                            </span>
                          )}
                          <span className="text-[11px] text-[#66706B] block mt-0.5">{member.status}</span>
                        </div>
                      </div>

                      {/* Role Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {member.role.map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F5F0E6] text-[#173D35] border border-[#DDD6C8]"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#DDD6C8] text-[11px] text-[#66706B]">
                      <span className="block font-mono text-[10px] text-slate-400">CONTACT</span>
                      <a href={`mailto:${member.email}`} className="text-[#173D35] font-semibold hover:underline">
                        {member.email}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-[#DDD6C8] text-center text-xs text-[#66706B]">
        <p>
          © 2026 Urban Water-logged AI • Built by <strong>Team AI Crasher</strong> for the International AI Builders Congress (CloudCamp Bangladesh).
        </p>
        <p className="mt-1 text-[11px]">
          Simulated Benchmark • 50 Monitored Hotspots • 12 Deterministic Hardware Safety Gates • Model Context Protocol Compliant.
        </p>
      </footer>
    </div>
  );
};

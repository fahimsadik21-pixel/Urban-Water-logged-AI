import React, { useState } from 'react';
import {
  Gauge,
  Clock,
  Bell,
  AlertTriangle,
  Play,
  Square,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export const PumpSafetyView: React.FC = () => {
  const [subTab, setSubTab] = useState<'console' | 'eta' | 'alerts'>('console');
  const [opMode, setOpMode] = useState<'monitor' | 'operator' | 'auto' | 'estop'>('auto');
  const [isEStopped, setIsEStopped] = useState<boolean>(false);
  const [webPush, setWebPush] = useState<boolean>(true);
  const [smsChannel, setSmsChannel] = useState<boolean>(true);
  const [inAppChannel, setInAppChannel] = useState<boolean>(true);
  const [audienceRadius, setAudienceRadius] = useState<number>(3.0);
  const [operatorConfirmed, setOperatorConfirmed] = useState<boolean>(false);

  const handleEStop = () => {
    setIsEStopped(true);
    setOpMode('estop');
  };

  const handleResetEStop = () => {
    setIsEStopped(false);
    setOpMode('operator');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#070b14] overflow-y-auto text-slate-100">
      {/* 1. Header Bar with Sub-Tabs (Matching Image 1) */}
      <header className="h-12 border-b border-slate-800/80 bg-[#0a0f1d] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setSubTab('console')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              subTab === 'console'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Pump Console</span>
          </button>

          <button
            onClick={() => setSubTab('eta')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              subTab === 'eta'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Response & ETA</span>
          </button>

          <button
            onClick={() => setSubTab('alerts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              subTab === 'alerts'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts & Notifications</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleEStop}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-red-600/30"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Emergency Stop</span>
          </button>
        </div>
      </header>

      {/* 2. Sub-Tab 1: Pump Console (Image 1 Left) */}
      {subTab === 'console' && (
        <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Pump Console</h3>
            {isEStopped && (
              <button
                onClick={handleResetEStop}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold"
              >
                Reset E-Stop Latch
              </button>
            )}
          </div>

          {/* Operation Mode Selector (Matching Image 1 Left) */}
          <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <span className="text-xs font-bold text-slate-300 block mb-2.5">
              Operation Mode
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <button
                onClick={() => setOpMode('monitor')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  opMode === 'monitor'
                    ? 'bg-slate-700 border-cyan-500 text-white shadow-md'
                    : 'bg-[#0a0f1d] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Monitor Only
              </button>
              <button
                onClick={() => setOpMode('operator')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  opMode === 'operator'
                    ? 'bg-blue-600/40 border-cyan-500 text-white shadow-md'
                    : 'bg-[#0a0f1d] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Operator Permission
              </button>
              <button
                onClick={() => setOpMode('auto')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  opMode === 'auto'
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-md font-bold'
                    : 'bg-[#0a0f1d] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Automatic
              </button>
              <button
                onClick={handleEStop}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  opMode === 'estop'
                    ? 'bg-red-600 border-red-400 text-white shadow-md'
                    : 'bg-[#0a0f1d] border-red-500/40 text-red-400 hover:bg-red-950/40'
                }`}
              >
                Emergency Stop
              </button>
            </div>
          </div>

          {/* Middle Metric Cards Grid (Matching Image 1 Left) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Pump State */}
            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Pump State</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-emerald-400">
                  {isEStopped ? 'STOPPED (E-Stop)' : opMode === 'auto' ? 'RUNNING (Automatic)' : 'STANDBY'}
                </span>
              </div>
            </div>

            {/* Flow (Now) */}
            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Flow (Now)</span>
              <div className="text-base font-black text-cyan-400 font-mono">
                {isEStopped ? '0 m³/h' : '1,260 m³/h'}
              </div>
            </div>

            {/* Source Water Level */}
            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Source Water Level</span>
              <div className="text-sm font-bold text-white">
                3.42 m <span className="text-[10px] text-slate-400 font-normal">(Alert &ge; 3.60 m)</span>
              </div>
            </div>

            {/* Destination Drain Capacity */}
            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Destination Drain Capacity</span>
              <div className="text-sm font-bold text-white">
                68% <span className="text-[10px] text-slate-400 font-normal">(6,800 / 10,000 m³/h)</span>
              </div>
            </div>

            {/* Motor Temperature */}
            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Motor Temperature</span>
              <div className="text-sm font-bold text-white">
                62 &deg;C <span className="text-[10px] text-slate-400 font-normal">(Limit &le; 85 &deg;C)</span>
              </div>
            </div>

            {/* Power Stability */}
            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Power Stability</span>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Stable (398 V, 50.0 Hz)
              </div>
            </div>

            {/* Pipe Blockage */}
            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Pipe Blockage</span>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Normal
              </div>
            </div>

            {/* Dry-run */}
            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Dry-run</span>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> No Risk
              </div>
            </div>

            {/* Signed Command Freshness */}
            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Signed Command Freshness</span>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Valid (8 s ago) (Allowed &le; 60 s)
              </div>
            </div>
          </div>

          {/* Safety Interlocks Checklist (Matching Image 1 Left) */}
          <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Safety Interlocks
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                ✔ ALL CLEAR (Pump Allowed)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1d]">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> High water level (start condition)
                </span>
                <span className="font-mono text-emerald-400 text-[11px]">OK (3.42 m &ge; 3.00 m)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1d]">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Destination drain capacity sufficient
                </span>
                <span className="font-mono text-emerald-400 text-[11px]">OK (68% &le; 90%)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1d]">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Motor temperature within limit
                </span>
                <span className="font-mono text-emerald-400 text-[11px]">OK (62 &deg;C &le; 85 &deg;C)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1d]">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No pipe blockage detected
                </span>
                <span className="font-mono text-emerald-400 text-[11px]">OK</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1d]">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No dry-run risk
                </span>
                <span className="font-mono text-emerald-400 text-[11px]">OK</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1d]">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Power supply stable
                </span>
                <span className="font-mono text-emerald-400 text-[11px]">OK (398 V, 50.0 Hz)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1d]">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Signed command fresh
                </span>
                <span className="font-mono text-emerald-400 text-[11px]">OK (8 s ago)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1d]">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> System integrity &amp; controls healthy
                </span>
                <span className="font-mono text-emerald-400 text-[11px]">OK</span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Matching Image 1 Left) */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={handleEStop}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>E-STOP</span>
            </button>
            <button
              onClick={() => setOperatorConfirmed(!operatorConfirmed)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{operatorConfirmed ? 'Operator Confirmed ✔' : 'Operator Confirmation...'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Sub-Tab 2: Response and ETA (Image 1 Center) */}
      {subTab === 'eta' && (
        <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-4">
          <h3 className="text-base font-bold text-white">Response and ETA</h3>

          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Clearance ETA</span>
              <div className="text-base font-bold text-emerald-400 font-mono">
                2 h 10 m – 2 h 40 m
              </div>
            </div>

            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Ponded Volume</span>
              <div className="text-base font-bold text-cyan-400 font-mono">
                48,600 m³
              </div>
            </div>

            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Pump Flow</span>
              <div className="text-base font-bold text-white font-mono">
                1,260 m³/h
              </div>
            </div>

            <div className="bg-[#10172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
              <span className="text-[11px] text-slate-400 block mb-1">Net Drainage Rate</span>
              <div className="text-sm font-bold text-white font-mono">
                1,220 m³/h <span className="text-[10px] text-slate-400 font-normal">(Inflow 40 m³/h)</span>
              </div>
            </div>
          </div>

          {/* Progress Timeline (Matching Image 1 Center) */}
          <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <span className="text-xs font-bold text-white block">Progress Timeline</span>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-[#0a0f1d]">
                <span className="text-[10px] text-slate-400 block">Event Detected</span>
                <span className="font-bold text-white">08:00</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0a0f1d]">
                <span className="text-[10px] text-slate-400 block">Pump Activated</span>
                <span className="font-bold text-cyan-400">08:05</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0a0f1d] border border-cyan-500/30">
                <span className="text-[10px] text-cyan-300 block">Draining (In Progress)</span>
                <span className="font-bold text-cyan-300">08:05 &ndash; ~10:45</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0a0f1d]">
                <span className="text-[10px] text-slate-400 block">Near Clearance</span>
                <span className="font-bold text-slate-300">~10:45</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0a0f1d]">
                <span className="text-[10px] text-slate-400 block">Cleared (ETA)</span>
                <span className="font-bold text-emerald-400">~11:30 &ndash; 11:45</span>
              </div>
            </div>

            {/* Drainage Progress Bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Drainage Progress</span>
                <span className="font-bold text-emerald-400 font-mono">66%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full" style={{ width: '66%' }} />
              </div>
            </div>
          </div>

          {/* Destination Drainage Route Diagram (Matching Image 1 Center) */}
          <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <span className="text-xs font-bold text-white block mb-3">
              Destination Drainage Route
            </span>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#0a0f1d] border border-slate-700 font-semibold text-white">
                Pump Station (P-01)
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <div className="p-2.5 rounded-xl bg-[#0a0f1d] border border-slate-700 font-semibold text-white">
                Trunk Drain (DN1200)
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <div className="p-2.5 rounded-xl bg-[#0a0f1d] border border-slate-700 font-semibold text-white">
                Main Drain (DN1800)
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-500/40 font-semibold text-cyan-300">
                River Outfall (OUT-03)
              </div>
            </div>
          </div>

          {/* 1-Hour Delay Notification & Hospital Road Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#10172a] border border-amber-500/40 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-1">
                <Clock className="w-4 h-4" />
                <span>One-Hour Delay Notification</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Clearance ETA is extended by ~1 hour due to downstream high water level (capacity at 92%).
              </p>
            </div>

            <div className="bg-[#10172a] border border-emerald-500/40 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" /> Hospital Road Priority
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Priority drainage enabled for Hospital Road (H-1). Maintaining higher pump flow and route capacity.
              </p>
            </div>
          </div>

          {/* Manual Override Audit Record Table */}
          <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white">Manual Override Audit Record</span>
              <button className="text-[11px] text-cyan-400 hover:underline">View Full Log &gt;</button>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-[11px]">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Operator Action</th>
                  <th className="py-2 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                <tr>
                  <td className="py-2 px-3 font-mono">08:12</td>
                  <td className="py-2 px-3 font-semibold text-white">Manual Override: Flow +10%</td>
                  <td className="py-2 px-3">Increase from 1,150 &rarr; 1,260 m³/h (Reason: Hospital Road Priority)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono">08:57</td>
                  <td className="py-2 px-3 font-semibold text-white">Manual Override: Route Adjust</td>
                  <td className="py-2 px-3">Switch to Route B (higher capacity) (Reason: Downstream congestion)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Sub-Tab 3: Alerts and Notifications (Image 1 Right) */}
      {subTab === 'alerts' && (
        <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-4">
          <h3 className="text-base font-bold text-white">Alerts and Notifications</h3>

          {/* 3 Active Alert Cards (Matching Image 1 Right) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#10172a] border border-red-500/40 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-red-400">Waterlogging Alert</span>
                <span className="bg-red-500/20 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Street waterlogging in the surrounding area. Avoid low-lying sections.
              </p>
            </div>

            <div className="bg-[#10172a] border border-amber-500/40 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-amber-300">Road Restriction</span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Partial road closure on Hospital Road (H-1). Follow detour guidance.
              </p>
            </div>

            <div className="bg-[#10172a] border border-yellow-500/40 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-yellow-300">Trash / Debris</span>
                <span className="bg-yellow-500/20 text-yellow-300 text-[10px] font-bold px-2 py-0.5 rounded">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Accumulated trash and debris detected near drains. Avoid dumping waste and report obstructions.
              </p>
            </div>
          </div>

          {/* Delivery Channels & Audience Radius */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delivery Channels */}
            <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
              <span className="text-xs font-bold text-white block mb-3">Delivery Channels</span>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1d]">
                  <span className="text-slate-300">Web Push</span>
                  <button
                    onClick={() => setWebPush(!webPush)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold ${
                      webPush ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {webPush ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1d]">
                  <span className="text-slate-300">SMS</span>
                  <button
                    onClick={() => setSmsChannel(!smsChannel)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold ${
                      smsChannel ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {smsChannel ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1d]">
                  <span className="text-slate-300">In-App</span>
                  <button
                    onClick={() => setInAppChannel(!inAppChannel)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold ${
                      inAppChannel ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {inAppChannel ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Audience Radius */}
            <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-white block mb-1">Audience Radius</span>
                <div className="text-2xl font-black text-cyan-400 font-mono mb-1">
                  {audienceRadius.toFixed(1)} km
                </div>
                <p className="text-[11px] text-slate-400">From affected area (Pump P-01)</p>
              </div>

              <div className="pt-4">
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={audienceRadius}
                  onChange={(e) => setAudienceRadius(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0.5 km</span>
                  <span>1.0 km</span>
                  <span>3.0 km</span>
                  <span>5.0 km</span>
                  <span>10.0 km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notification History Table */}
          <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white">Notification History</span>
              <button className="text-[11px] text-cyan-400 hover:underline">View All &gt;</button>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-[11px]">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Message (Summary)</th>
                  <th className="py-2 px-3">Channels</th>
                  <th className="py-2 px-3">Acknowledgement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                <tr>
                  <td className="py-2 px-3 font-mono">08:05</td>
                  <td className="py-2 px-3 font-semibold text-red-400">Waterlogging</td>
                  <td className="py-2 px-3">Waterlogging in nearby area. Avoid low-lying sections.</td>
                  <td className="py-2 px-3">Web / SMS / In-App</td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">✔ Acknowledged (92%)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono">08:10</td>
                  <td className="py-2 px-3 font-semibold text-amber-300">Road Restriction</td>
                  <td className="py-2 px-3">Partial road closure on Hospital Road (H-1).</td>
                  <td className="py-2 px-3">Web / In-App</td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">✔ Acknowledged (88%)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono">08:15</td>
                  <td className="py-2 px-3 font-semibold text-yellow-300">Trash / Debris</td>
                  <td className="py-2 px-3">Trash and debris near drains. Please do not dump waste.</td>
                  <td className="py-2 px-3">SMS / In-App</td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">✔ Acknowledged (86%)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono">08:57</td>
                  <td className="py-2 px-3 font-semibold text-cyan-300">Update</td>
                  <td className="py-2 px-3">Clearance ETA updated: 2 h 10 m - 2 h 40 m (+1 hour).</td>
                  <td className="py-2 px-3">Web / SMS / In-App</td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">✔ Acknowledged (91%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  CheckCircle2,
  Play,
  RotateCcw,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { CitizenReportingPortal } from './CitizenReportingPortal';

export const PublicSimulationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'citizen' | 'road' | 'simulation' | 'audit'>('citizen');
  const [selectedScenario, setSelectedScenario] = useState<string>('A');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simLog, setSimLog] = useState<string[]>([
    '#001 | 10:24:03 | Simulation Mode: ON',
    '#002 | 10:24:05 | Scenario A selected: Faulty Sensor',
    '#003 | 10:24:07 | Sensor data marked as invalid',
    '#004 | 10:24:10 | Alert generated and logged',
    '#005 | 10:24:12 | Simulation completed (A)',
  ]);
  const [isTampered, setIsTampered] = useState<boolean>(false);

  // Scenarios A-G
  const scenarios: Record<string, { title: string; desc: string; icon: string }> = {
    A: { title: 'Faulty Sensor', desc: 'Simulates a sensor failure (e.g., no data or abnormal reading) and verifies alerting, fallback, and audit recording.', icon: '⚡' },
    B: { title: 'Hospital Road Flooding', desc: 'Simulates rapid inundation on access corridor to DMCH/BSMMU, triggering emergency P1 priority bump and route clearance.', icon: '🏥' },
    C: { title: 'Drain Full', desc: 'Downstream canal exceeds 90% threshold, verifying deterministic pump halt to avoid downstream flooding.', icon: '🌊' },
    D: { title: 'Operator Permission', desc: 'Prompts municipal operator for cryptographic authorization before secondary pump activation.', icon: '👤' },
    E: { title: 'Automatic Thermal Fault', desc: 'Motor temperature reaches 86°C (>85°C limit), triggering hardware relay trip and alarm.', icon: '🔥' },
    F: { title: 'Outage Recovery', desc: 'Mains restored after blackout; validates stale command rejection and 8-gate re-verification.', icon: '⚡' },
    G: { title: 'Debris Hazard', desc: 'Trash blockage detected at screen intake; generates warning and dispatch order for waste clearance.', icon: '🗑️' },
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    const newEntry = `#00${simLog.length + 1} | ${new Date().toLocaleTimeString()} | Executed Scenario ${selectedScenario}: ${scenarios[selectedScenario].title}`;
    setTimeout(() => {
      setSimLog([newEntry, ...simLog]);
      setIsSimulating(false);
    }, 600);
  };

  const handleResetSim = () => {
    setSimLog([
      `#001 | ${new Date().toLocaleTimeString()} | Simulation Mode: ON`,
      `#002 | ${new Date().toLocaleTimeString()} | Reset all simulated test fixtures`,
    ]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#070b14] overflow-y-auto text-slate-100">
      {/* 1. Header Bar with 4 Sub-Tabs (Matching Image 4) */}
      <header className="h-12 border-b border-slate-800/80 bg-[#0a0f1d] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('citizen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'citizen'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Public: Citizen Reporting
          </button>

          <button
            onClick={() => setActiveTab('road')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'road'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Public: Road Status
          </button>

          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'simulation'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Operator: Scenario Testing
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'audit'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Operator: Audit Ledger
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 hidden sm:inline">Permission Isolation: Active</span>
        </div>
      </header>

      {/* 2. Sub-Tabs 1 & 2: Public User - Citizen Reporting & Live Road Advisories */}
      {(activeTab === 'citizen' || activeTab === 'road') && (
        <div className="flex-1 overflow-y-auto">
          <CitizenReportingPortal showOperationsFeed={false} />
        </div>
      )}

      {/* 4. Sub-Tab 3: Operator (Desktop) - Scenario & Testing (Matching Image 4 Col 3) */}
      {activeTab === 'simulation' && (
        <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Simulation Center</h3>
            <p className="text-xs text-slate-400">
              Run controlled scenarios to test detection, decision, and response logic of the waterlogging system.
            </p>
          </div>

          {/* Select a Scenario (A – G) Buttons Grid */}
          <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <span className="text-xs font-bold text-white block">Select a Scenario (A &ndash; G)</span>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((scId) => {
                const sc = scenarios[scId];
                const isSelected = selectedScenario === scId;

                return (
                  <button
                    key={scId}
                    onClick={() => setSelectedScenario(scId)}
                    className={`p-3 rounded-xl border text-center transition ${
                      isSelected
                        ? 'bg-blue-600 border-cyan-400 text-white shadow-lg'
                        : 'bg-[#0a0f1d] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-lg block mb-1">{sc.icon}</span>
                    <span className="text-xs font-bold block">{scId}</span>
                    <span className="text-[10px] text-slate-300 block truncate">{sc.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Scenario Card */}
            <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-slate-700/80 mt-2">
              <span className="text-xs font-bold text-cyan-300 block mb-1">
                Scenario {selectedScenario}: {scenarios[selectedScenario].title}
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {scenarios[selectedScenario].desc}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isSimulating ? 'Executing Simulation...' : 'Run Simulation'}</span>
              </button>
              <button
                onClick={handleResetSim}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Event Log Table */}
          <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white">Event Log (Latest first)</span>
              <span className="text-[10px] text-slate-400 font-mono">Live Telemetry Daemon</span>
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              {simLog.map((log, idx) => (
                <div key={idx} className="p-2 rounded bg-[#0a0f1d] border border-slate-800/80 text-slate-300 flex items-center justify-between">
                  <span>{log}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Sub-Tab 4: Operator (Desktop) - Audit & Integrity (Matching Image 4 Col 4) */}
      {activeTab === 'audit' && (
        <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Audit Ledger</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isTampered ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}>
                  {isTampered ? 'TAMPER DETECTED' : '✔ Verified'}
                </span>
              </div>
              <p className="text-xs text-slate-400">View the cryptographic audit trail of key events to ensure transparency and tamper evidence.</p>
            </div>

            <button
              onClick={() => setIsTampered(!isTampered)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                isTampered
                  ? 'bg-amber-600 text-white border-amber-400'
                  : 'bg-red-600/20 text-red-400 border-red-500/40 hover:bg-red-600/30'
              }`}
            >
              {isTampered ? 'Restore Ledger' : 'Simulate Tamper'}
            </button>
          </div>

          {/* Block Chain (Hash Chain Visualizer) */}
          <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <span className="text-xs font-bold text-white block mb-3">Block Chain (Hash Chain)</span>
            <div className="flex items-center justify-center gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#0a0f1d] border border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 block">Previous Hash</span>
                <span className="text-cyan-400 font-bold">a8f1e3d4...c7e1</span>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 shrink-0" />
              <div className={`p-3 rounded-xl border text-center ${
                isTampered ? 'bg-red-950/40 border-red-500 text-red-400' : 'bg-[#0a0f1d] border-emerald-500 text-emerald-400'
              }`}>
                <span className="text-[10px] text-slate-400 block">Current Hash</span>
                <span className="font-bold">{isTampered ? 'CORRUPTED_HASH' : 'b4c9d7e2...f9a0'}</span>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                isTampered ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {isTampered ? 'INVALID' : '✔ Verified'}
              </span>
            </div>
          </div>

          {/* Block Details (Selected Block) */}
          <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl text-xs space-y-2">
            <span className="text-xs font-bold text-white block border-b border-slate-800 pb-2">
              Block Details (Selected Block #005214)
            </span>
            <div className="grid grid-cols-2 gap-3 text-slate-300">
              <div><span className="text-slate-400">Block ID:</span> <strong className="text-white">#005214</strong></div>
              <div><span className="text-slate-400">Event Type:</span> <strong className="text-cyan-400">Waterlogging Report</strong></div>
              <div><span className="text-slate-400">Previous Hash:</span> <span className="font-mono text-slate-300">a8f1e3d4...c7e1</span></div>
              <div><span className="text-slate-400">Current Hash:</span> <span className="font-mono text-slate-300">b4c9d7e2...f9a0</span></div>
              <div><span className="text-slate-400">Actor:</span> Public User (Anonymous)</div>
              <div><span className="text-slate-400">Timestamp:</span> 2026-11-16 10:22:31</div>
            </div>
            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
              Details: Report submitted (WL-20250126-7843). Media stored off-chain.
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Camera media: kept off-chain (secure storage, hashed reference only)
            </div>
          </div>

          {/* Recent Events Table */}
          <div className="bg-[#10172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <span className="text-xs font-bold text-white block mb-2">Audit Ledger (Recent Events)</span>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-[11px]">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Actor</th>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Event Type</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                <tr>
                  <td className="py-2 px-3 font-mono">005214</td>
                  <td className="py-2 px-3">Public User</td>
                  <td className="py-2 px-3">10:22:31</td>
                  <td className="py-2 px-3">Waterlogging Report</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">✔ Verified</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono">005215</td>
                  <td className="py-2 px-3">System</td>
                  <td className="py-2 px-3">10:23:05</td>
                  <td className="py-2 px-3">Risk Assessment</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">✔ Verified</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono">005216</td>
                  <td className="py-2 px-3">Operator</td>
                  <td className="py-2 px-3">10:24:10</td>
                  <td className="py-2 px-3">Simulation (A)</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">✔ Verified</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono">005217</td>
                  <td className="py-2 px-3">System</td>
                  <td className="py-2 px-3">10:24:12</td>
                  <td className="py-2 px-3">Audit Record</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">✔ Verified</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

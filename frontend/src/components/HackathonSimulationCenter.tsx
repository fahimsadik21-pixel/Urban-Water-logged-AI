import React, { useState } from 'react';
import type { SimulationScenarioResult } from '../types';
import { apiFetch } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Play,
  CheckCircle2,
  Clock,
  Zap,
  ShieldAlert,
  Sliders,
  Database,
  Terminal,
} from 'lucide-react';

interface ScenarioDef {
  letter: string;
  title: string;
  shortDesc: string;
  expectedOutcome: string;
  category: 'anomaly' | 'priority' | 'safety' | 'power' | 'debris';
}

const SCENARIOS: ScenarioDef[] = [
  {
    letter: 'A',
    title: 'Faulty Sensor Anomaly',
    shortDesc: 'A sudden unphysical water level spike (e.g. +35 cm in 1 min) without rain or camera corroboration.',
    expectedOutcome: 'Spike suppressed as anomaly. AI blocks pump startup; logs incident as Unverified.',
    category: 'anomaly',
  },
  {
    letter: 'B',
    title: 'Verified Hospital Road Flooding',
    shortDesc: 'Water accumulation on Dhaka Medical College Hospital (DMCH) arterial road verified by IoT and CCTV.',
    expectedOutcome: 'MCDA priority elevated to P1 (Critical). Multi-source confirmation logged to audit ledger.',
    category: 'priority',
  },
  {
    letter: 'C',
    title: 'Destination Drain Full',
    shortDesc: 'High source water, but destination storm canal (Hatirjheel/Kallyanpur) is at 92% capacity.',
    expectedOutcome: 'Drain safety interlock trips. Pumping blocked to prevent backflow; > 1h delay notice issued.',
    category: 'safety',
  },
  {
    letter: 'D',
    title: 'Operator Permission Mode Workflow',
    shortDesc: 'Safe pumping conditions exist. Dispatcher reviews evidence and explicitly authorizes startup.',
    expectedOutcome: 'Signed operator command executed. Pump starts; clearance ETA range updates in real time.',
    category: 'safety',
  },
  {
    letter: 'E',
    title: 'Automatic Mode & Thermal Overheat',
    shortDesc: 'Pump operating in autonomous closed-loop when motor temperature rises to 88.0°C.',
    expectedOutcome: 'Deterministic thermal interlock trips immediately. Pump depowered; audit alert logged.',
    category: 'safety',
  },
  {
    letter: 'F',
    title: 'Power Outage & Safe Recovery',
    shortDesc: 'Grid blackout drops mains power. Station falls back to 12V 7Ah backup battery, then power restores.',
    expectedOutcome: 'IoT stays alive on battery; pump locked out. On power recovery, stale commands purged.',
    category: 'power',
  },
  {
    letter: 'G',
    title: 'Debris Hazard & Trash Warning',
    shortDesc: 'Heavy plastic waste accumulation detected near pump suction screen via camera and citizen reports.',
    expectedOutcome: 'Debris hazard flag raised. Pre-emptive trash screen warning issued before impeller clogging.',
    category: 'debris',
  },
];

export const HackathonSimulationCenter: React.FC = () => {
  const { lang } = useLanguage();
  const bn = lang === 'bn';
  const [activeScenario, setActiveScenario] = useState<string>('A');
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationScenarioResult | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const runScenario = async (letter: string) => {
    try {
      setRunning(true);
      setErrorNotice(null);
      setResult(null);
      setActiveScenario(letter);

      const data = await apiFetch<SimulationScenarioResult>(`/api/v1/simulation/scenarios/${letter}`);
      setResult(data);
    } catch (err: any) {
      setErrorNotice(err.message || 'Execution error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F0E6] text-[#263238] overflow-y-auto p-4 space-y-5 font-sans animate-fade-in">
      {/* Header */}
      <div className="border-b border-[#DDD6C8] pb-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-[#B68A35]" />
          <h2 className="text-base font-bold text-[#173D35]">
            {bn ? 'সিমুলেশন সিনারিও (সিনারিও A থেকে G)' : 'Simulation Scenarios (Scenarios A through G)'}
          </h2>
        </div>
        <p className="text-xs text-[#66706B] mt-1">
          {bn
            ? 'ডিটারমিনিস্টিক এজ-কেস বেঞ্চমার্ক সিমুলেশন: সেফটি ইন্টারলক, অ্যানোমালি সাপ্রেশন, হাসপাতাল অগ্রাধিকার এবং রি-প্লে পাওয়ার রিকভারি।'
            : 'Execute deterministic edge-case benchmarks to demonstrate safety interlocks, anomaly suppression, hospital prioritization, thermal fault trip, and anti-replay power recovery.'}
        </p>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Scenario Buttons Column */}
        <div className="lg:col-span-5 space-y-2">
          <span className="text-xs font-bold text-[#173D35] uppercase tracking-wider block mb-1">
            {bn ? 'ডিটারমিনিস্টিক টেস্ট সিনারিও:' : 'Deterministic Test Scenarios:'}
          </span>

          {SCENARIOS.map((sc) => {
            const isSelected = activeScenario === sc.letter;
            return (
              <div
                key={sc.letter}
                onClick={() => !running && runScenario(sc.letter)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#173D35]/10 border-[#173D35] shadow-xs ring-1 ring-[#173D35]'
                    : 'bg-[#FFFDF8] border-[#DDD6C8] hover:bg-[#F5F0E6]/70 hover:border-[#173D35]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#173D35] text-white shadow-xs'
                          : 'bg-[#DDD6C8] text-[#263238]'
                      }`}
                    >
                      {sc.letter}
                    </span>
                    <span className="font-bold text-xs text-[#263238]">{sc.title}</span>
                  </div>

                  <button
                    disabled={running}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!running) runScenario(sc.letter);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-[#173D35] hover:bg-[#1E4D43] text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5 fill-white" />
                    <span>Run</span>
                  </button>
                </div>

                <p className="text-[11px] text-[#66706B] leading-tight mb-1">
                  {sc.shortDesc}
                </p>

                <div className="text-[10px] text-[#263238] bg-[#F5F0E6] p-1.5 rounded border border-[#DDD6C8] font-mono">
                  &bull; {sc.expectedOutcome}
                </div>
              </div>
            );
          })}
        </div>

        {/* Results & Inspection Column */}
        <div className="lg:col-span-7 bg-[#FFFDF8] border border-[#DDD6C8] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-[#173D35]" />
                <h3 className="font-bold text-sm text-[#173D35]">
                  Scenario Execution Telemetry & Result
                </h3>
              </div>
              {running && (
                <span className="text-xs text-[#B68A35] flex items-center gap-1 animate-pulse font-semibold">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Scenario {activeScenario}...</span>
                </span>
              )}
            </div>

            {errorNotice && (
              <div className="p-3 bg-[#B85042]/10 border border-[#B85042]/40 text-[#B85042] rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#B85042] shrink-0" />
                <span>{errorNotice}</span>
              </div>
            )}

            {result ? (
              <div className="space-y-3 animate-fade-in">
                {/* Status Pill */}
                <div className="flex items-center justify-between bg-[#F5F0E6] p-3 rounded-xl border border-[#DDD6C8]">
                  <div>
                    <span className="text-[10px] text-[#66706B] uppercase font-mono block">Scenario Name</span>
                    <h4 className="font-bold text-[#263238] text-sm">{result.scenario}</h4>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-black border flex items-center gap-1.5 ${
                      result.acceptance_test_passed
                        ? 'bg-[#5D7A4E]/15 text-[#5D7A4E] border-[#5D7A4E]/40'
                        : 'bg-[#B85042]/15 text-[#B85042] border-[#B85042]/40'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ Acceptance Test Passed</span>
                  </span>
                </div>

                {/* Key Observations Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(result)
                    .filter(([k]) => k !== 'scenario' && k !== 'acceptance_test_passed')
                    .map(([key, val]) => (
                      <div
                        key={key}
                        className="bg-[#F5F0E6] p-2.5 rounded-xl border border-[#DDD6C8] space-y-0.5"
                      >
                        <span className="text-[10px] text-[#66706B] font-mono uppercase block truncate">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-semibold text-[#263238] text-xs break-words">
                          {typeof val === 'boolean'
                            ? val
                              ? 'TRUE'
                              : 'FALSE'
                            : typeof val === 'object'
                            ? JSON.stringify(val)
                            : String(val)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Raw JSON View */}
                <div className="bg-[#F5F0E6] p-3 rounded-xl border border-[#DDD6C8] text-[11px] font-mono text-[#263238] overflow-x-auto max-h-48">
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
              </div>
            ) : (
              !running && (
                <div className="p-12 text-center text-[#66706B] space-y-2">
                  <Sliders className="w-10 h-10 mx-auto text-[#DDD6C8]" />
                  <p className="text-xs">
                    {bn
                      ? 'বাম পাশ থেকে যেকোনো সিনারিও নির্বাচন করে সিমুলেশন পরিচালনা করুন।'
                      : 'Click any Scenario on the left to execute deterministic simulation.'}
                  </p>
                </div>
              )
            )}
          </div>

          <div className="pt-3 border-t border-[#DDD6C8] text-[10px] text-[#66706B] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-[#173D35]" />
              <span>Causal Deterministic Engine • Full SHA-256 Linkage</span>
            </span>
            <span className="text-[#B68A35] font-semibold">Simulation Benchmark</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  FastForward,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SimulationActiveBannerProps {
  activeRun: any;
  onOpenModal: () => void;
  onNextStep: () => void;
  onReset: () => void;
  onExitDemo: () => void;
  onSelectPersona: (persona: string) => void;
}

export const SimulationActiveBanner: React.FC<SimulationActiveBannerProps> = ({
  activeRun,
  onOpenModal,
  onNextStep,
  onReset,
  onExitDemo,
  onSelectPersona,
}) => {
  const { lang } = useLanguage();
  const bn = lang === 'bn';

  if (!activeRun) return null;

  const persona = activeRun.current_persona || 'analyst';
  const state = activeRun.current_state || 'CREATED';

  return (
    <div className="sticky top-0 z-40 bg-[#173D35] border-b border-[#24574C] px-3 py-2 text-xs text-[#FFFDF8] shadow-md">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2">
        {/* Left: Indicator & Info */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-full bg-[#B68A35]/20 px-2.5 py-1 text-[#FFFDF8] border border-[#B68A35]/40">
            <Sparkles className="h-3.5 w-3.5 text-[#B68A35] animate-pulse" />
            <span className="font-extrabold uppercase tracking-wide text-[11px]">
              {bn ? 'সিমুলেশন ডেমো সক্রিয়' : 'Simulation Demo Active'}
            </span>
          </div>

          <span className="hidden md:inline font-bold text-[#FFFDF8]">
            {activeRun.scenario_meta?.title || activeRun.location_name}
          </span>

          <span className="rounded bg-[#1E4D43] px-2 py-0.5 font-mono text-[11px] text-[#DDD6C8] border border-[#2D6659]">
            State: {state}
          </span>

          <span className="hidden lg:inline text-[11px] text-[#DDD6C8] font-mono">
            ID: {activeRun.demo_run_id}
          </span>
        </div>

        {/* Center: Persona Quick Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline text-[11px] font-semibold text-[#DDD6C8]">
            {bn ? 'পার্সোনা:' : 'Persona:'}
          </span>
          {['civic', 'analyst', 'operator', 'admin'].map((roleKey) => (
            <button
              key={roleKey}
              onClick={() => onSelectPersona(roleKey)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                persona === roleKey
                  ? 'bg-[#B68A35] text-white shadow-xs font-extrabold'
                  : 'bg-[#1E4D43] text-[#DDD6C8] hover:bg-[#2D6659] hover:text-white'
              }`}
            >
              {roleKey}
            </button>
          ))}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onNextStep}
            disabled={state === 'RESOLVED'}
            className="rounded bg-[#5D7A4E] hover:bg-[#4D6640] disabled:opacity-50 px-2.5 py-1 text-[11px] font-bold text-white flex items-center gap-1 shadow-xs cursor-pointer"
            title={bn ? 'পরবর্তী ধাপে যান' : 'Advance one step'}
          >
            <FastForward className="h-3 w-3" />
            <span className="hidden sm:inline">{bn ? 'পরবর্তী ধাপ' : 'Next Step'}</span>
          </button>
          <button
            onClick={onReset}
            className="rounded bg-[#1E4D43] hover:bg-[#2D6659] px-2 py-1 text-[11px] font-bold text-[#DDD6C8] flex items-center gap-1 cursor-pointer"
            title={bn ? 'রিসেট' : 'Reset'}
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">{bn ? 'রিসেট' : 'Reset'}</span>
          </button>
          <button
            onClick={onOpenModal}
            className="rounded bg-[#B68A35] hover:bg-[#9E7528] px-2.5 py-1 text-[11px] font-bold text-white shadow-xs cursor-pointer"
          >
            {bn ? 'কন্ট্রোল সেন্টার' : 'Control Panel'}
          </button>
          <button
            onClick={onExitDemo}
            className="rounded p-1 text-[#DDD6C8] hover:bg-[#1E4D43] hover:text-white cursor-pointer"
            title={bn ? 'সিমুলেশন বন্ধ করুন' : 'Exit Simulation'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

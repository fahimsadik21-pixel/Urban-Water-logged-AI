import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import type { MainTabType } from './Sidebar';
import {
  Layers,
  Activity,
  Cpu,
  Sliders,
  ShieldCheck,
  Users,
  LogOut,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';

interface QuantumPillNavProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  allowedTabs: MainTabType[];
  fastApiOnline: boolean;
}

export function QuantumPillNav({
  activeTab,
  onSelectTab,
  allowedTabs,
  fastApiOnline,
}: QuantumPillNavProps) {
  const { lang, setLang, t } = useLanguage();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: MainTabType; labelKey: string; icon: any }[] = [
    { id: 'overview' as MainTabType, labelKey: 'nav.overview', icon: LayoutDashboard },
    { id: 'operations', labelKey: 'nav.operations', icon: Layers },
    { id: 'intelligence', labelKey: 'nav.intelligence', icon: Activity },
    { id: 'priority', labelKey: 'nav.priority', icon: Sparkles },
    { id: 'pumps', labelKey: 'nav.pumps', icon: Sliders },
    { id: 'fleet', labelKey: 'nav.fleet', icon: Cpu },
    { id: 'public_sim', labelKey: 'nav.public', icon: Users },
    { id: 'admin', labelKey: 'nav.admin', icon: ShieldCheck },
  ];

  const visibleTabs = navItems.filter(
    (item) => item.id === 'overview' || allowedTabs.includes(item.id)
  );

  return (
    <header className="relative w-full px-3 sm:px-6 pt-3 pb-2 z-50 shrink-0">
      <div className="max-w-6xl mx-auto flex items-center justify-between bg-black/95 text-white rounded-full border border-white/10 px-4 py-2 shadow-2xl backdrop-blur-md">
        {/* 1. Left: Logo + Wordmark */}
        <div
          onClick={() => onSelectTab('overview' as MainTabType)}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          {/* Exact Logo SVG */}
          <svg className="w-6 h-6 shrink-0" viewBox="0 0 26 25" fill="none" aria-label="Urban Water-logged AI">
            <path
              fillRule="evenodd"
              d="M9.45 24.95 L7.07 24.09 L5.56 23.30 L3.33 21.03 L2.31 19.44 L0.74 16.05 L0.27 13.91 L0.29 11.25 L0.80 8.75 L1.95 6.20 L3.26 4.50 L5.15 2.67 L7.77 1.02 L9.91 0.18 L12.16 -0.20 L15.22 -0.16 L17.61 0.35 L19.30 1.06 L20.88 2.06 L22.23 3.37 L24.01 5.48 L24.76 6.58 L25.70 8.63 L26.00 10.35 L26.02 11.35 L25.54 12.12 L24.96 12.32 L22.35 12.36 L21.46 12.18 L20.78 11.85 L20.32 11.37 L19.45 9.56 L17.88 7.58 L16.59 6.60 L14.59 5.84 L13.24 5.69 L11.54 5.93 L10.47 6.44 L9.12 7.35 L7.92 8.50 L6.70 10.55 L6.26 12.65 L6.41 14.36 L7.14 15.86 L8.63 17.79 L12.57 20.70 L12.96 21.60 L13.13 22.82 L12.93 24.36 L12.65 24.86 L12.03 25.35 L11.27 25.42 L9.45 24.95 Z M24.55 25.53 L22.49 24.77 L19.56 23.18 L18.15 22.07 L16.63 20.48 L16.14 19.79 L15.63 18.71 L14.66 15.66 L14.59 14.50 L14.75 13.92 L15.12 13.45 L15.85 13.10 L16.91 12.88 L18.90 12.85 L19.49 13.04 L19.94 13.38 L20.25 13.88 L20.86 15.66 L21.97 17.30 L23.05 18.22 L25.00 19.43 L26.05 20.27 L26.34 20.66 L26.63 21.86 L26.51 23.68 L25.79 25.10 L25.35 25.42 L24.55 25.53 Z"
              fill="#38c6ec"
            />
          </svg>
          <div className="flex items-baseline">
            <span className="text-[17px] font-black tracking-[-0.01em] text-white">
              UrbanAI<sup className="text-[11px] font-black text-cyan-400 relative -top-1.5 left-0.5">2</sup>
            </span>
          </div>
        </div>

        {/* 2. Center: Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {visibleTabs.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`px-3 py-1.5 rounded-full text-[13.5px] font-medium tracking-tight transition cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>

        {/* 3. Right: Language Switcher + Status + CTA */}
        <div className="flex items-center gap-2">
          {/* Language Switcher Pill */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-full p-0.5 text-[11px]">
            <button
              onClick={() => setLang('bn')}
              className={`px-2 py-0.5 rounded-full font-bold transition cursor-pointer ${
                lang === 'bn' ? 'bg-[#38c6ec] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              বাংলা
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded-full font-bold transition cursor-pointer ${
                lang === 'en' ? 'bg-[#38c6ec] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* FastAPI Status Dot */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              fastApiOnline
                ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                : 'border-rose-500/30 bg-rose-950/40 text-rose-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${fastApiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>{fastApiOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* User role chip or Logout button */}
          {user && (
            <div className="hidden md:flex items-center gap-1.5 pl-1.5 border-l border-white/10 text-xs">
              <span className="text-slate-400 text-[11px] font-mono capitalize">
                {user.role}
              </span>
              <button
                onClick={() => void logout()}
                title={t('nav.logout')}
                className="p-1 rounded-full hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* CTA Action button */}
          <button
            onClick={() => onSelectTab(activeTab === 'overview' ? 'operations' : ('overview' as MainTabType))}
            className="hidden sm:inline-flex px-3.5 py-1.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs tracking-tight shadow-md transition cursor-pointer"
          >
            {activeTab === 'overview' ? t('nav.launch_app') : t('nav.overview')}
          </button>

          {/* Mobile Burger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex flex-col justify-center items-center gap-1 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-white"
            aria-label="Toggle menu"
          >
            <span
              className={`w-4 h-0.5 bg-white rounded transition transform ${
                mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''
              }`}
            />
            <span
              className={`w-4 h-0.5 bg-white rounded transition ${
                mobileMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`w-4 h-0.5 bg-white rounded transition transform ${
                mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Nav Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-4 right-4 mt-2 bg-black/95 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-1">
          {visibleTabs.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
                  isActive ? 'bg-cyan-500 text-black font-bold' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(item.labelKey)}
              </button>
            );
          })}
          {user && (
            <button
              onClick={() => {
                void logout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-950/40 mt-1 border-t border-slate-800"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.logout')} ({user.username})
            </button>
          )}
        </div>
      )}
    </header>
  );
}

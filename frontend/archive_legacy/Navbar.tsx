import { useState } from 'react';
import {
  Activity,
  Cpu,
  Gauge,
  LogOut,
  Map,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Users,
  Waves,
  X,
} from 'lucide-react';
import type { AuthUser } from '../types';

interface NavbarProps {
  backendConnected: boolean;
  severeCount: number;
  activeTab: string;
  allowedTabs: string[];
  user: AuthUser;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

const tabDetails: Record<string, { label: string; short: string; icon: typeof Map }> = {
  map: { label: 'Operations map', short: 'Map', icon: Map },
  incidents: { label: 'Response queue', short: 'Incidents', icon: Activity },
  devices: { label: 'Edge nodes', short: 'Devices', icon: Cpu },
  pumps: { label: 'Pump safety', short: 'Pumps', icon: Gauge },
  public: { label: 'Community portal', short: 'Community', icon: Users },
  admin: { label: 'Administration', short: 'Admin', icon: ShieldCheck },
};

export function Navbar({
  backendConnected,
  severeCount,
  activeTab,
  allowedTabs,
  user,
  onTabChange,
  onLogout,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = (tab: string) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  return (
    <header className="relative z-50 shrink-0 border-b border-slate-800 bg-slate-900 text-white shadow-lg">
      <div className="flex h-16 items-center gap-4 px-3 sm:px-5">
        <button type="button" onClick={() => navigate(allowedTabs[0])} className="flex min-w-0 items-center gap-2.5 text-left">
          <span className="rounded-xl bg-blue-600 p-2 shadow-md"><Waves className="h-5 w-5" /></span>
          <span className="hidden min-w-0 lg:block">
            <span className="block truncate text-sm font-bold">Urban Water-logged AI</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Dhaka simulation pilot</span>
          </span>
        </button>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {allowedTabs.map((tab) => {
            const details = tabDetails[tab];
            const Icon = details.icon;
            return (
              <button
                key={tab}
                onClick={() => navigate(tab)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition xl:px-3 ${
                  activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">{details.label}</span>
                <span className="xl:hidden">{details.short}</span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {severeCount > 0 && user.role !== 'civic' && (
            <span className="hidden items-center gap-1 rounded-lg border border-rose-700/60 bg-rose-950/70 px-2 py-1 text-xs font-semibold text-rose-300 sm:flex">
              <ShieldAlert className="h-3.5 w-3.5" /> {severeCount} severe
            </span>
          )}
          <span title={backendConnected ? 'Backend online' : 'Backend offline'} className={`h-2.5 w-2.5 rounded-full ${backendConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <div className="hidden border-l border-slate-700 pl-3 sm:block">
            <p className="max-w-28 truncate text-xs font-bold">{user.username}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">{user.role}</p>
          </div>
          <button onClick={onLogout} className="hidden rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-white sm:block" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
          <button onClick={() => setMobileOpen((value) => !value)} className="rounded-lg border border-slate-700 p-2 text-slate-300 md:hidden" aria-label="Toggle navigation">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="absolute left-0 right-0 top-16 border-b border-slate-800 bg-slate-900 p-3 shadow-2xl md:hidden">
          <div className="grid grid-cols-2 gap-2">
            {allowedTabs.map((tab) => {
              const details = tabDetails[tab];
              const Icon = details.icon;
              return <button key={tab} onClick={() => navigate(tab)} className={`flex items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold ${activeTab === tab ? 'bg-blue-600' : 'bg-slate-800 text-slate-300'}`}><Icon className="h-4 w-4" />{details.label}</button>;
            })}
          </div>
          <button onClick={onLogout} className="mt-3 flex w-full items-center justify-between rounded-lg border border-slate-700 px-3 py-2.5 text-sm text-slate-300"><span>{user.username} · {user.role}</span><span className="flex items-center gap-1 text-rose-300"><LogOut className="h-4 w-4" /> Sign out</span></button>
        </div>
      )}
    </header>
  );
}

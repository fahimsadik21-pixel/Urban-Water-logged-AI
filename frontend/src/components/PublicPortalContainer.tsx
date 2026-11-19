import { useState } from 'react';
import { Compass, FileText, Lock, Zap } from 'lucide-react';
import type { UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { AuditLedgerVerifier } from './AuditLedgerVerifier';
import { CitizenReportingPortal } from './CitizenReportingPortal';
import { HackathonSimulationCenter } from './HackathonSimulationCenter';
import { PublicRoadStatus } from './PublicRoadStatus';

type PortalTab = 'reporting' | 'roads' | 'scenarios' | 'audit';

// Scenarios is strictly accessible ONLY to operator and admin workspaces
const roleTabs: Record<UserRole, PortalTab[]> = {
  civic: ['reporting', 'roads'],
  analyst: ['roads', 'audit'],
  operator: ['reporting', 'roads', 'scenarios', 'audit'],
  admin: ['reporting', 'roads', 'scenarios', 'audit'],
};

const tabMeta: Record<PortalTab, { label: string; labelBn: string; icon: typeof FileText }> = {
  reporting: { label: 'Waterlogging report', labelBn: 'জলাবদ্ধতার রিপোর্ট', icon: FileText },
  roads: { label: 'Road advisories', labelBn: 'সড়ক চলাচল নির্দেশিকা', icon: Compass },
  scenarios: { label: 'Simulation scenarios', labelBn: 'সিমুলেশন সিনারিও', icon: Zap },
  audit: { label: 'Audit verification', labelBn: 'অডিট যাচাই', icon: Lock },
};

export function PublicPortalContainer({ role }: { role: UserRole }) {
  const { lang } = useLanguage();
  const bn = lang === 'bn';
  const tabs = roleTabs[role];
  const [subTab, setSubTab] = useState<PortalTab>(tabs[0]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F5F0E6] text-[#263238] animate-fade-in">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#DDD6C8] bg-[#FFFDF8] px-3 py-2 sm:px-4 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {tabs.map((tab) => {
            const metadata = tabMeta[tab];
            const Icon = metadata.icon;
            const displayLabel = bn ? metadata.labelBn : metadata.label;
            return (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  subTab === tab ? 'bg-[#173D35] text-[#FFFDF8] shadow-xs' : 'text-[#66706B] hover:bg-[#F5F0E6] hover:text-[#263238]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {displayLabel}
              </button>
            );
          })}
        </div>
        <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-[#66706B] sm:inline">{role} workspace</span>
      </div>

      <div className="flex-1 overflow-hidden">
        {subTab === 'reporting' && <CitizenReportingPortal showOperationsFeed={role === 'operator' || role === 'admin'} />}
        {subTab === 'roads' && <PublicRoadStatus />}
        {subTab === 'scenarios' && <HackathonSimulationCenter />}
        {subTab === 'audit' && <AuditLedgerVerifier />}
      </div>
    </div>
  );
}

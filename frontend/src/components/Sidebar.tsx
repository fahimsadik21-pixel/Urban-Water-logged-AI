import React from 'react';
import {
  MapPin,
  Activity,
  ListOrdered,
  Gauge,
  Cpu,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react';
import type { AuthUser } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { CivicWaterLogo } from './CivicWaterLogo';

export type MainTabType =
  | 'overview'
  | 'operations'
  | 'intelligence'
  | 'priority'
  | 'pumps'
  | 'fleet'
  | 'public_sim'
  | 'settings'
  | 'admin';

interface SidebarProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  severeCount: number;
  activeIncidentsCount: number;
  allowedTabs: MainTabType[];
  user: AuthUser;
  onLogout: () => void;
  onOpenSimulationDemo?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  severeCount,
  activeIncidentsCount,
  allowedTabs,
  user,
  onLogout,
  onOpenSimulationDemo: _onOpenSimulationDemo,
}) => {
  const { lang, t } = useLanguage();

  const navItems: { id: MainTabType; label: string; icon: React.ElementType; badge?: string | number; badgeColor?: string }[] = [
    {
      id: 'overview',
      label: t('nav.overview'),
      icon: LayoutDashboard,
    },
    {
      id: 'operations',
      label: t('nav.operations'),
      icon: MapPin,
    },
    {
      id: 'intelligence',
      label: t('nav.intelligence'),
      icon: Activity,
      badge: severeCount > 0 ? (lang === 'bn' ? `${severeCount} ঝুঁকিপূর্ণ` : `${severeCount} Severe`) : undefined,
      badgeColor: 'bg-[#B85042]/20 text-[#B85042] border border-[#B85042]/40',
    },
    {
      id: 'priority',
      label: t('nav.priority'),
      icon: ListOrdered,
      badge: activeIncidentsCount > 0 ? `${activeIncidentsCount}` : undefined,
      badgeColor: 'bg-[#B68A35]/25 text-[#E5C378] border border-[#B68A35]/40',
    },
    {
      id: 'pumps',
      label: t('nav.pumps'),
      icon: Gauge,
    },
    {
      id: 'fleet',
      label: t('nav.fleet'),
      icon: Cpu,
    },
    {
      id: 'public_sim',
      label: t('nav.public'),
      icon: Users,
    },
    {
      id: 'settings',
      label: t('nav.settings'),
      icon: Settings,
    },
    {
      id: 'admin',
      label: t('nav.admin'),
      icon: ShieldCheck,
    },
  ];

  const visibleItems = navItems.filter((item) => allowedTabs.includes(item.id));

  return (
    <aside className="w-16 md:w-64 bg-[#173D35] border-r border-[#24574C] flex flex-col justify-between shrink-0 select-none z-30 transition-all duration-300">
      {/* 1. Header / Logo */}
      <div>
        <div className="p-3 md:p-4 border-b border-[#24574C] flex items-center justify-center md:justify-start gap-3">
          <CivicWaterLogo compact />
          <div className="hidden md:block">
            <h1 className="text-sm font-bold text-[#FFFDF8] tracking-wide leading-none">
              {t('app.title')}
            </h1>
            <span className="text-[10px] text-[#DDD6C8] font-medium tracking-wider uppercase mt-1 block">
              {lang === 'bn' ? 'ঢাকা অপারেশনস' : 'Dhaka operations'}
            </span>
          </div>
        </div>

        {/* 2. Navigation Menu */}
        <nav className="p-2 md:p-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                className={`w-full flex items-center justify-center md:justify-between px-2 md:px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#24574C] text-[#FFFDF8] border-l-4 border-[#B68A35] shadow-sm font-bold pl-2.5'
                    : 'text-[#DDD6C8] hover:text-[#FFFDF8] hover:bg-[#1E4D43]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isActive ? 'text-[#B68A35] scale-110' : 'text-[#DDD6C8]'
                    }`}
                  />
                  <span className="hidden md:inline">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                      item.badgeColor || 'bg-[#1E4D43] text-[#DDD6C8] border border-[#24574C]'
                    } hidden md:inline`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Bottom User Profile & Status */}
      <div className="p-2 md:p-3">
        <div className="hidden md:block bg-[#1E4D43] border border-[#2D6659] rounded-xl p-3 text-[#DDD6C8] shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[#FFFDF8]">{user.username}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B68A35]">{user.role}</p>
            </div>
            <button
              onClick={onLogout}
              title={lang === 'bn' ? 'সাইন আউট' : 'Sign out'}
              className="rounded-lg border border-[#2D6659] p-1.5 text-[#DDD6C8] hover:bg-[#24574C] hover:text-white transition"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <button
          onClick={onLogout}
          title={lang === 'bn' ? 'সাইন আউট' : 'Sign out'}
          className="mb-2 flex w-full items-center justify-center rounded-lg border border-[#2D6659] p-2 text-[#DDD6C8] hover:text-white md:hidden"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};

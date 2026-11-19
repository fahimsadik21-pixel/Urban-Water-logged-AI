import { useState, useEffect, useCallback } from 'react';
import { Bell, Languages, LogOut, RefreshCw, ShieldCheck, Wifi, WifiOff, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { CivicWaterLogo } from './CivicWaterLogo';
import { OperatorNotificationDrawer } from './OperatorNotificationDrawer';
import { apiFetch } from '../lib/api';

interface GovernmentHeaderProps {
  backendConnected: boolean;
  isSyncing: boolean;
  lastSyncedTime: string;
  onSync: () => void;
  onOpenSimulationDemo?: () => void;
  onStartVideoTour?: () => void;
}

export function GovernmentHeader({
  backendConnected,
  isSyncing,
  lastSyncedTime,
  onSync,
  onOpenSimulationDemo: _onOpenSimulationDemo,
  onStartVideoTour,
}: GovernmentHeaderProps) {
  const { user, logout } = useAuth();
  const { lang, setLang } = useLanguage();
  const bn = lang === 'bn';

  const [showDrawer, setShowDrawer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user || (user.role !== 'operator' && user.role !== 'admin')) return;
    try {
      const res = await apiFetch<{ unread_count: number }>('/api/v1/operator/notifications');
      setUnreadCount(res.unread_count ?? 0);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    void fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const canReceiveNotifications = user && (user.role === 'operator' || user.role === 'admin');

  return (
    <>
      <header className="border-b border-[#DDD6C8] bg-[#FFFDF8] px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <CivicWaterLogo lightHeader />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight text-[#263238] sm:text-base">Urban Water-logged AI</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#173D35] sm:text-[11px]">
                {bn ? 'ঢাকা সিটি কর্পোরেশন জলাবদ্ধতা প্রতিক্রিয়া প্ল্যাটফর্ম' : 'Dhaka municipal waterlogging response platform'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setLang(bn ? 'en' : 'bn')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDD6C8] bg-[#FFFDF8] px-2.5 py-2 text-xs font-bold text-[#263238] hover:bg-[#F5F0E6] hover:border-[#173D35] transition focus:outline-none focus:ring-2 focus:ring-[#173D35]"
              aria-label={bn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            >
              <Languages className="h-4 w-4 text-[#173D35]" />
              <span className="hidden sm:inline">{bn ? 'English' : 'বাংলা'}</span>
              <span className="sm:hidden">{bn ? 'EN' : 'বাং'}</span>
            </button>
            <span className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold sm:inline-flex border ${backendConnected ? 'bg-[#5D7A4E]/10 text-[#5D7A4E] border-[#5D7A4E]/30' : 'bg-[#B85042]/10 text-[#B85042] border-[#B85042]/30'}`}>
              {backendConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {backendConnected ? (bn ? 'সিস্টেম সংযুক্ত' : 'System connected') : (bn ? 'সিস্টেম সংযোগ নেই' : 'System unavailable')}
            </span>
            <button type="button" onClick={onSync} disabled={isSyncing} className="inline-flex items-center gap-1.5 rounded-lg bg-[#173D35] px-2.5 py-2 text-xs font-bold text-[#FFFDF8] hover:bg-[#1E4D43] disabled:opacity-60 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#173D35]">
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{bn ? `হালনাগাদ: ${lastSyncedTime}` : `Refresh: ${lastSyncedTime}`}</span>
            </button>

            {onStartVideoTour && (
              <button
                type="button"
                onClick={onStartVideoTour}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#B68A35] hover:bg-[#9E7528] px-3 py-2 text-xs font-bold text-white transition-all shadow-sm hover:shadow hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#B68A35]"
                title={bn ? 'হ্যাকাতন ভিডিও ডেমো ট্যুর শুরু করুন' : 'Start Video Demo Tour for Hackathon'}
              >
                <Activity className="h-3.5 w-3.5 text-white" />
                <span>{bn ? 'ভিডিও ডেমো ট্যুর' : 'Video Demo Tour'}</span>
              </button>
            )}

            {canReceiveNotifications && (
              <button
                type="button"
                onClick={() => setShowDrawer(true)}
                className="relative p-2 rounded-lg border border-[#DDD6C8] bg-[#FFFDF8] hover:bg-[#F5F0E6] text-[#263238] focus:outline-none focus:ring-2 focus:ring-[#173D35] transition"
                title={bn ? 'অপারেটর ইনবক্স' : 'Operator Notifications Inbox'}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            {user && (
              <button type="button" onClick={() => void logout()} className="hidden items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-bold text-slate-700 hover:border-rose-400 hover:text-rose-700 lg:inline-flex" title={bn ? 'সাইন আউট' : 'Sign out'}>
                <ShieldCheck className="h-3.5 w-3.5" /> {user.role}
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {canReceiveNotifications && (
        <OperatorNotificationDrawer
          isOpen={showDrawer}
          onClose={() => {
            setShowDrawer(false);
            void fetchUnread();
          }}
          onRefreshNeeded={() => {
            void fetchUnread();
            onSync();
          }}
        />
      )}
    </>
  );
}

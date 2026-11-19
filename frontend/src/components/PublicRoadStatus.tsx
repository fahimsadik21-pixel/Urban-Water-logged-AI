import React, { useState, useEffect } from 'react';
import type { PublicRoadAdvisory } from '../types';
import { apiFetch } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  RefreshCw,
  Clock,
  Compass,
  Waves,
} from 'lucide-react';

export const PublicRoadStatus: React.FC = () => {
  const { lang, formatNumber } = useLanguage();
  const bn = lang === 'bn';
  const [advisories, setAdvisories] = useState<PublicRoadAdvisory[]>(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('uwai_public_advisories') : null;
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('uwai_public_advisories') : null;
      return !raw;
    } catch {
      return true;
    }
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchStatus = async () => {
    try {
      const data = await apiFetch<PublicRoadAdvisory[]>('/api/v1/public/status');
      if (Array.isArray(data) && data.length > 0) {
        setAdvisories(data);
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('uwai_public_advisories', JSON.stringify(data));
          }
        } catch {
          // ignore storage quota error
        }
      }
    } catch (err: any) {
      console.warn('Failed to load public road status:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredAdvisories = advisories.filter((adv) => {
    if (statusFilter !== 'ALL' && adv.road_passability.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const name = (adv.road_name || '').toLowerCase();
      const nameBn = (adv.road_name_bn || '').toLowerCase();
      const zone = (adv.zone_name || '').toLowerCase();
      const zoneBn = (adv.zone_name_bn || '').toLowerCase();
      const advTxt = (adv.advisory || '').toLowerCase();
      const advBn = (adv.safe_route_suggestion_bn || '').toLowerCase();
      return (
        name.includes(q) ||
        nameBn.includes(q) ||
        zone.includes(q) ||
        zoneBn.includes(q) ||
        advTxt.includes(q) ||
        advBn.includes(q)
      );
    }
    return true;
  });

  const getPassabilityBadge = (passability: string) => {
    const p = passability.toLowerCase();
    if (p.includes('impassable') || p.includes('closed')) {
      return 'bg-[#B85042]/15 text-[#B85042] border-[#B85042]/40';
    } else if (p.includes('slow') || p.includes('restricted') || p.includes('caution')) {
      return 'bg-[#B68A35]/15 text-[#B68A35] border-[#B68A35]/40';
    }
    return 'bg-[#5D7A4E]/15 text-[#5D7A4E] border-[#5D7A4E]/40';
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F0E6] text-[#263238] overflow-y-auto p-4 space-y-4 font-sans animate-fade-in">
      {/* Header Bar */}
      <div className="border-b border-[#DDD6C8] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-[#173D35]" />
            <h2 className="text-base font-bold text-[#173D35]">
              {bn ? 'ঢাকা পাবলিক সড়ক চলাচল ও ট্রাভেল নির্দেশিকা' : 'Dhaka Public Road Passability & Travel Advisory'}
            </h2>
          </div>
          <p className="text-xs text-[#66706B] mt-1">
            {bn
              ? 'নাগরিকদের রিয়েল-টাইম ট্রাফিক ও জলাবদ্ধতা নির্দেশিকা, পানির গভীরতা এবং নিরাপদ বিকল্প রুট।'
              : 'Real-time citizen traffic advisories, floodwater passability levels, and estimated clearance intervals.'}
          </p>
        </div>

        <button
          onClick={fetchStatus}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFDF8] hover:bg-[#F5F0E6] border border-[#DDD6C8] rounded-lg text-xs font-semibold text-[#173D35] transition-colors shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#173D35]' : ''}`} />
          <span>{bn ? 'স্ট্যাটাস রিফ্রেশ' : 'Refresh Status'}</span>
        </button>
      </div>

      {/* Privacy & Safety Sanitization Notice */}
      <div className="bg-[#FFFDF8] border border-[#DDD6C8] p-3 rounded-xl flex items-center justify-between text-xs text-[#66706B] shadow-xs">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-[#5D7A4E] shrink-0" />
          <span>
            <strong className="text-[#263238]">
              {bn ? 'নাগরিক তথ্য সুরক্ষা নিশ্চিতকরণ' : 'Public Sanitization Guaranteed'}
            </strong>
            : {bn
              ? 'ব্যক্তিগত সিসিটিভি ফুটেজ ও পৌর পাম্প নিয়ন্ত্রণ কমান্ড এই পাবলিক পোর্টাল থেকে সম্পূর্ণ বিচ্ছিন্ন রাখা হয়েছে।'
              : 'Private CCTV feeds, raw facial/plate telemetry, and municipal dewatering pump controls are strictly isolated from this public portal.'}
          </span>
        </div>
        <span className="text-[10px] text-[#B68A35] font-semibold shrink-0 ml-3">
          Simulation Benchmark
        </span>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-[#FFFDF8] p-2.5 rounded-xl border border-[#DDD6C8] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#66706B]" />
          <input
            type="text"
            placeholder={bn ? 'সড়কের নাম বা ঢাকা জোন খুঁজুন...' : 'Search road name or Dhaka zone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F5F0E6] border border-[#DDD6C8] rounded-lg pl-8 pr-3 py-1 text-xs text-[#263238] placeholder-[#66706B] focus:outline-none focus:border-[#173D35]"
          />
        </div>

        <div className="flex items-center space-x-1.5 text-xs w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-[#173D35] text-white shadow-xs' : 'bg-[#F5F0E6] text-[#66706B] hover:text-[#263238]'
            }`}
          >
            {bn ? `সকল সড়ক (${formatNumber(advisories.length)})` : `All Roads (${advisories.length})`}
          </button>
          <button
            onClick={() => setStatusFilter('Closed')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              statusFilter === 'Closed' ? 'bg-[#B85042] text-white shadow-xs' : 'bg-[#F5F0E6] text-[#B85042] hover:text-[#B85042]'
            }`}
          >
            {bn ? 'চলাচল বন্ধ' : 'Impassable / Closed'}
          </button>
          <button
            onClick={() => setStatusFilter('Restricted')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              statusFilter === 'Restricted' ? 'bg-[#B68A35] text-white shadow-xs' : 'bg-[#F5F0E6] text-[#B68A35] hover:text-[#B68A35]'
            }`}
          >
            {bn ? 'সীমিত / সতর্কতা' : 'Caution / Slow'}
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && advisories.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <div key={k} className="h-44 bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-4 space-y-3">
              <div className="h-4 bg-[#DDD6C8]/40 rounded w-2/3" />
              <div className="h-3 bg-[#DDD6C8]/30 rounded w-1/3" />
              <div className="h-14 bg-[#F5F0E6] rounded-lg" />
              <div className="h-3 bg-[#DDD6C8]/30 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Advisory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredAdvisories.map((adv, idx) => {
          const roadTitle = bn && adv.road_name_bn ? adv.road_name_bn : adv.road_name;
          const zoneTitle = bn && adv.zone_name_bn ? adv.zone_name_bn : adv.zone_name;
          const passBadge = bn && adv.passability_bn ? adv.passability_bn : adv.road_passability;
          const adviceTxt = bn && adv.safe_route_suggestion_bn ? adv.safe_route_suggestion_bn : adv.advisory;
          const delayBadge = bn && adv.delay_label_bn ? adv.delay_label_bn : adv.delay_label;
          const depth = adv.water_depth_cm !== undefined ? adv.water_depth_cm : 18.5;

          return (
            <div
              key={idx}
              className="bg-[#FFFDF8] border border-[#DDD6C8] p-4 rounded-xl flex flex-col justify-between space-y-3 hover:border-[#173D35]/50 transition-all shadow-xs gov-card-hover"
            >
              <div>
                {/* Road Name & Passability */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <h3 className="font-bold text-sm text-[#263238]">{roadTitle}</h3>
                    <span className="text-[11px] text-[#66706B] font-mono">{zoneTitle}</span>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border tracking-wider shrink-0 ${getPassabilityBadge(
                      adv.road_passability
                    )}`}
                  >
                    {passBadge}
                  </span>
                </div>

                {/* Depth & Delay Badges */}
                <div className="flex items-center gap-2 mt-1 mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-bold bg-[#173D35]/10 text-[#173D35] border border-[#173D35]/30">
                    <Waves className="w-3 h-3 text-[#173D35]" />
                    <span>{bn ? `পানির স্তর: ${formatNumber(depth)} সেমি` : `Depth: ${depth} cm`}</span>
                  </span>

                  {delayBadge && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-semibold bg-[#B68A35]/15 text-[#B68A35] border border-[#B68A35]/30">
                      <Clock className="w-3 h-3 text-[#B68A35]" />
                      <span>{delayBadge}</span>
                    </span>
                  )}
                </div>

                {/* Safe Alternative / Advisory Text */}
                <p className="text-xs text-[#263238] leading-relaxed font-sans bg-[#F5F0E6] p-2.5 rounded-lg border border-[#DDD6C8] mt-1">
                  {adviceTxt}
                </p>
              </div>

              {/* Bottom Row: Debris & Clearance ETA */}
              <div className="space-y-1.5 pt-2 border-t border-[#DDD6C8] text-[11px]">
                <div className="flex items-center justify-between text-[#66706B]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#173D35] shrink-0" />
                    <span className="truncate max-w-[200px]" title={adv.estimated_clearance_notice}>
                      {adv.estimated_clearance_notice || (bn ? 'নিষ্কাশন কার্যক্রম চলমান' : 'Clearance underway')}
                    </span>
                  </span>
                  <span className="text-[10px] font-semibold text-[#66706B]">
                    {adv.severity_level}
                  </span>
                </div>

                {adv.debris_hazard_present && (
                  <div className="text-[10px] text-[#B68A35] bg-[#B68A35]/15 border border-[#B68A35]/40 px-2 py-1 rounded-lg flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#B68A35] shrink-0" />
                    <span>
                      {bn && adv.trash_notice_bn
                        ? adv.trash_notice_bn
                        : 'ড্রেনের মুখে কঠিন বর্জ্য ও পলিথিন জমার তথ্য পাওয়া গেছে। সাবধানে গাড়ি চালান।'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!loading && filteredAdvisories.length === 0 && (
          <div className="col-span-full p-8 text-center text-xs text-[#66706B]">
            {bn ? 'বর্তমান ফিল্টারে কোনো সড়ক পাওয়া যায়নি।' : 'No roads matching current filter.'}
          </div>
        )}
      </div>
    </div>
  );
};

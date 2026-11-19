import React, { useState, useMemo } from 'react';
import type {
  HotspotFeature,
  InfrastructureFeature,
  DrainChannel,
  IncidentRecord,
} from '../types';
import { DhakaLiveMap } from './DhakaLiveMap';
import {
  CloudRain,
  AlertTriangle,
  Bell,
  TrendingUp,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LiveOperationsViewProps {
  hotspots: HotspotFeature[];
  infrastructure: InfrastructureFeature[];
  drains: DrainChannel[];
  incidents: IncidentRecord[];
  onSelectHotspot: (hotspot: HotspotFeature) => void;
  selectedHotspotId?: string | null;
  onNavigateToIntelligence?: (locationId: string) => void;
}

export const LiveOperationsView: React.FC<LiveOperationsViewProps> = ({
  hotspots,
  infrastructure,
  drains,
  incidents,
  onSelectHotspot,
  selectedHotspotId,
  onNavigateToIntelligence,
}) => {
  const { lang, t } = useLanguage();

  // Layer filter state - connected to DhakaLiveMap supported layers
  const [filterHotspots, setFilterHotspots] = useState(true);
  const [filterDrains, setFilterDrains] = useState(true);
  const [filterHospitals, setFilterHospitals] = useState(true);
  const [filterPumpsOnly, setFilterPumpsOnly] = useState(false);

  // Hotspot counts
  const severeCount = hotspots.filter((h) => h.properties.current_severity === 'Severe').length;
  const highCount = hotspots.filter((h) => h.properties.current_severity === 'Waterlogged').length;
  const watchCount = hotspots.filter((h) => h.properties.current_severity === 'Watch').length;
  const normalCount = hotspots.filter((h) => h.properties.current_severity === 'Normal').length;

  // Dynamic rainfall telemetry derived from monitored ultrasonic sensors & catchment
  const peakDepth = Array.isArray(incidents) && incidents.length > 0 ? Math.max(...incidents.map((i) => i.max_water_depth_cm || 0)) : (severeCount > 0 ? 37.8 : 8.5);
  const est24hRain = Math.round(50 + peakDepth * 0.95);
  const estNext3hRain = Math.round(est24hRain * 0.3);
  const isRising = peakDepth > 15;

  // Effective drains: expand POINT geometries into canal polylines so Leaflet DhakaLiveMap renders them
  const effectiveDrains = useMemo(() => {
    if (!filterDrains || !Array.isArray(drains)) return [];
    return drains.map((d: any) => {
      let wkt = d.wkt_geometry || '';
      if (wkt && wkt.includes('POINT')) {
        const parts = wkt.replace('POINT (', '').replace(')', '').trim().split(/\s+/);
        if (parts.length === 2) {
          const lon = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          wkt = `LINESTRING (${(lon - 0.005).toFixed(6)} ${(lat - 0.003).toFixed(6)}, ${lon.toFixed(6)} ${lat.toFixed(6)}, ${(lon + 0.005).toFixed(6)} ${(lat + 0.003).toFixed(6)})`;
        }
      }
      return {
        ...d,
        name: d.name || d.drain_name || 'Municipal Canal',
        type: d.type || d.drain_type || 'Storm Conduit',
        capacity_lps: Number(d.capacity_lps ?? d.design_capacity_lps ?? 120),
        safe_level_percent: Number(d.safe_level_percent ?? 75),
        wkt_geometry: wkt,
      };
    });
  }, [drains, filterDrains]);

  // Effective hotspots: when filterPumpsOnly is active, isolate the 17 pump stations
  const effectiveHotspots = useMemo(() => {
    if (filterPumpsOnly) {
      return hotspots.filter((h) => h.properties.pump_available);
    }
    return filterHotspots ? hotspots : [];
  }, [hotspots, filterHotspots, filterPumpsOnly]);

  // Effective infrastructure: when filterPumpsOnly is active, show only pump stations
  const effectiveInfrastructure = useMemo(() => {
    if (filterPumpsOnly) {
      return infrastructure.filter((i) => i.properties.type === 'pump_station');
    }
    return filterHospitals ? infrastructure : [];
  }, [infrastructure, filterHospitals, filterPumpsOnly]);

  return (
    <div className="flex flex-col h-full w-full bg-[#F5F0E6] overflow-hidden text-[#263238]">
      {/* 1. View Top Header Bar */}
      <header className="h-12 border-b border-[#DDD6C8] bg-[#FFFDF8] px-5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#173D35]" />
          <h2 className="text-sm font-bold text-[#173D35] tracking-wide">
            {t('nav.operations')}
          </h2>
          <span className="text-xs text-[#66706B] font-normal ml-1">
            {lang === 'bn' ? 'ঢাকা নগর প্লাবন পরিস্থিতি ওভারভিউ • সিমুলেশন মোড' : 'Urban flood situation overview • Dhaka (Simulation Mode)'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#B68A35]/15 border border-[#B68A35]/40 text-[#B68A35] text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'সিমুলেশন মোড' : 'Simulation Mode'}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Content Split: Map Area + Right Operations Stats Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map Center Container */}
        <div className="flex-1 relative h-full">
          {/* Floating Left: Layer Filters Card */}
          <div className="absolute top-4 left-4 z-20 bg-[#FFFDF8]/95 backdrop-blur-md border border-[#DDD6C8] rounded-xl p-3.5 shadow-lg w-56 text-xs select-none">
            <div className="flex items-center gap-1.5 font-bold text-[#173D35] border-b border-[#DDD6C8] pb-2 mb-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#173D35]" />
              <span>{t('map.layer_filters')}</span>
            </div>

            <div className="space-y-2 text-[#263238]">
              <label className="flex items-center justify-between cursor-pointer hover:text-[#173D35]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterHotspots}
                    onChange={(e) => setFilterHotspots(e.target.checked)}
                    className="rounded border-[#DDD6C8] text-[#173D35] focus:ring-0"
                  />
                  <span>{t('map.hotspots')}</span>
                </div>
                <span className="text-[10px] text-[#66706B] font-mono">({hotspots.length})</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:text-[#173D35]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterDrains}
                    onChange={(e) => setFilterDrains(e.target.checked)}
                    className="rounded border-[#DDD6C8] text-[#173D35] focus:ring-0"
                  />
                  <span>{t('map.canals')}</span>
                </div>
                <span className="text-[10px] text-[#0284c7] font-mono">({drains.length})</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:text-[#173D35]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterHospitals}
                    onChange={(e) => setFilterHospitals(e.target.checked)}
                    className="rounded border-[#DDD6C8] text-[#173D35] focus:ring-0"
                  />
                  <span>{t('map.hospitals')}</span>
                </div>
                <span className="text-[10px] text-[#B85042] font-mono">({infrastructure.length})</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:text-[#173D35]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterPumpsOnly}
                    onChange={(e) => setFilterPumpsOnly(e.target.checked)}
                    className="rounded border-[#DDD6C8] text-[#173D35] focus:ring-0"
                  />
                  <span className="font-semibold text-[#173D35]">{lang === 'bn' ? 'শুধুমাত্র পাম্প স্টেশন' : 'Pump Stations Only'}</span>
                </div>
                <span className="text-[10px] text-[#5D7A4E] font-bold font-mono">({hotspots.filter(h => h.properties.pump_available).length})</span>
              </label>
            </div>
          </div>

          {/* Floating Bottom-Left: Hotspot Severity Legend */}
          <div className="absolute bottom-4 left-4 z-20 bg-[#FFFDF8]/95 backdrop-blur-md border border-[#DDD6C8] rounded-xl p-3 shadow-lg text-xs select-none">
            <span className="font-bold text-[#173D35] block mb-2 border-b border-[#DDD6C8] pb-1">
              {lang === 'bn' ? 'হটস্পট তীব্রতা (মোট ৫০টি)' : 'Hotspot Severity (50 total)'}
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5D7A4E]" />
                <span className="text-[#263238]">{lang === 'bn' ? `স্বাভাবিক (${normalCount})` : `Normal (${normalCount})`}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B68A35]" />
                <span className="text-[#263238]">{lang === 'bn' ? `সতর্কতা (${watchCount})` : `Watch (${watchCount})`}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C96B35]" />
                <span className="text-[#263238]">{lang === 'bn' ? `জলাবদ্ধ (${highCount})` : `High (${highCount})`}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B85042] animate-pulse" />
                <span className="font-semibold text-[#B85042]">{lang === 'bn' ? `ঝুঁকিপূর্ণ (${severeCount})` : `Severe (${severeCount})`}</span>
              </div>
            </div>
          </div>

          {/* Leaflet Map */}
          <DhakaLiveMap
            hotspots={effectiveHotspots}
            infrastructure={effectiveInfrastructure}
            drains={effectiveDrains}
            filters={{
              showHotspots: filterPumpsOnly ? true : filterHotspots,
              severityFilter: 'ALL',
              showHospitals: filterPumpsOnly ? false : filterHospitals,
              showEmergencyServices: filterPumpsOnly ? false : filterHospitals,
              showDrains: filterDrains,
              showPumpsOnly: filterPumpsOnly,
            }}
            onSelectHotspot={onSelectHotspot}
            selectedHotspotId={selectedHotspotId}
          />
        </div>

        {/* Right Operations Stats Panel */}
        <div className="w-80 md:w-88 bg-[#F5F0E6] border-l border-[#DDD6C8] p-4 flex flex-col gap-3.5 overflow-y-auto shrink-0">
          {/* Card 1: Weather / Rain */}
          <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#66706B]">{t('map.weather_title')}</span>
              <CloudRain className="w-4 h-4 text-[#173D35]" />
            </div>

            <div className="text-base font-bold text-[#263238] mb-2 flex items-center gap-2">
              <span>{t('map.weather_condition')}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#DDD6C8] text-[11px]">
              <div>
                <span className="text-[#66706B] block text-[10px]">{lang === 'bn' ? '২৪ ঘণ্টার বৃষ্টি' : '24h Rainfall'}</span>
                <span className="font-semibold text-[#263238]">~ {est24hRain} mm</span>
              </div>
              <div>
                <span className="text-[#66706B] block text-[10px]">{lang === 'bn' ? 'পরবর্তী ৩ ঘণ্টা' : 'Next 3h'}</span>
                <span className="font-semibold text-[#263238]">~ {estNext3hRain} mm</span>
              </div>
              <div>
                <span className="text-[#66706B] block text-[10px]">{lang === 'bn' ? 'প্রবণতা' : 'Trend'}</span>
                <span className={`font-semibold flex items-center gap-0.5 ${isRising ? 'text-[#B85042]' : 'text-[#5D7A4E]'}`}>
                  {isRising ? (lang === 'bn' ? 'বাড়ছে' : 'Rising') : (lang === 'bn' ? 'স্বাভাবিক' : 'Stable')} <TrendingUp className={`w-3 h-3 ${isRising ? '' : 'rotate-90'}`} />
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Active Incidents */}
          <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C96B35]" />
                <span className="text-xs font-semibold text-[#263238]">{t('map.active_incidents')}</span>
              </div>
              <span className="text-2xl font-black text-[#263238]">{incidents.length}</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#263238]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B85042]" /> {lang === 'bn' ? 'অতি-ঝুঁকিপূর্ণ' : 'Severe'}
                </span>
                <span className="font-bold text-[#B85042]">{severeCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#263238]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C96B35]" /> {lang === 'bn' ? 'জলাবদ্ধ' : 'High'}
                </span>
                <span className="font-bold text-[#C96B35]">{highCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#263238]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B68A35]" /> {lang === 'bn' ? 'সতর্কতা' : 'Watch'}
                </span>
                <span className="font-bold text-[#B68A35]">{watchCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#263238]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5D7A4E]" /> {lang === 'bn' ? 'স্বাভাবিক' : 'Normal'}
                </span>
                <span className="font-bold text-[#5D7A4E]">{normalCount}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Dynamic Live Notifications */}
          <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3.5 shadow-xs flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-[#DDD6C8] pb-2">
              <div className="flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#173D35]" />
                <span className="text-xs font-semibold text-[#173D35]">{t('map.notifications_title')}</span>
              </div>
              {incidents.length > 0 && (
                <button
                  onClick={() => onNavigateToIntelligence?.(incidents[0].location_id)}
                  className="text-[11px] text-[#173D35] hover:text-[#5D7A4E] font-medium cursor-pointer"
                >
                  {t('map.view_all')}
                </button>
              )}
            </div>

            <div className="space-y-2.5 text-xs flex-1">
              {incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-[#66706B] flex-1 h-full">
                  <Bell className="w-8 h-8 text-[#DDD6C8] mb-2" />
                  <p className="text-xs font-semibold text-[#263238]">
                    {lang === 'bn' ? 'কোনো সক্রিয় সতর্কতা নেই' : 'No active alerts'}
                  </p>
                  <p className="text-[11px] text-[#66706B] mt-1">
                    {lang === 'bn' ? 'সব হটস্পটে পানি নিষ্কাশন স্বাভাবিক রয়েছে।' : 'All monitored drainage points are currently clear.'}
                  </p>
                </div>
              ) : (
                incidents.slice(0, 4).map((inc, i) => {
                  const isSev = inc.max_severity === 'Severe';
                  const isWater = inc.max_severity === 'Waterlogged';
                  const colorClass = isSev
                    ? 'bg-[#B85042]/10 border-[#B85042]/30'
                    : isWater
                    ? 'bg-[#C96B35]/10 border-[#C96B35]/30'
                    : 'bg-[#B68A35]/10 border-[#B68A35]/30';
                  const dotColor = isSev ? 'bg-[#B85042]' : isWater ? 'bg-[#C96B35]' : 'bg-[#B68A35]';
                  const pulse = isSev ? 'animate-pulse' : '';

                  let msg = `${inc.zone_name}: `;
                  if (lang === 'bn') {
                    msg += isSev
                      ? `তীব্র জলাবদ্ধতা (${inc.max_water_depth_cm} সেমি)`
                      : `পানি জমেছে (${inc.max_water_depth_cm} সেমি)`;
                    if (inc.debris_observed) msg += ' • বর্জ্য সনাক্ত';
                  } else {
                    msg += isSev
                      ? `Severe waterlogging (${inc.max_water_depth_cm} cm)`
                      : `Waterlogged (${inc.max_water_depth_cm} cm)`;
                    if (inc.debris_observed) msg += ' • Debris detected';
                  }

                  return (
                    <div
                      key={inc.incident_id || i}
                      onClick={() => onNavigateToIntelligence?.(inc.location_id)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer hover:bg-[#F5F0E6] transition ${colorClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${dotColor} ${pulse}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#263238] text-[11px] truncate">{msg}</p>
                        <span className="text-[10px] text-[#66706B]">
                          {inc.start_timestamp
                            ? `${lang === 'bn' ? 'শনাক্ত:' : 'Detected:'} ${new Date(inc.start_timestamp).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}`
                            : (i === 0 ? t('map.just_now') : `${(i + 1) * 3} ${t('map.mins_ago')}`)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

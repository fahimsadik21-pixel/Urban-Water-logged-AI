import React, { useState, useEffect, useMemo } from 'react';
import type { PumpStationRecord, PumpOperatingMode } from '../types';
import { apiFetch } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Play,
  Square,
  RotateCcw,
  Sliders,
  Gauge,
  Clock,
  Thermometer,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Waves,
  RefreshCw,
  Lock,
  Search,
  Truck,
  Building2,
  Fuel,
  Radio,
  X,
  Compass,
} from 'lucide-react';

export const PumpConsole: React.FC = () => {
  const { lang } = useLanguage();
  const [pumps, setPumps] = useState<PumpStationRecord[]>([]);
  const [selectedPumpId, setSelectedPumpId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'danger' | 'info'; text: string; hash?: string } | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Filter & Search states
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'permanent' | 'mobile' | 'queue'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Simulation controls state for selected pump
  const [simDepth, setSimDepth] = useState<number>(18.5);
  const [simDrain, setSimDrain] = useState<number>(45.0);
  const [simTemp, setSimTemp] = useState<number>(42.0);
  const [simPipeBlocked, setSimPipeBlocked] = useState<boolean>(false);
  const [simDryRun, setSimDryRun] = useState<boolean>(false);

  const fetchPumps = async () => {
    try {
      const data = await apiFetch<PumpStationRecord[]>('/api/v1/pumps/');
      setPumps((prevPumps) => {
        if (prevPumps.length === 0) return data;
        return data.map((d) => {
          const current = prevPumps.find((p) => p.pump_id === d.pump_id);
          if (current && current.pump_state === 'ON') {
            return {
              ...d,
              pump_state: 'ON' as const,
              source_water_depth_cm: current.source_water_depth_cm,
              eta_minutes_min: current.eta_minutes_min,
              eta_minutes_max: current.eta_minutes_max,
              queue_status: 'ACTIVE_PUMPING' as const,
            };
          }
          return d;
        });
      });
      setSelectedPumpId((prev) => {
        if (prev && data.some((p) => p.pump_id === prev)) {
          return prev;
        }
        return data.length > 0 ? data[0].pump_id : null;
      });
    } catch (err: any) {
      console.warn('Failed to load pumps:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPumps();
    const interval = setInterval(fetchPumps, 8000);
    return () => clearInterval(interval);
  }, []);

  // Active water level receding and clearance simulation loop (Dynamic cm & ETA countdown)
  useEffect(() => {
    const drainInterval = setInterval(() => {
      setPumps((prevPumps) => {
        let hasChanges = false;
        const updated = prevPumps.map((pump) => {
          if (pump.pump_state === 'ON') {
            hasChanges = true;
            const currentDepth = pump.source_water_depth_cm;
            const newDepth = Math.max(3.8, Number((currentDepth - 0.6).toFixed(1)));
            const newEta = Math.max(0, Math.round(newDepth * 2.8));

            // Check if clearance complete (safe depth <= 4.0 cm reached)
            if (newDepth <= 4.0) {
              void apiFetch(`/api/v1/pumps/${pump.pump_id}/command`, {
                method: 'POST',
                body: JSON.stringify({
                  command: 'STOP',
                  operating_mode: pump.operating_mode,
                  operator_confirmed: true,
                }),
              }).catch(() => {});

              setActionNotice({
                type: 'success',
                text:
                  lang === 'bn'
                    ? `পানি নিষ্কাশন সম্পন্ন! ${pump.zone_name}-এ পানির স্তর নিরাপদ সীমায় (${newDepth} সেমি) নেমে এসেছে। পাম্প স্বয়ংক্রিয়ভাবে বন্ধ করা হয়েছে এবং কিউ থেকে নিষ্ক্রান্ত হয়েছে।`
                    : `Dewatering Completed! Water level in ${pump.zone_name} has receded to safe limit (${newDepth} cm). Pump automatically shut off and cleared from queue.`,
              });

              return {
                ...pump,
                pump_state: 'OFF' as const,
                source_water_depth_cm: newDepth,
                eta_minutes_min: 0,
                eta_minutes_max: 0,
                queue_status: 'STANDBY' as const,
              };
            }

            return {
              ...pump,
              source_water_depth_cm: newDepth,
              eta_minutes_min: newEta,
              eta_minutes_max: Math.round(newEta * 1.5),
              queue_status: 'ACTIVE_PUMPING' as const,
            };
          }
          return pump;
        });

        return hasChanges ? updated : prevPumps;
      });
    }, 2000);

    return () => clearInterval(drainInterval);
  }, [lang]);

  // Filtered pump list based on category & search query
  const filteredPumps = useMemo(() => {
    return pumps.filter((p) => {
      // 1. Category Filter
      if (categoryFilter === 'permanent' && p.asset_type !== 'permanent_station') return false;
      if (categoryFilter === 'mobile' && p.asset_type !== 'mobile_unit') return false;
      if (categoryFilter === 'queue' && (!p.queue_status || p.queue_status === 'STANDBY')) return false;

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesZone = p.zone_name.toLowerCase().includes(q);
        const matchesLoc = p.location_id.toLowerCase().includes(q);
        const matchesPumpId = p.pump_id.toLowerCase().includes(q);
        const matchesName = (p.pump_name || '').toLowerCase().includes(q);
        const matchesCrew = (p.assigned_crew || '').toLowerCase().includes(q);
        return matchesZone || matchesLoc || matchesPumpId || matchesName || matchesCrew;
      }
      return true;
    });
  }, [pumps, categoryFilter, searchQuery]);

  const selectedPump = pumps.find((p) => p.pump_id === selectedPumpId) || filteredPumps[0] || pumps[0] || null;

  // Counts for filter pills
  const permCount = useMemo(() => pumps.filter((p) => p.asset_type === 'permanent_station').length, [pumps]);
  const mobCount = useMemo(() => pumps.filter((p) => p.asset_type === 'mobile_unit').length, [pumps]);
  const queueCount = useMemo(() => pumps.filter((p) => p.queue_status && p.queue_status !== 'STANDBY').length, [pumps]);

  // Change selected pump and sync slider states
  const handleSelectPump = (pump: PumpStationRecord) => {
    setSelectedPumpId(pump.pump_id);
    setSimDepth(pump.source_water_depth_cm);
    setSimDrain(pump.destination_drain_level_percent);
    setSimTemp(pump.motor_temperature_c);
    setSimPipeBlocked(pump.pipe_blocked);
    setSimDryRun(pump.dry_run_detected);
    setActionNotice(null);
  };

  // 1. Mode Change & Pump Start/Stop Command (Step 3.3.1)
  const handlePumpCommand = async (command: 'START' | 'STOP', targetMode?: PumpOperatingMode) => {
    if (!selectedPump) return;
    try {
      setIsExecuting(true);
      setActionNotice(null);
      const mode = targetMode || selectedPump.operating_mode;

      const data = await apiFetch<any>(`/api/v1/pumps/${selectedPump.pump_id}/command`, {
        method: 'POST',
        body: JSON.stringify({
          command,
          operating_mode: mode,
          operator_confirmed: mode === 'Operator Permission',
          timestamp_epoch: Math.floor(Date.now() / 1000),
        }),
      });

      setActionNotice({
        type: 'success',
        text: `Pump ${command.toUpperCase()} executed successfully in '${mode}' mode.`,
        hash: data.safety_audit_hash,
      });

      // Optimistically update pump state locally so feedback is immediate
      setPumps((prev) =>
        prev.map((p) =>
          p.pump_id === selectedPump.pump_id
            ? {
                ...p,
                pump_state: (command === 'START' ? 'ON' : 'OFF') as 'ON' | 'OFF',
                operating_mode: mode,
                queue_status: (command === 'START' ? 'ACTIVE_PUMPING' : 'STANDBY') as 'ACTIVE_PUMPING' | 'STANDBY',
              }
            : p
        )
      );
      fetchPumps();
    } catch (err: any) {
      setActionNotice({
        type: 'danger',
        text: err.message || 'Pump command failed safety interlocks.',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // 2. Emergency Manual Stop Button (Step 3.3.3)
  const handleEmergencyStop = async () => {
    if (!selectedPump) return;
    try {
      setIsExecuting(true);
      const data = await apiFetch<any>(`/api/v1/pumps/${selectedPump.pump_id}/emergency-stop`, {
        method: 'POST',
        body: JSON.stringify({
          actor: 'Operator_Control_Room',
          reason: 'Prominent manual E-Stop actuated by municipal dispatcher.',
        }),
      });

      setActionNotice({
        type: 'danger',
        text: 'EMERGENCY HARD STOP ACTIVATED. Pump depowered immediately. Local safety reset required.',
        hash: data.audit_hash,
      });
      fetchPumps();
    } catch (err: any) {
      setActionNotice({
        type: 'danger',
        text: `Emergency stop trigger failed: ${err.message}`,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // 3. Reset Emergency Stop Latch
  const handleResetEStop = async () => {
    if (!selectedPump) return;
    try {
      setIsExecuting(true);
      const data = await apiFetch<any>(`/api/v1/pumps/${selectedPump.pump_id}/reset-estop`, {
        method: 'POST',
      });
      setActionNotice({
        type: 'info',
        text: 'E-Stop latch released. Restored to Operator Permission mode.',
        hash: data.audit_hash,
      });
      fetchPumps();
    } catch (err: any) {
      setActionNotice({
        type: 'danger',
        text: `Reset failed: ${err.message}`,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // 4. Live Interactive Condition Simulation (Sliders & Checkboxes)
  const applySimulatedConditions = async (
    updates: Partial<{
      depth: number;
      drain: number;
      temp: number;
      blocked: boolean;
      dry: boolean;
    }>
  ) => {
    if (!selectedPump) return;
    const depth = updates.depth !== undefined ? updates.depth : simDepth;
    const drain = updates.drain !== undefined ? updates.drain : simDrain;
    const temp = updates.temp !== undefined ? updates.temp : simTemp;
    const blocked = updates.blocked !== undefined ? updates.blocked : simPipeBlocked;
    const dry = updates.dry !== undefined ? updates.dry : simDryRun;

    try {
      await apiFetch<any>(`/api/v1/pumps/${selectedPump.pump_id}/simulate-conditions`, {
        method: 'POST',
        body: JSON.stringify({
          source_water_depth_cm: depth,
          destination_drain_level_percent: drain,
          motor_temperature_c: temp,
          pipe_blocked: blocked,
          dry_run_detected: dry,
        }),
      });
      fetchPumps();
    } catch (err: any) {
      console.warn('Failed to simulate conditions:', err.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F0E6] text-[#263238] overflow-hidden font-sans">
      {/* Action Toast / Audit Banner */}
      {actionNotice && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-b shadow-xs shrink-0 transition-all ${
            actionNotice.type === 'danger'
              ? 'bg-[#B85042]/15 border-[#B85042]/40 text-[#B85042]'
              : actionNotice.type === 'success'
              ? 'bg-[#5D7A4E]/15 border-[#5D7A4E]/40 text-[#5D7A4E]'
              : 'bg-[#173D35]/10 border-[#173D35]/30 text-[#173D35]'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'danger' ? (
              <AlertOctagon className="w-4 h-4 text-[#B85042] shrink-0" />
            ) : actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#5D7A4E] shrink-0" />
            ) : (
              <Activity className="w-4 h-4 text-[#173D35] shrink-0" />
            )}
            <div>
              <span className="font-semibold">{actionNotice.text}</span>
              {actionNotice.hash && (
                <span className="ml-2 font-mono text-[10px] text-[#66706B] opacity-90">
                  (Audit Ledger SHA-256: {actionNotice.hash.substring(0, 16)}...)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setActionNotice(null)}
            className="text-xs underline hover:text-[#263238] ml-4 text-[#66706B]"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Main Console Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Pump Station & Mobile Dewatering Queue Selector */}
        <div className="w-full md:w-96 border-r border-[#DDD6C8] bg-[#FFFDF8] flex flex-col shrink-0">
          {/* Header Bar */}
          <div className="p-3 border-b border-[#DDD6C8] bg-[#FFFDF8] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Waves className="w-4 h-4 text-[#173D35]" />
                <h3 className="font-bold text-[#173D35] text-xs uppercase tracking-wider">
                  {lang === 'bn' ? `ঢাকা নিষ্কাশন পাম্প ও কিউ (${pumps.length})` : `Dhaka Dewatering Fleet (${pumps.length})`}
                </h3>
              </div>
              <button
                onClick={fetchPumps}
                className="text-[#66706B] hover:text-[#173D35] transition-colors"
                title="Refresh pumps"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#173D35]' : ''}`} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#66706B] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'bn' ? 'এলাকা, আইডি বা পাম্প খুঁজুন (উদাঃ Farmgate)...' : 'Search area, location, pump ID...'}
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#DDD6C8] rounded-lg text-xs text-[#263238] placeholder-[#66706B] focus:outline-none focus:border-[#173D35]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-[#66706B] hover:text-[#263238]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2 py-0.5 rounded font-semibold transition ${
                  categoryFilter === 'all'
                    ? 'bg-[#173D35] text-white shadow-xs'
                    : 'bg-[#FFFDF8] border border-[#DDD6C8] text-[#66706B] hover:text-[#263238]'
                }`}
              >
                {lang === 'bn' ? `সব (${pumps.length})` : `All (${pumps.length})`}
              </button>
              <button
                onClick={() => setCategoryFilter('permanent')}
                className={`px-2 py-0.5 rounded font-semibold transition flex items-center gap-1 ${
                  categoryFilter === 'permanent'
                    ? 'bg-[#173D35] text-white shadow-xs'
                    : 'bg-[#FFFDF8] border border-[#DDD6C8] text-[#66706B] hover:text-[#263238]'
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>{lang === 'bn' ? `স্থায়ী (${permCount})` : `Stationary (${permCount})`}</span>
              </button>
              <button
                onClick={() => setCategoryFilter('mobile')}
                className={`px-2 py-0.5 rounded font-semibold transition flex items-center gap-1 ${
                  categoryFilter === 'mobile'
                    ? 'bg-[#B68A35] text-white shadow-xs'
                    : 'bg-[#FFFDF8] border border-[#DDD6C8] text-[#66706B] hover:text-[#263238]'
                }`}
              >
                <Truck className="w-3 h-3" />
                <span>{lang === 'bn' ? `মোবাইল (${mobCount})` : `Mobile (${mobCount})`}</span>
              </button>
              <button
                onClick={() => setCategoryFilter('queue')}
                className={`px-2 py-0.5 rounded font-semibold transition flex items-center gap-1 ${
                  categoryFilter === 'queue'
                    ? 'bg-[#C96B35] text-white shadow-xs'
                    : 'bg-[#FFFDF8] border border-[#DDD6C8] text-[#66706B] hover:text-[#263238]'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{lang === 'bn' ? `কিউ (${queueCount})` : `Queue (${queueCount})`}</span>
              </button>
            </div>
          </div>

          {/* Asset List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#DDD6C8]/60 p-2 space-y-1.5">
            {filteredPumps.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#66706B]">
                {lang === 'bn' ? 'কোনো পাম্প বা মোবাইল ইউনিট খুঁজে পাওয়া যায়নি।' : 'No dewatering assets match filter.'}
              </div>
            ) : (
              filteredPumps.map((pump) => {
                const isSelected = pump.pump_id === selectedPump?.pump_id;
                const isRunning = pump.pump_state === 'ON';
                const isEStop = pump.emergency_stop;
                const isMobile = pump.asset_type === 'mobile_unit';
                const isQueued = pump.queue_status && pump.queue_status !== 'STANDBY';

                return (
                  <div
                    key={pump.pump_id}
                    onClick={() => handleSelectPump(pump)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#173D35]/10 border-[#173D35] shadow-xs ring-1 ring-[#173D35]'
                        : 'bg-[#FFFDF8] border-[#DDD6C8] hover:bg-[#F5F0E6]/70 hover:border-[#173D35]/40'
                    }`}
                  >
                    {/* Row 1: Title, Asset Badge, and Status */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                        {isMobile ? (
                          <Truck className="w-3.5 h-3.5 text-[#B68A35] shrink-0" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-[#173D35] shrink-0" />
                        )}
                        <span className="font-bold text-xs text-[#263238] truncate">
                          {pump.zone_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {isQueued && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider bg-[#B68A35]/15 text-[#B68A35] border border-[#B68A35]/40">
                            {pump.queue_status}
                          </span>
                        )}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider ${
                            isEStop
                              ? 'bg-[#B85042]/15 text-[#B85042] border border-[#B85042]/40 animate-pulse'
                              : isRunning
                              ? 'bg-[#5D7A4E]/15 text-[#5D7A4E] border border-[#5D7A4E]/40 animate-pulse'
                              : 'bg-[#7A817C]/15 text-[#66706B] border border-[#DDD6C8]'
                          }`}
                        >
                          {isEStop ? 'E-STOP' : isRunning ? 'RUNNING' : 'STOPPED'}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Asset Type & Subtitle */}
                    <div className="text-[10px] text-[#66706B] flex items-center justify-between mb-1 font-mono">
                      <span className="flex items-center gap-1">
                        <span className={`px-1 py-0.2 rounded text-[9px] font-sans font-bold ${
                          isMobile ? 'bg-[#B68A35]/15 text-[#B68A35] border border-[#B68A35]/30' : 'bg-[#173D35]/10 text-[#173D35] border border-[#173D35]/30'
                        }`}>
                          {isMobile ? 'MOBILE' : 'STATION'}
                        </span>
                        <span>{pump.pump_id}</span>
                      </span>
                      <span className="text-[#66706B] font-sans text-[10px]">
                        {pump.operating_mode}
                      </span>
                    </div>

                    {/* Row 3: Depth, Drain & Gate Status */}
                    <div className="flex items-center justify-between text-[10px] text-[#66706B] pt-1 border-t border-[#DDD6C8]/60">
                      <span>Depth: <strong className="text-[#173D35]">{pump.source_water_depth_cm} cm</strong></span>
                      <span>Drain: <strong className="text-[#263238]">{pump.destination_drain_level_percent}%</strong></span>
                      <span className={pump.safety_can_pump ? 'text-[#5D7A4E] font-semibold' : 'text-[#B85042] font-semibold'}>
                        {pump.safety_can_pump ? '● Safe' : '▲ Blocked'}
                      </span>
                    </div>

                    {/* Row 4: Sensor Freshness */}
                    <div className="flex items-center justify-between text-[9px] text-[#66706B] pt-0.5">
                      <span className="truncate max-w-[140px]">{pump.target_drain_route || pump.pump_name}</span>
                      <span className="flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 text-[#173D35]" />
                        <span>{pump.primary_wls_sensor || 'WLS'} • {pump.telemetry_freshness_seconds || 15}s</span>
                      </span>
                    </div>

                    {/* Active Receding Ticker Badge */}
                    {isRunning && (
                      <div className="mt-1 flex items-center justify-between text-[10px] bg-[#5D7A4E]/20 border border-[#5D7A4E]/50 text-[#173D35] px-2 py-0.5 rounded font-bold animate-pulse">
                        <span className="flex items-center gap-1">
                          <Waves className="w-3 h-3 text-[#173D35] animate-bounce" />
                          <span>{lang === 'bn' ? 'পানি নামছে' : 'Active Receding'}</span>
                        </span>
                        <span className="font-mono text-[#173D35]">{pump.source_water_depth_cm} cm (↓) • ~{pump.eta_minutes_min}m</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Selected Pump Station / Mobile Unit Interactive Cockpit */}
        {selectedPump ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F5F0E6]">
            {/* 1. Header Cockpit Bar */}
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border flex items-center gap-1 ${
                    selectedPump.asset_type === 'mobile_unit'
                      ? 'bg-[#B68A35]/15 text-[#B68A35] border-[#B68A35]/40'
                      : 'bg-[#173D35]/10 text-[#173D35] border-[#173D35]/30'
                  }`}>
                    {selectedPump.asset_type === 'mobile_unit' ? <Truck className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                    <span>{selectedPump.asset_type === 'mobile_unit' ? 'MOBILE DEWATERING TRAILER' : 'PERMANENT HEAVY STATION'}</span>
                  </span>

                  <h2 className="text-lg font-bold text-[#263238]">
                    {selectedPump.pump_name || `${selectedPump.zone_name} Dewatering Station`}
                  </h2>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-black border ${
                      selectedPump.emergency_stop
                        ? 'bg-[#B85042]/15 text-[#B85042] border-[#B85042]/40 animate-pulse'
                        : selectedPump.pump_state === 'ON'
                        ? 'bg-[#5D7A4E]/15 text-[#5D7A4E] border-[#5D7A4E]/40'
                        : 'bg-[#7A817C]/15 text-[#66706B] border-[#DDD6C8]'
                    }`}
                  >
                    STATUS: {selectedPump.emergency_stop ? 'EMERGENCY STOPPED' : selectedPump.pump_state}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#66706B] font-mono mt-1.5">
                  <span>Unit ID: <strong className="text-[#263238]">{selectedPump.pump_id}</strong></span>
                  <span>Location: <strong className="text-[#263238]">{selectedPump.location_id} ({selectedPump.zone_name})</strong></span>
                  <span>Discharge: <strong className="text-[#173D35]">{selectedPump.flow_rate_lps} L/s</strong></span>
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3 h-3 text-[#B68A35]" />
                    <span>{selectedPump.power_source}</span>
                  </span>
                </div>
              </div>

              {/* Step 3.3.3: Prominent Red Emergency Stop Button */}
              <div className="flex items-center space-x-2 shrink-0">
                {selectedPump.emergency_stop ? (
                  <button
                    onClick={handleResetEStop}
                    disabled={isExecuting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#B68A35] hover:bg-[#9E7528] text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'ই-স্টপ রিসেট করুন' : 'Reset E-Stop Latch'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleEmergencyStop}
                    disabled={isExecuting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#B85042] hover:bg-[#9E3E33] active:bg-[#853024] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-[#B85042]/30 border border-[#B85042]/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <AlertOctagon className="w-5 h-5 animate-pulse" />
                    <span>EMERGENCY STOP</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Dewatering Response & Dispatch Banner (when in queue) */}
            {selectedPump.queue_status && selectedPump.queue_status !== 'STANDBY' && (
              <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#B68A35]/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#B68A35] shrink-0" />
                    <span className="font-bold text-[#173D35] uppercase tracking-wider">
                      {lang === 'bn' ? 'পৌরসভা ডিওয়াটারিং রেসপন্স শিডিউল্ড' : 'Municipal Dewatering Response Active'}
                    </span>
                    <span className="px-2 py-0.5 rounded font-black text-[10px] bg-[#B68A35] text-white">
                      {selectedPump.queue_status}
                    </span>
                  </div>
                  <div className="text-[#66706B] font-sans flex flex-wrap gap-x-4">
                    <span>{lang === 'bn' ? 'দায়িত্বপ্রাপ্ত টিম:' : 'Assigned Crew:'} <strong className="text-[#263238]">{selectedPump.assigned_crew}</strong></span>
                    <span>{lang === 'bn' ? 'ড্রেনেজ আউটফল রুট:' : 'Drainage Route:'} <strong className="text-[#173D35]">{selectedPump.target_drain_route}</strong></span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-[#66706B] block">{lang === 'bn' ? 'প্রস্তুতির অবস্থা' : 'Readiness'}</span>
                  <span className="font-bold text-[#5D7A4E]">{lang === 'bn' ? 'অন-সাইট সক্রিয়' : 'On-Site / Dispatched'}</span>
                </div>
              </div>
            )}

            {/* 2. Step 3.3.4: Live Clearance ETA Display & Drainage Route */}
            <div
              className={`p-4 rounded-2xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                selectedPump.eta_exceeds_one_hour
                  ? 'bg-[#B68A35]/10 border-[#B68A35]/60'
                  : 'bg-[#FFFDF8] border-[#DDD6C8]'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    selectedPump.eta_exceeds_one_hour
                      ? 'bg-[#B68A35]/20 text-[#B68A35]'
                      : 'bg-[#173D35]/10 text-[#173D35]'
                  }`}
                >
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] text-[#66706B] block font-medium uppercase tracking-wider">
                    {lang === 'bn' ? 'পানি নিষ্কাশন প্রত্যাশিত সময় (Clearance ETA)' : 'Dewatering Clearance ETA'}
                  </span>
                  <div className="text-xl font-black text-[#263238] mt-0.5">
                    {selectedPump.source_water_depth_cm < 2.0 ? (
                      <span className="text-[#5D7A4E]">{lang === 'bn' ? 'রাস্তা পরিষ্কার (০ মিনিট)' : 'Road Cleared (0 min)'}</span>
                    ) : selectedPump.eta_minutes_min > 0 ? (
                      <span>
                        {selectedPump.eta_minutes_min} – {selectedPump.eta_minutes_max} {lang === 'bn' ? 'মিনিট' : 'minutes'}
                      </span>
                    ) : (
                      <span className="text-[#66706B]">{lang === 'bn' ? 'পাম্পিং নিষ্ক্রিয়' : 'Pumping Inactive'}</span>
                    )}
                  </div>
                  <p className="text-xs text-[#66706B] mt-1 max-w-xl">
                    {selectedPump.eta_message}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 shrink-0 max-w-sm text-xs">
                <div className="bg-[#F5F0E6] border border-[#DDD6C8] p-2.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-[#66706B] uppercase tracking-wider flex items-center gap-1">
                    <Compass className="w-3 h-3 text-[#173D35]" />
                    <span>{lang === 'bn' ? 'নিষ্কাশন পথ ও আউটফল' : 'Discharge Outfall Route'}</span>
                  </span>
                  <p className="text-[11px] text-[#263238] font-sans">
                    {selectedPump.target_drain_route}
                  </p>
                </div>

                {selectedPump.delay_notice && (
                  <div className="bg-[#B68A35]/15 border border-[#B68A35]/50 text-[#B68A35] px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#B68A35] shrink-0" />
                    <span>{selectedPump.delay_notice}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Live Dewatering Receding Telemetry Banner */}
            {selectedPump.pump_state === 'ON' && (
              <div className="p-3.5 rounded-2xl bg-[#5D7A4E]/15 border border-[#5D7A4E]/50 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#5D7A4E]/25 text-[#173D35]">
                    <Waves className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#173D35] uppercase tracking-wider text-xs">
                        {lang === 'bn' ? 'পানি দ্রুত নামছে • নিষ্কাশন চলমান' : 'Active Water Receding • Sump Discharging'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#173D35] text-white">
                        {selectedPump.source_water_depth_cm} cm
                      </span>
                    </div>
                    <p className="text-[11px] text-[#263238] mt-0.5 font-medium">
                      {lang === 'bn'
                        ? `প্রবাহ মাত্রা: ${selectedPump.flow_rate_lps} লি/সে • প্রত্যাশিত নিষ্কাশন: ~${selectedPump.eta_minutes_min} মিনিট (-০.৬ সেমি/পদক্ষেপ)`
                        : `Discharge Rate: ${selectedPump.flow_rate_lps} L/s • Est. Clearance: ~${selectedPump.eta_minutes_min} min (-0.6 cm/tick)`}
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-48 bg-[#DDD6C8]/60 h-2.5 rounded-full overflow-hidden border border-[#DDD6C8]">
                  <div
                    className="bg-[#173D35] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(10, (selectedPump.source_water_depth_cm / 30) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* 3. Step 3.3.1: 4 Operating Modes Selection & Actuator Control */}
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] p-4 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Gauge className="w-4 h-4 text-[#173D35]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#173D35]">
                    {lang === 'bn' ? 'পাম্প অপারেটিং মোড ও কন্ট্রোল (৪টি মোড)' : 'Pump Operating Mode & Controls (4 Modes)'}
                  </h3>
                </div>
                <span className="text-xs text-[#66706B]">
                  {lang === 'bn' ? 'বর্তমান মোড:' : 'Current Mode:'}{' '}
                  <strong className="text-[#173D35]">{selectedPump.operating_mode}</strong>
                </span>
              </div>

              {/* 4 Mode Selectors */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* Mode 1: Monitor Only */}
                <button
                  onClick={() => handlePumpCommand('STOP', 'Monitor Only')}
                  disabled={isExecuting || selectedPump.emergency_stop}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedPump.operating_mode === 'Monitor Only'
                      ? 'bg-[#173D35]/10 border-[#173D35] shadow-xs ring-1 ring-[#173D35]'
                      : 'bg-[#FFFDF8] border-[#DDD6C8] hover:border-[#173D35]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#263238]">1. Monitor Only</span>
                    <Lock className="w-3.5 h-3.5 text-[#66706B]" />
                  </div>
                  <p className="text-[10px] text-[#66706B] leading-tight">
                    {lang === 'bn' ? 'শুধুমাত্র টেলিমেট্রি পর্যবেক্ষণ। পাম্প অ্যাকচুয়েটর লক থাকবে।' : 'Telemetry view only. All pump actuators locked off.'}
                  </p>
                </button>

                {/* Mode 2: Operator Permission */}
                <button
                  onClick={() => handlePumpCommand('STOP', 'Operator Permission')}
                  disabled={isExecuting || selectedPump.emergency_stop}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedPump.operating_mode === 'Operator Permission'
                      ? 'bg-[#173D35]/10 border-[#173D35] shadow-xs ring-1 ring-[#173D35]'
                      : 'bg-[#FFFDF8] border-[#DDD6C8] hover:border-[#173D35]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#263238]">2. Operator Permission</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5D7A4E]" />
                  </div>
                  <p className="text-[10px] text-[#66706B] leading-tight">
                    {lang === 'bn' ? 'হিউম্যান-ইন-দ্য-লুপ। অপারেটরের সাইনড কমান্ড বাটনের অনুমোদন আবশ্যক।' : 'Human-in-the-loop. Requires explicit operator confirmation button.'}
                  </p>
                </button>

                {/* Mode 3: Automatic */}
                <button
                  onClick={() => handlePumpCommand('START', 'Automatic')}
                  disabled={isExecuting || selectedPump.emergency_stop}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedPump.operating_mode === 'Automatic'
                      ? 'bg-[#5D7A4E]/15 border-[#5D7A4E] shadow-xs ring-1 ring-[#5D7A4E]'
                      : 'bg-[#FFFDF8] border-[#DDD6C8] hover:border-[#5D7A4E]/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#263238]">3. Automatic</span>
                    <Activity className="w-3.5 h-3.5 text-[#5D7A4E]" />
                  </div>
                  <p className="text-[10px] text-[#66706B] leading-tight">
                    {lang === 'bn' ? 'হার্ড ডিটারমিনিস্টিক সেফটি ইন্টারলকের অধীনে স্বয়ংক্রিয় পরিচালনা।' : 'Autonomous closed-loop under hard local deterministic safety gates.'}
                  </p>
                </button>

                {/* Mode 4: Emergency Stop */}
                <button
                  onClick={handleEmergencyStop}
                  disabled={isExecuting}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedPump.operating_mode === 'Emergency Stop'
                      ? 'bg-[#B85042]/15 border-[#B85042] shadow-xs ring-1 ring-[#B85042]'
                      : 'bg-[#FFFDF8] border-[#DDD6C8] hover:border-[#B85042]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#B85042]">4. Emergency Stop</span>
                    <AlertOctagon className="w-3.5 h-3.5 text-[#B85042]" />
                  </div>
                  <p className="text-[10px] text-[#66706B] leading-tight">
                    {lang === 'bn' ? 'তাত্ক্ষণিক হার্ড পাওয়ার কাট-অফ। অন-সাইট ফিজিক্যাল রিসেট বাধ্যতামূলক।' : 'Immediate de-energization override. Physical reset mandated.'}
                  </p>
                </button>
              </div>

              {/* Start & Stop Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#DDD6C8]">
                <div className="text-xs text-[#66706B]">
                  {selectedPump.pump_state === 'ON' ? (
                    <span className="text-[#5D7A4E] flex items-center gap-1.5 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-[#5D7A4E] animate-ping" />
                      {lang === 'bn'
                        ? `সক্রিয় নিষ্কাশন চলছে: প্রতি সেকেন্ডে ${selectedPump.flow_rate_lps} লিটার অপসারিত হচ্ছে`
                        : `Active Dewatering: Discharging ${selectedPump.flow_rate_lps} L/s`}
                    </span>
                  ) : (
                    <span>{lang === 'bn' ? 'অ্যাকচুয়েটর স্ট্যান্ডবাই রয়েছে। চালু করার পূর্বে সেফটি গেট যাচাই করুন।' : 'Actuator in standby. Verify safety gates before start.'}</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {selectedPump.pump_state === 'OFF' ? (
                    <button
                      onClick={() => handlePumpCommand('START')}
                      disabled={isExecuting || selectedPump.emergency_stop || !selectedPump.safety_can_pump}
                      className="flex items-center gap-1.5 px-5 py-2 bg-[#173D35] hover:bg-[#1E4D43] disabled:opacity-40 disabled:hover:bg-[#173D35] text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{lang === 'bn' ? 'পাম্প চালু করুন (সাইনড কমান্ড)' : 'START PUMP (Sign Command)'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePumpCommand('STOP')}
                      disabled={isExecuting}
                      className="flex items-center gap-1.5 px-5 py-2 bg-[#263238] hover:bg-[#37474F] text-white rounded-xl font-bold text-xs border border-[#263238] transition-all cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>{lang === 'bn' ? 'পাম্প বন্ধ করুন' : 'STOP PUMP'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Step 3.3.2: Visual Safety Interlocks Checklist */}
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] p-4 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-[#5D7A4E]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#173D35]">
                    {lang === 'bn' ? 'ডিটারমিনিস্টিক নিরাপত্তা ইন্টারলকস (৮টি হার্ডওয়্যার গেট)' : 'Visual Safety Interlocks Checklist (8 Deterministic Gates)'}
                  </h3>
                </div>

                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    selectedPump.safety_can_pump
                      ? 'bg-[#5D7A4E]/15 text-[#5D7A4E] border-[#5D7A4E]/40'
                      : 'bg-[#B85042]/15 text-[#B85042] border-[#B85042]/40'
                  }`}
                >
                  {selectedPump.safety_can_pump
                    ? (lang === 'bn' ? '✓ সব গেট ক্লিয়ার' : '✓ ALL GATES CLEAR')
                    : (lang === 'bn' ? '✗ পাম্পিং বাধাগ্রস্ত' : '✗ PUMPING INHIBITED')}
                </span>
              </div>

              {/* Blocked Reasons Notice */}
              {selectedPump.safety_blocked_reasons && selectedPump.safety_blocked_reasons.length > 0 && (
                <div className="p-3 bg-[#B85042]/10 border border-[#B85042]/40 rounded-xl text-xs text-[#B85042] space-y-1">
                  <div className="font-bold text-[#B85042] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#B85042]" />
                    <span>{lang === 'bn' ? 'নিরাপত্তা ইন্টারলক কারণে পাম্প চালু বন্ধ রয়েছে:' : 'Hardware Safety Interlocks Tripped:'}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#B85042] pl-1">
                    {selectedPump.safety_blocked_reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 8 Deterministic Gate Check Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {/* Gate 1: Destination Drain Capacity */}
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    selectedPump.gate_statuses?.destination_drain_has_capacity
                      ? 'bg-[#F5F0E6] border-[#5D7A4E]/30'
                      : 'bg-[#B85042]/10 border-[#B85042]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#66706B]">
                      {lang === 'bn' ? 'আউটফল ড্রেন' : 'Destination Drain'}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedPump.gate_statuses?.destination_drain_has_capacity
                          ? 'bg-[#5D7A4E]'
                          : 'bg-[#B85042] animate-ping'
                      }`}
                    />
                  </div>
                  <div className="text-sm font-bold text-[#263238]">
                    {selectedPump.destination_drain_level_percent}% Full
                  </div>
                  <span className="text-[10px] text-[#66706B]">
                    Threshold: &le; 85% full
                  </span>
                </div>

                {/* Gate 2: Source Water Threshold */}
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    selectedPump.gate_statuses?.source_water_sufficient
                      ? 'bg-[#F5F0E6] border-[#5D7A4E]/30'
                      : 'bg-[#B85042]/10 border-[#B85042]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#66706B]">
                      {lang === 'bn' ? 'পানির স্তর' : 'Water Depth'}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedPump.gate_statuses?.source_water_sufficient
                          ? 'bg-[#5D7A4E]'
                          : 'bg-[#B85042] animate-ping'
                      }`}
                    />
                  </div>
                  <div className="text-sm font-bold text-[#263238]">
                    {selectedPump.source_water_depth_cm} cm
                  </div>
                  <span className="text-[10px] text-[#66706B]">
                    Activation: &ge; 10.0 cm
                  </span>
                </div>

                {/* Gate 3: Motor Thermal Limit */}
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    selectedPump.gate_statuses?.motor_temp_safe
                      ? 'bg-[#F5F0E6] border-[#5D7A4E]/30'
                      : 'bg-[#B85042]/10 border-[#B85042]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#66706B]">
                      {lang === 'bn' ? 'মোটর তাপমাত্রা' : 'Motor Temp'}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedPump.gate_statuses?.motor_temp_safe
                          ? 'bg-[#5D7A4E]'
                          : 'bg-[#B85042] animate-ping'
                      }`}
                    />
                  </div>
                  <div className="text-sm font-bold text-[#263238] flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-[#173D35]" />
                    <span>{selectedPump.motor_temperature_c}°C</span>
                  </div>
                  <span className="text-[10px] text-[#66706B]">
                    Limit: &le; 85.0°C
                  </span>
                </div>

                {/* Gate 4: Pipe Blockage */}
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    selectedPump.gate_statuses?.pipe_clear
                      ? 'bg-[#F5F0E6] border-[#5D7A4E]/30'
                      : 'bg-[#B85042]/10 border-[#B85042]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#66706B]">
                      {lang === 'bn' ? 'ডিসচার্জ পাইপ' : 'Discharge Pipe'}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedPump.gate_statuses?.pipe_clear
                          ? 'bg-[#5D7A4E]'
                          : 'bg-[#B85042] animate-ping'
                      }`}
                    />
                  </div>
                  <div className="text-sm font-bold text-[#263238]">
                    {selectedPump.pipe_blocked ? 'BLOCKED' : 'CLEAR'}
                  </div>
                  <span className="text-[10px] text-[#66706B]">
                    Pressure Sensor
                  </span>
                </div>

                {/* Gate 5: Dry Run Protection */}
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    selectedPump.gate_statuses?.no_dry_run
                      ? 'bg-[#F5F0E6] border-[#5D7A4E]/30'
                      : 'bg-[#B85042]/10 border-[#B85042]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#66706B]">
                      {lang === 'bn' ? 'ড্রাই-রান সুরক্ষা' : 'Dry Run'}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedPump.gate_statuses?.no_dry_run
                          ? 'bg-[#5D7A4E]'
                          : 'bg-[#B85042] animate-ping'
                      }`}
                    />
                  </div>
                  <div className="text-sm font-bold text-[#263238]">
                    {selectedPump.dry_run_detected ? 'DETECTED' : 'NORMAL'}
                  </div>
                  <span className="text-[10px] text-[#66706B]">
                    Cavitation Sensor
                  </span>
                </div>

                {/* Gate 6: Power Availability */}
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    selectedPump.gate_statuses?.power_available
                      ? 'bg-[#F5F0E6] border-[#5D7A4E]/30'
                      : 'bg-[#B85042]/10 border-[#B85042]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#66706B]">
                      {lang === 'bn' ? 'পাওয়ার সোর্স' : 'Pump Power'}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedPump.gate_statuses?.power_available
                          ? 'bg-[#5D7A4E]'
                          : 'bg-[#B85042] animate-ping'
                      }`}
                    />
                  </div>
                  <div className="text-sm font-bold text-[#263238] truncate text-[11px]">
                    {selectedPump.asset_type === 'mobile_unit' ? '45kVA GENERATOR' : '3-PHASE MAINS'}
                  </div>
                  <span className="text-[10px] text-[#66706B]">
                    7Ah Battery Locks Pump
                  </span>
                </div>

                {/* Gate 7: Command Freshness */}
                <div className="p-3 rounded-xl border text-xs bg-[#F5F0E6] border-[#5D7A4E]/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#66706B]">
                      {lang === 'bn' ? 'অ্যান্টি-রিপ্লে' : 'Anti-Replay'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#5D7A4E]" />
                  </div>
                  <div className="text-sm font-bold text-[#263238]">
                    VALID FRESH
                  </div>
                  <span className="text-[10px] text-[#66706B]">
                    HMAC SHA-256 &lt; 30s
                  </span>
                </div>

                {/* Gate 8: Emergency Stop Latch */}
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    selectedPump.gate_statuses?.emergency_stop_inactive
                      ? 'bg-[#F5F0E6] border-[#5D7A4E]/30'
                      : 'bg-[#B85042]/10 border-[#B85042]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#66706B]">
                      {lang === 'bn' ? 'ই-স্টপ ল্যাচ' : 'E-Stop Latch'}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedPump.gate_statuses?.emergency_stop_inactive
                          ? 'bg-[#5D7A4E]'
                          : 'bg-[#B85042] animate-ping'
                      }`}
                    />
                  </div>
                  <div className="text-sm font-bold text-[#263238]">
                    {selectedPump.emergency_stop ? 'TRIPPED' : 'ARMED / OK'}
                  </div>
                  <span className="text-[10px] text-[#66706B]">
                    Hard Depower Relay
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Live Interactive Demonstration Sandbox (Judges / Operator Sliders) */}
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] p-4 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-[#173D35]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#173D35]">
                    {lang === 'bn' ? 'ইন্টারঅ্যাক্টিভ সেফটি ইন্টারলকস টেস্টিং স্যান্ডবক্স' : 'Interactive Safety Interlocks Testing Sandbox (Judge / Demo Controls)'}
                  </h3>
                </div>
                <span className="text-[11px] text-[#66706B]">
                  {lang === 'bn' ? 'স্লাইড করে রিয়েল-টাইম ইন্টারলক পরীক্ষা করুন' : 'Slide values to test real-time interlock tripping'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F5F0E6] p-3.5 rounded-xl border border-[#DDD6C8]">
                {/* Slider 1: Water Depth */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#263238] font-medium">{lang === 'bn' ? 'পানির গভীরতা' : 'Source Water Depth'}</span>
                    <span className="font-mono text-[#173D35] font-bold">{simDepth} cm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="0.5"
                    value={simDepth}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSimDepth(val);
                      applySimulatedConditions({ depth: val });
                    }}
                    className="w-full accent-[#173D35]"
                  />
                  <span className="text-[10px] text-[#66706B] block">
                    Under 10 cm trips activation threshold.
                  </span>
                </div>

                {/* Slider 2: Destination Drain Fullness */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#263238] font-medium">{lang === 'bn' ? 'ড্রেনের ধারণক্ষমতা' : 'Destination Drain Fullness'}</span>
                    <span
                      className={`font-mono font-bold ${
                        simDrain > 85 ? 'text-[#B85042]' : 'text-[#5D7A4E]'
                      }`}
                    >
                      {simDrain}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={simDrain}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSimDrain(val);
                      applySimulatedConditions({ drain: val });
                    }}
                    className="w-full accent-[#5D7A4E]"
                  />
                  <span className="text-[10px] text-[#66706B] block">
                    Above 85% full trips drain overflow interlock.
                  </span>
                </div>

                {/* Slider 3: Motor Temperature */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#263238] font-medium">{lang === 'bn' ? 'মোটরের তাপমাত্রা' : 'Motor Temperature'}</span>
                    <span
                      className={`font-mono font-bold ${
                        simTemp > 85 ? 'text-[#B85042] animate-pulse' : 'text-[#B68A35]'
                      }`}
                    >
                      {simTemp}°C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="100"
                    step="1"
                    value={simTemp}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSimTemp(val);
                      applySimulatedConditions({ temp: val });
                    }}
                    className="w-full accent-[#B68A35]"
                  />
                  <span className="text-[10px] text-[#66706B] block">
                    Above 85.0°C triggers immediate thermal shutdown.
                  </span>
                </div>
              </div>

              {/* Checkboxes: Pipe Blocked & Dry Run */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center space-x-2 text-xs text-[#263238] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simPipeBlocked}
                    onChange={(e) => {
                      setSimPipeBlocked(e.target.checked);
                      applySimulatedConditions({ blocked: e.target.checked });
                    }}
                    className="rounded bg-white border-[#DDD6C8] text-[#B85042] focus:ring-0"
                  />
                  <span>{lang === 'bn' ? 'পাইপ ব্লকেজ সিমুলেশন' : 'Simulate Discharge Pipe Blockage'}</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-[#263238] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simDryRun}
                    onChange={(e) => {
                      setSimDryRun(e.target.checked);
                      applySimulatedConditions({ dry: e.target.checked });
                    }}
                    className="rounded bg-white border-[#DDD6C8] text-[#B85042] focus:ring-0"
                  />
                  <span>{lang === 'bn' ? 'ড্রাই রান (ক্যাভিটেশন) সিমুলেশন' : 'Simulate Intake Dry Run (Cavitation)'}</span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-[#66706B]">
            {lang === 'bn' ? 'বামপাশের তালিকা থেকে একটি পাম্প বা মোবাইল ইউনিট সিলেক্ট করুন।' : 'Select a pump station from the left list.'}
          </div>
        )}
      </div>
    </div>
  );
};

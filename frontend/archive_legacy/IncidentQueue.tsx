import React, { useState } from 'react';
import type { IncidentRecord, PriorityClass } from '../types';
import {
  AlertTriangle,
  Search,
  Clock,
  Waves,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface IncidentQueueProps {
  incidents: IncidentRecord[];
  selectedIncidentId: string | null;
  onSelectIncident: (incident: IncidentRecord) => void;
  loading: boolean;
  onRefresh: () => void;
}

export const IncidentQueue: React.FC<IncidentQueueProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  loading,
  onRefresh,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyUrgentVerification, setOnlyUrgentVerification] = useState<boolean>(false);
  const [onlyHospitalImpact, setOnlyHospitalImpact] = useState<boolean>(false);

  // Filter & Search Logic
  const filteredIncidents = incidents.filter((inc) => {
    if (priorityFilter !== 'ALL' && inc.priority_class !== priorityFilter) {
      return false;
    }
    if (onlyUrgentVerification && !inc.urgent_verification_needed) {
      return false;
    }
    if (onlyHospitalImpact && (!inc.infrastructure_name || !inc.infrastructure_name.toLowerCase().includes('hospital'))) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchZone = inc.zone_name.toLowerCase().includes(q);
      const matchId = inc.incident_id.toLowerCase().includes(q);
      const matchInfra = inc.infrastructure_name ? inc.infrastructure_name.toLowerCase().includes(q) : false;
      if (!matchZone && !matchId && !matchInfra) return false;
    }
    return true;
  });

  // Priority color styling
  const getPriorityBadge = (priority: PriorityClass) => {
    switch (priority) {
      case 'P1':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'P2':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'P3':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'P4':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  // Severity pill styling
  const getSeverityPill = (severity: string) => {
    switch (severity) {
      case 'Severe':
        return 'text-red-400 bg-red-950/50 border-red-800/60';
      case 'Waterlogged':
        return 'text-amber-400 bg-amber-950/50 border-amber-800/60';
      case 'Watch':
        return 'text-yellow-400 bg-yellow-950/50 border-yellow-800/60';
      default:
        return 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60';
    }
  };

  const p1Count = incidents.filter((i) => i.priority_class === 'P1').length;
  const p2Count = incidents.filter((i) => i.priority_class === 'P2').length;
  const p3Count = incidents.filter((i) => i.priority_class === 'P3').length;
  const p4Count = incidents.filter((i) => i.priority_class === 'P4').length;
  const urgentCount = incidents.filter((i) => i.urgent_verification_needed).length;

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 select-none">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white text-base">Prioritized Response Queue</h2>
          </div>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
            MCDA Ranked: {filteredIncidents.length} / {incidents.length}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search road, hotspot zone, or hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Priority Tabs */}
        <div className="flex items-center space-x-1 text-xs">
          <button
            onClick={() => setPriorityFilter('ALL')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              priorityFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All ({incidents.length})
          </button>
          <button
            onClick={() => setPriorityFilter('P1')}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              priorityFilter === 'P1'
                ? 'bg-red-600 text-white shadow'
                : 'bg-slate-800 text-red-400 hover:bg-slate-700'
            }`}
          >
            P1 ({p1Count})
          </button>
          <button
            onClick={() => setPriorityFilter('P2')}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              priorityFilter === 'P2'
                ? 'bg-orange-600 text-white shadow'
                : 'bg-slate-800 text-orange-400 hover:bg-slate-700'
            }`}
          >
            P2 ({p2Count})
          </button>
          <button
            onClick={() => setPriorityFilter('P3')}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              priorityFilter === 'P3'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
            }`}
          >
            P3 ({p3Count})
          </button>
          <button
            onClick={() => setPriorityFilter('P4')}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              priorityFilter === 'P4'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-blue-400 hover:bg-slate-700'
            }`}
          >
            P4 ({p4Count})
          </button>
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center justify-between text-[11px] pt-1">
          <button
            onClick={() => setOnlyUrgentVerification(!onlyUrgentVerification)}
            className={`flex items-center space-x-1 px-2 py-1 rounded border transition-colors ${
              onlyUrgentVerification
                ? 'bg-red-950/70 text-red-300 border-red-600'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>Urgent Field Check ({urgentCount})</span>
          </button>

          <button
            onClick={() => setOnlyHospitalImpact(!onlyHospitalImpact)}
            className={`flex items-center space-x-1 px-2 py-1 rounded border transition-colors ${
              onlyHospitalImpact
                ? 'bg-blue-950/70 text-blue-300 border-blue-600'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>🏥</span>
            <span>Hospital Routes</span>
          </button>

          <button
            onClick={onRefresh}
            className="text-slate-400 hover:text-white transition-colors"
            title="Refresh queue"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-2">
        {loading && (
          <div className="p-8 text-center text-xs text-slate-400">
            <Waves className="w-6 h-6 mx-auto mb-2 text-blue-400 animate-spin" />
            Loading prioritized incidents...
          </div>
        )}

        {!loading && filteredIncidents.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500">
            No incidents matching active filters.
          </div>
        )}

        {!loading &&
          filteredIncidents.map((inc) => {
            const isSelected = inc.incident_id === selectedIncidentId;
            return (
              <div
                key={inc.incident_id}
                onClick={() => onSelectIncident(inc)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                {/* Top Row: Priority & Score & Severity */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-black border tracking-wider ${getPriorityBadge(
                        inc.priority_class
                      )}`}
                    >
                      {inc.priority_class}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Score: {inc.priority_score.toFixed(3)}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${getSeverityPill(
                      inc.max_severity
                    )}`}
                  >
                    {inc.max_severity} ({inc.max_water_depth_cm} cm)
                  </span>
                </div>

                {/* Location Zone */}
                <div className="mb-2">
                  <div className="font-bold text-sm text-slate-100 flex items-center justify-between">
                    <span>{inc.zone_name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2">
                    <span>ID: {inc.incident_id}</span>
                    <span>•</span>
                    <span>{inc.location_id}</span>
                  </div>
                </div>

                {/* Badges: Hospital & Urgent Verification & Debris */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {/* Urgent Field Verification Needed */}
                  {inc.urgent_verification_needed && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-red-950/90 text-red-300 border border-red-600 px-2 py-0.5 rounded-md font-bold animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                      Urgent Field Verification Needed
                    </span>
                  )}

                  {/* Hospital Impact Badge */}
                  {inc.infrastructure_name && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-950/80 text-blue-300 border border-blue-700/60 px-2 py-0.5 rounded-md font-medium">
                      <span>🏥</span>
                      <span>{inc.infrastructure_name} Route Impacted</span>
                    </span>
                  )}

                  {/* Debris Observed */}
                  {inc.debris_observed && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-md">
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                      Debris Hazard
                    </span>
                  )}

                  {/* Pump Status */}
                  {inc.pump_required && (
                    <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                      ⚡ Pump Required
                    </span>
                  )}
                </div>

                {/* Bottom Row: Lifecycle State & Passability */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>State: <strong className="text-slate-300">{inc.lifecycle_state}</strong></span>
                  </div>
                  <span className="text-slate-400 italic">
                    {inc.road_passability}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

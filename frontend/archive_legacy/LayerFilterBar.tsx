import React from 'react';
import type { LayerFilters, SeverityLevel } from '../types';
import { Filter, Hospital, Flame, Droplets, Gauge, Layers } from 'lucide-react';

interface LayerFilterBarProps {
  filters: LayerFilters;
  onFilterChange: (filters: LayerFilters) => void;
  counts: {
    totalHotspots: number;
    severe: number;
    waterlogged: number;
    watch: number;
    normal: number;
    hospitals: number;
    emergency: number;
    drains: number;
  };
}

export const LayerFilterBar: React.FC<LayerFilterBarProps> = ({
  filters,
  onFilterChange,
  counts,
}) => {
  const handleSeverityChange = (severity: 'ALL' | SeverityLevel) => {
    onFilterChange({ ...filters, severityFilter: severity });
  };

  const toggleFilter = (key: keyof Omit<LayerFilters, 'severityFilter'>) => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-2.5 text-xs text-slate-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Severity Filter Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <span className="text-slate-400 font-semibold px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Severity:</span>
          </span>

          <button
            onClick={() => handleSeverityChange('ALL')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              filters.severityFilter === 'ALL'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({counts.totalHotspots})
          </button>

          <button
            onClick={() => handleSeverityChange('Severe')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              filters.severityFilter === 'Severe'
                ? 'bg-red-600 text-white shadow-sm font-semibold'
                : 'text-red-400 hover:bg-red-950/40'
            }`}
          >
            Severe ({counts.severe})
          </button>

          <button
            onClick={() => handleSeverityChange('Waterlogged')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              filters.severityFilter === 'Waterlogged'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            Waterlogged ({counts.waterlogged})
          </button>

          <button
            onClick={() => handleSeverityChange('Watch')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              filters.severityFilter === 'Watch'
                ? 'bg-yellow-600 text-white shadow-sm'
                : 'text-yellow-400 hover:bg-yellow-950/40'
            }`}
          >
            Watch ({counts.watch})
          </button>

          <button
            onClick={() => handleSeverityChange('Normal')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              filters.severityFilter === 'Normal'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-400 hover:bg-emerald-950/40'
            }`}
          >
            Normal ({counts.normal})
          </button>
        </div>

        {/* Feature Layer Toggles (Hospitals, Emergency, Drains, Pumps) */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Map Layers:</span>
          </span>

          {/* Hospitals */}
          <button
            onClick={() => toggleFilter('showHospitals')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border transition-all ${
              filters.showHospitals
                ? 'bg-rose-950/70 border-rose-600 text-rose-300 font-medium'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <Hospital className="w-3.5 h-3.5 text-rose-400" />
            <span>Hospitals ({counts.hospitals})</span>
          </button>

          {/* Emergency / Fire Stations */}
          <button
            onClick={() => toggleFilter('showEmergencyServices')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border transition-all ${
              filters.showEmergencyServices
                ? 'bg-orange-950/70 border-orange-600 text-orange-300 font-medium'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Fire & Rescue ({counts.emergency})</span>
          </button>

          {/* Storm Drains / Canals */}
          <button
            onClick={() => toggleFilter('showDrains')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border transition-all ${
              filters.showDrains
                ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-medium'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span>15 Canals ({counts.drains})</span>
          </button>

          {/* Pumps Only Toggle */}
          <button
            onClick={() => toggleFilter('showPumpsOnly')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border transition-all ${
              filters.showPumpsOnly
                ? 'bg-indigo-950/70 border-indigo-500 text-indigo-300 font-medium'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pump Stations Only</span>
          </button>
        </div>
      </div>
    </div>
  );
};

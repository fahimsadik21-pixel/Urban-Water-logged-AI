import React from 'react';
import type { HotspotFeature, SeverityLevel } from '../types';
import { X, Droplets, Gauge, Video, ArrowUpRight } from 'lucide-react';

interface HotspotDetailDrawerProps {
  hotspot: HotspotFeature | null;
  onClose: () => void;
  onNavigateToConsole: (hotspot: HotspotFeature) => void;
}

const SEVERITY_BADGE: Record<SeverityLevel, string> = {
  Normal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Watch: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Waterlogged: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Severe: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const HotspotDetailDrawer: React.FC<HotspotDetailDrawerProps> = ({
  hotspot,
  onClose,
  onNavigateToConsole,
}) => {
  if (!hotspot) return null;

  const props = hotspot.properties;
  const [lon, lat] = hotspot.geometry.coordinates;

  return (
    <div className="absolute top-4 right-4 z-20 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl text-slate-100 overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700">
        <div>
          <span className="text-xs font-mono text-slate-400">{props.location_id}</span>
          <h3 className="font-bold text-base text-white tracking-tight">{props.zone_name}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
              SEVERITY_BADGE[props.current_severity]
            }`}
          >
            {props.current_severity}
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-750 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 text-xs">
        {/* Depth Meter */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span>Observed Water Depth:</span>
            </span>
            <span className="text-base font-bold text-white font-mono">
              {props.current_depth_cm.toFixed(1)} cm
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                props.current_depth_cm >= 25
                  ? 'bg-red-500'
                  : props.current_depth_cm >= 10
                  ? 'bg-amber-500'
                  : props.current_depth_cm >= 2
                  ? 'bg-yellow-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min((props.current_depth_cm / 50) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0 cm (Dry)</span>
            <span>25 cm (Flood)</span>
            <span>50+ cm</span>
          </div>
        </div>

        {/* Priority & Attributes Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">Priority Queue</span>
            <span className="text-sm font-bold text-blue-400 font-mono">
              Class {props.priority_class}
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">Elevation / Terrain</span>
            <span className="text-sm font-semibold text-slate-200">
              {props.elevation_m.toFixed(1)}m MSL
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">Road Classification</span>
            <span className="text-xs font-medium text-slate-300 capitalize">
              {props.road_type} Road
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">GPS Coordinates</span>
            <span className="text-[10px] font-mono text-slate-400">
              {lat.toFixed(4)}, {lon.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Edge Equipment Telemetry */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
          <span className="text-slate-400 text-[11px] font-semibold block">Attached Edge Hardware:</span>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dewatering Pump:</span>
            </span>
            <span className={`font-semibold ${props.pump_available ? 'text-emerald-400' : 'text-slate-500'}`}>
              {props.pump_available ? 'Connected' : 'Not Installed'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>CCTV Video Gateway:</span>
            </span>
            <span className={`font-semibold ${props.camera_available ? 'text-emerald-400' : 'text-slate-500'}`}>
              {props.camera_available ? 'RTSP Stream Ready' : 'None'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onNavigateToConsole(hotspot)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 text-xs"
        >
          <span>Open in Pump & Safety Console</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import type { EdgeNodeTelemetry } from '../types';
import { API_BASE_URL } from '../lib/api';
import {
  Cpu,
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  AlertTriangle,
  Zap,
  ZapOff,
  CheckCircle2,
  Database,
} from 'lucide-react';

export const EdgeDeviceInspector: React.FC = () => {
  const [nodes, setNodes] = useState<EdgeNodeTelemetry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/devices/edge-nodes`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EdgeNodeTelemetry[] = await res.json();
      setNodes(data);
    } catch (err: any) {
      console.warn('Failed to load edge nodes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 15000);
    return () => clearInterval(interval);
  }, []);

  // Simulation Triggers
  const handlePowerFailure = async (nodeId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/devices/edge-nodes/${nodeId}/power-failure`, {
        method: 'POST',
      });
      setActionNotice(`Node ${nodeId}: Mains failure simulated. Pump locked out; 12V 7Ah backup battery powering IoT.`);
      fetchNodes();
    } catch (err: any) {
      setActionNotice(`Error: ${err.message}`);
    }
  };

  const handlePowerRestoration = async (nodeId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/devices/edge-nodes/${nodeId}/power-restoration`, {
        method: 'POST',
      });
      setActionNotice(`Node ${nodeId}: Mains power restored. Stale commands purged; safety re-evaluation mandated.`);
      fetchNodes();
    } catch (err: any) {
      setActionNotice(`Error: ${err.message}`);
    }
  };

  const handleNetworkDrop = async (nodeId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/devices/edge-nodes/${nodeId}/network-drop`, {
        method: 'POST',
      });
      setActionNotice(`Node ${nodeId}: Cellular severed. Local FIFO offline buffer active.`);
      fetchNodes();
    } catch (err: any) {
      setActionNotice(`Error: ${err.message}`);
    }
  };

  const handleNetworkRestore = async (nodeId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/devices/edge-nodes/${nodeId}/network-restore`, {
        method: 'POST',
      });
      setActionNotice(`Node ${nodeId}: Reconnected. Flushed buffered records to cloud.`);
      fetchNodes();
    } catch (err: any) {
      setActionNotice(`Error: ${err.message}`);
    }
  };

  // Filter nodes
  const filteredNodes = nodes.filter((n) => {
    if (statusFilter === 'OFFLINE' && n.network_status !== 'OFFLINE') return false;
    if (statusFilter === 'BATTERY' && n.mains_power === 'ONLINE') return false;
    if (statusFilter === 'ALERT' && (n.operating_mode !== 'Alert' && n.operating_mode !== 'Pumping')) return false;
    if (statusFilter === 'BUFFERING' && n.cached_records_count === 0) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return n.node_id.toLowerCase().includes(q) || n.zone_name.toLowerCase().includes(q);
    }
    return true;
  });

  const totalOffline = nodes.filter((n) => n.network_status === 'OFFLINE').length;
  const totalBattery = nodes.filter((n) => n.mains_power !== 'ONLINE').length;
  const totalCached = nodes.reduce((sum, n) => sum + (n.cached_records_count || 0), 0);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 space-y-4 overflow-y-auto">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-bold text-white">50-Node Edge IoT & Local Cache Inspector</h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time telemetry, 5-mode adaptive cadence, 12V 7Ah backup battery health, and offline FIFO buffering.
          </p>
        </div>

        <button
          onClick={fetchNodes}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Action Toast Notice */}
      {actionNotice && (
        <div className="p-3 bg-blue-950/80 border border-blue-700/80 rounded-xl text-xs text-blue-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white text-xs underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Monitored Edge Nodes</span>
          <div className="text-xl font-black text-white mt-0.5">{nodes.length} / 50</div>
          <span className="text-[10px] text-emerald-400">All Dhaka Zones Covered</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Network Status</span>
          <div className="text-xl font-black text-white mt-0.5 flex items-center gap-1.5">
            <span className={totalOffline > 0 ? 'text-amber-400' : 'text-emerald-400'}>
              {nodes.length - totalOffline} Online
            </span>
            {totalOffline > 0 && <span className="text-red-400 text-sm">({totalOffline} Offline)</span>}
          </div>
          <span className="text-[10px] text-slate-400">4G LTE / LoRaWAN</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Power Source</span>
          <div className="text-xl font-black text-white mt-0.5">
            <span className={totalBattery > 0 ? 'text-amber-400' : 'text-blue-400'}>
              {totalBattery > 0 ? `${totalBattery} on 12V Battery` : '100% Grid Mains'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">84 Wh Sealed Pack</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Offline Buffer Cache</span>
          <div className="text-xl font-black text-purple-400 mt-0.5">{totalCached} Records</div>
          <span className="text-[10px] text-slate-400">Non-volatile FIFO</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Node ID or Zone name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 text-xs w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              statusFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Nodes
          </button>
          <button
            onClick={() => setStatusFilter('OFFLINE')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              statusFilter === 'OFFLINE' ? 'bg-red-600 text-white' : 'bg-slate-800 text-red-400 hover:text-white'
            }`}
          >
            Offline ({totalOffline})
          </button>
          <button
            onClick={() => setStatusFilter('BATTERY')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              statusFilter === 'BATTERY' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-amber-400 hover:text-white'
            }`}
          >
            On Battery ({totalBattery})
          </button>
          <button
            onClick={() => setStatusFilter('BUFFERING')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              statusFilter === 'BUFFERING' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-purple-400 hover:text-white'
            }`}
          >
            Queued Cache
          </button>
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredNodes.map((node) => {
          const isBatteryMode = node.mains_power !== 'ONLINE';
          const isOffline = node.network_status === 'OFFLINE';

          return (
            <div
              key={node.node_id}
              className={`p-3.5 rounded-xl border transition-all ${
                isBatteryMode || isOffline
                  ? 'bg-slate-900/90 border-amber-800/80 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Node Header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-bold text-sm text-white">{node.zone_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{node.node_id}</div>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    node.operating_mode === 'Alert'
                      ? 'bg-red-950 text-red-400 border-red-700 animate-pulse'
                      : node.operating_mode === 'Pumping'
                      ? 'bg-blue-950 text-blue-400 border-blue-700'
                      : node.operating_mode === 'Watch'
                      ? 'bg-yellow-950 text-yellow-400 border-yellow-700'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Mode: {node.operating_mode} ({node.sensor_interval_seconds}s)
                </span>
              </div>

              {/* Status Chips */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                {/* Battery & Power */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    {isBatteryMode ? (
                      <Battery className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Power:</span>
                  </div>
                  <div className="font-semibold text-slate-200 text-[11px]">
                    {node.battery_percent}% ({node.battery_voltage_v}V)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isBatteryMode ? `${node.battery_runtime_remaining_hours}h left on 7Ah` : 'Grid Mains Active'}
                  </div>
                </div>

                {/* Network & Cache */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    {isOffline ? (
                      <WifiOff className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Network:</span>
                  </div>
                  <div className="font-semibold text-slate-200 text-[11px]">
                    {isOffline ? 'OFFLINE' : `${node.cellular_signal_dbm} dBm`}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Database className="w-3 h-3 text-purple-400" />
                    <span>{node.cached_records_count} cached</span>
                  </div>
                </div>
              </div>

              {/* Pump Interlock Status Notice */}
              {node.pump_lockout_active && (
                <div className="mb-3 px-2 py-1 bg-amber-950/70 border border-amber-700/60 rounded text-[10px] text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Pump Locked Out (IoT battery cannot power pump)</span>
                </div>
              )}

              {/* Interactive Simulation Controls */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800 text-[11px]">
                {isBatteryMode ? (
                  <button
                    onClick={() => handlePowerRestoration(node.node_id)}
                    className="flex items-center justify-center gap-1 px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-200 rounded font-medium transition-colors"
                  >
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Restore Grid</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handlePowerFailure(node.node_id)}
                    className="flex items-center justify-center gap-1 px-2 py-1 bg-slate-800 hover:bg-amber-950/80 border border-slate-700 hover:border-amber-700 text-slate-300 hover:text-amber-200 rounded font-medium transition-colors"
                  >
                    <ZapOff className="w-3 h-3 text-amber-400" />
                    <span>Drop Mains</span>
                  </button>
                )}

                {isOffline ? (
                  <button
                    onClick={() => handleNetworkRestore(node.node_id)}
                    className="flex items-center justify-center gap-1 px-2 py-1 bg-blue-950/80 hover:bg-blue-900 border border-blue-700 text-blue-200 rounded font-medium transition-colors"
                  >
                    <Wifi className="w-3 h-3 text-blue-400" />
                    <span>Sync Buffer</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleNetworkDrop(node.node_id)}
                    className="flex items-center justify-center gap-1 px-2 py-1 bg-slate-800 hover:bg-red-950/80 border border-slate-700 hover:border-red-700 text-slate-300 hover:text-red-200 rounded font-medium transition-colors"
                  >
                    <WifiOff className="w-3 h-3 text-red-400" />
                    <span>Sever Cell</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

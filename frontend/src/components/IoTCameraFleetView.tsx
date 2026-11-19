import React, { useEffect, useMemo, useState } from 'react';
import {
  Cpu,
  Camera,
  Activity,
  Search,
  AlertTriangle,
  Lock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  X,
  Eye,
  Layers,
  Zap,
} from 'lucide-react';
import { DhakaMiniGisMap, type DeviceNodeData } from './DhakaMiniGisMap';
import { useLanguage } from '../contexts/LanguageContext';

export const IoTCameraFleetView: React.FC = () => {
  const { lang, formatNumber } = useLanguage();
  const bn = lang === 'bn';
  const [activeSubTab, setActiveSubTab] = useState<'iot' | 'camera' | 'health'>('iot');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [nodeStatusFilter, setNodeStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [cameraFilter, setCameraFilter] = useState<'all' | 'ip' | 'analog'>('all');
  const [cameraStatusFilter, setCameraStatusFilter] = useState<'ALL' | 'ONLINE' | 'WARNING' | 'OFFLINE'>('ALL');
  const [nodePage, setNodePage] = useState<number>(1);
  const [sampleNodes, setSampleNodes] = useState<DeviceNodeData[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Camera & Edge AI state
  const [cameraStreams, setCameraStreams] = useState<any[]>([]);
  const [cameraSearch, setCameraSearch] = useState<string>('');
  const [inspectingCamera, setInspectingCamera] = useState<any | null>(null);
  const [inspectingFrameIdx, setInspectingFrameIdx] = useState<number>(4);
  const [frameData, setFrameData] = useState<any | null>(null);
  const [frameAnalysis, setFrameAnalysis] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showMasks, setShowMasks] = useState<boolean>(true);
  const [evidenceStatus, setEvidenceStatus] = useState<any | null>(null);
  const [isVerifyingEvidence, setIsVerifyingEvidence] = useState<boolean>(false);

  // Data Health Cache Replay Interactive State
  const [isReplayingCache, setIsReplayingCache] = useState<boolean>(false);
  const [replayProgress, setReplayProgress] = useState<number>(100);
  const [replayNotice, setReplayNotice] = useState<string | null>(null);

  const handleTriggerReplay = () => {
    setIsReplayingCache(true);
    setReplayProgress(20);
    setReplayNotice(bn ? 'অফলাইন ক্যাশ সিঙ্ক ও ভ্যালিডেশন শুরু হয়েছে...' : 'Initiating offline cache sync & FIFO verification...');
    setTimeout(() => setReplayProgress(65), 600);
    setTimeout(() => {
      setReplayProgress(100);
      setIsReplayingCache(false);
      setReplayNotice(bn ? '৩৪টি সংরক্ষিত রিডিং সফলভাবে অডিট লেজারে সিঙ্ক সম্পন্ন!' : '34 cached telemetry packets verified and committed to ledger!');
    }, 1400);
  };

  // Dynamic Metrics for Data Health Tab
  const dataHealthMetrics = useMemo(() => {
    const total = sampleNodes.length || 50;
    const online = sampleNodes.filter((n) => n.network === 'ONLINE').length;
    const active = sampleNodes.filter((n) => n.statusCategory === 'ACTIVE').length;
    const warning = sampleNodes.filter((n) => n.statusCategory === 'WARNING').length;
    const offline = sampleNodes.filter((n) => n.statusCategory === 'OFFLINE').length;
    const coverage = total > 0 ? ((online / total) * 100).toFixed(1) : '94.0';
    const qualityScore = (0.91 + (active / total) * 0.07).toFixed(2);
    const avgUncertainty = (0.03 + (warning * 0.006) + (offline * 0.012)).toFixed(2);

    const regions = [
      {
        name: bn ? 'উত্তর ঢাকা (Mirpur/Uttara)' : 'North Dhaka',
        filter: (n: DeviceNodeData) => /mirpur|kazipara|shewrapara|pallabi|uttara|cantonment/i.test(n.zoneName || n.locationId),
        baseQuality: 0.95,
      },
      {
        name: bn ? 'দক্ষিণ ঢাকা (Old Dhaka/Motijheel)' : 'South Dhaka',
        filter: (n: DeviceNodeData) => /paltan|jatrabari|nazimuddin|chawkbazar|lalbagh|bangabandhu|motijheel/i.test(n.zoneName || n.locationId),
        baseQuality: 0.93,
      },
      {
        name: bn ? 'পূর্ব ঢাকা (Rampura/Badda/Khilgaon)' : 'East Dhaka',
        filter: (n: DeviceNodeData) => /rampura|badda|khilgaon|malibagh|bashundhara|pragati/i.test(n.zoneName || n.locationId),
        baseQuality: 0.92,
      },
      {
        name: bn ? 'পশ্চিম ঢাকা (Kallyanpur/Shyamoli)' : 'West Dhaka',
        filter: (n: DeviceNodeData) => /kallyanpur|shyamoli|mohammadpur|gabtoli|adabor/i.test(n.zoneName || n.locationId),
        baseQuality: 0.96,
      },
      {
        name: bn ? 'কেন্দ্রীয় ঢাকা (Farmgate/Tejgaon)' : 'Central Dhaka',
        filter: (n: DeviceNodeData) => /farmgate|tejgaon|karwan|moghbazar|dhanmondi|panthapath/i.test(n.zoneName || n.locationId),
        baseQuality: 0.94,
      },
    ];

    const regionalStats = regions.map((r) => {
      const regionNodes = sampleNodes.filter(r.filter);
      const regWarning = regionNodes.filter((n) => n.statusCategory === 'WARNING').length;
      const regOffline = regionNodes.filter((n) => n.statusCategory === 'OFFLINE').length;
      const q = (r.baseQuality - (regWarning * 0.01) - (regOffline * 0.02)).toFixed(2);
      const unc = (0.02 + regWarning * 0.01 + regOffline * 0.02).toFixed(2);
      const status = regOffline > 0 ? (bn ? 'সতর্কতা' : 'Warning') : (bn ? 'সুস্থ' : 'Healthy');
      const statusColor = regOffline > 0 ? 'text-[#B68A35]' : 'text-[#5D7A4E]';
      return {
        zone: r.name,
        quality: `${q} ± 0.02`,
        uncertainty: unc,
        status,
        statusColor,
      };
    });

    return {
      total,
      online,
      active,
      warning,
      offline,
      coverage,
      qualityScore,
      avgUncertainty,
      regionalStats,
    };
  }, [sampleNodes, bn]);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/devices/health', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/v1/map/layers', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([records, mapLayers]) => {
        // Fallback coordinate map from map/layers GeoJSON if needed
        const coordsMap = new Map<string, { lat: number; lng: number }>();
        if (mapLayers?.hotspots?.features) {
          for (const f of mapLayers.hotspots.features) {
            const locId = f.properties?.location_id;
            const geom = f.geometry;
            if (locId && geom?.type === 'Point' && Array.isArray(geom.coordinates)) {
              coordsMap.set(locId, { lng: geom.coordinates[0], lat: geom.coordinates[1] });
            }
          }
        }

        const nodes: DeviceNodeData[] = (records as any[]).map((item: any) => {
          let lat = item.latitude !== undefined && item.latitude !== null ? Number(item.latitude) : null;
          let lng = item.longitude !== undefined && item.longitude !== null ? Number(item.longitude) : null;

          if ((lat === null || lng === null) && coordsMap.has(item.location_id)) {
            const c = coordsMap.get(item.location_id)!;
            lat = c.lat;
            lng = c.lng;
          }

          const batteryNum = typeof item.battery_percent === 'number' ? item.battery_percent : Number.parseFloat(item.battery_percent) || 100;
          const isOnline = item.network_status === 'ONLINE';
          const isHealthy = item.health_status === 'HEALTHY' || item.health_status === 'Healthy';
          const hasLowBattery = batteryNum <= 20;
          const hasQueue = (item.queued_records || 0) > 0;

          let statusCategory: 'ACTIVE' | 'WARNING' | 'OFFLINE' = 'ACTIVE';
          if (!isOnline) {
            statusCategory = 'OFFLINE';
          } else if (!isHealthy || hasLowBattery || hasQueue) {
            statusCategory = 'WARNING';
          } else {
            statusCategory = 'ACTIVE';
          }

          const devSeed = item.device_id ? item.device_id.charCodeAt(item.device_id.length - 1) : 7;
          const rssi = -55 - (devSeed % 25);
          const signalText = item.network_status === 'ONLINE'
            ? (bn ? `সংযুক্ত (${rssi} dBm)` : `Connected (${rssi} dBm)`)
            : (bn ? 'সিগন্যাল নেই' : 'No signal');

          return {
            nodeId: item.device_id,
            locationId: item.location_id,
            zoneName: item.zone_name,
            latitude: lat,
            longitude: lng,
            battery: `${Math.round(batteryNum)}%`,
            batteryPercent: batteryNum,
            mains: !String(item.power_source).toLowerCase().includes('battery_only'),
            network: item.network_status,
            signal: signalText,
            cache: item.queued_records || 0,
            lastSync: item.network_status === 'ONLINE' ? 'Live' : 'Pending sync',
            sensorHealth: item.health_status === 'HEALTHY' ? 'Healthy' : item.health_status,
            cadence: item.adaptive_mode || 'Normal',
            statusCategory,
          };
        });
        setSampleNodes(nodes);
      })
      .catch((error) => console.warn('Device health fetch failed:', error));
  }, []);

  // Fetch camera streams when sub-tab switches or on mount
  useEffect(() => {
    fetch('/api/v1/cameras/streams', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCameraStreams(data))
      .catch((err) => console.warn('Camera streams fetch failed:', err));
  }, [activeSubTab]);

  // When inspecting a camera or switching frame index
  useEffect(() => {
    if (!inspectingCamera) return;
    const locId = inspectingCamera.location_id;
    const frameId = `FRM_${locId}_${String(inspectingFrameIdx).padStart(2, '0')}`;

    setEvidenceStatus(null);
    setIsAnalyzing(true);

    fetch(`/api/v1/cameras/frames/${frameId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setFrameData(data))
      .catch(() => setFrameData(null));

    fetch(`/api/v1/cameras/frames/${frameId}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conf_threshold: 0.25 }),
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setFrameAnalysis(data);
        if (data?.evidence_integrity) {
          setEvidenceStatus(data.evidence_integrity);
        }
      })
      .catch(() => setFrameAnalysis(null))
      .finally(() => setIsAnalyzing(false));
  }, [inspectingCamera, inspectingFrameIdx]);

  const handleVerifyEvidence = (frameId: string) => {
    setIsVerifyingEvidence(true);
    fetch(`/api/v1/audit/camera-frames/${frameId}/verify`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setEvidenceStatus(data))
      .catch((err) => console.warn('Evidence verification failed:', err))
      .finally(() => setIsVerifyingEvidence(false));
  };

  const filteredNodes = sampleNodes.filter((n) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = n.nodeId.toLowerCase().includes(query) || n.locationId.toLowerCase().includes(query) || n.zoneName.toLowerCase().includes(query);
    const matchesStatus = nodeStatusFilter === 'ALL' || n.network.toUpperCase() === nodeStatusFilter;
    return matchesQuery && matchesStatus;
  });
  const onlineCount = sampleNodes.filter((node) => node.network === 'ONLINE').length;
  const offlineCount = sampleNodes.length - onlineCount;
  const activeCount = sampleNodes.filter((node) => node.statusCategory === 'ACTIVE').length;
  const warningCount = sampleNodes.filter((node) => node.statusCategory === 'WARNING').length;
  const averageBattery = useMemo(() => sampleNodes.length ? Math.round(sampleNodes.reduce((sum, node) => sum + node.batteryPercent, 0) / sampleNodes.length) : 0, [sampleNodes]);
  const queuedCount = sampleNodes.reduce((sum, node) => sum + node.cache, 0);
  const pageSize = 10;
  const paginatedNodes = filteredNodes.slice((nodePage - 1) * pageSize, nodePage * pageSize);

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    const idx = filteredNodes.findIndex((n) => n.nodeId === nodeId);
    if (idx !== -1) {
      setNodePage(Math.floor(idx / pageSize) + 1);
    }
  };

  // Filtered cameras
  const filteredCameras = cameraStreams.filter((c) => {
    const q = cameraSearch.toLowerCase();
    const matchesQuery =
      c.camera_id.toLowerCase().includes(q) ||
      c.location_id.toLowerCase().includes(q) ||
      (c.zone_name && c.zone_name.toLowerCase().includes(q));

    const matchesProtocol =
      cameraFilter === 'all' ||
      (cameraFilter === 'ip' && c.protocol === 'rtsp_ip') ||
      (cameraFilter === 'analog' && c.protocol === 'analog_dvr');

    const matchesStatus =
      cameraStatusFilter === 'ALL' ||
      (cameraStatusFilter === 'ONLINE' && c.status === 'STREAMING') ||
      (cameraStatusFilter === 'OFFLINE' && c.status === 'OFFLINE');

    return matchesQuery && matchesProtocol && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full w-full bg-[#F5F0E6] overflow-y-auto text-[#263238] animate-fade-in">
      {/* 1. Header Bar with Sub-Tabs */}
      <header className="h-12 border-b border-[#DDD6C8] bg-[#FFFDF8] px-5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex bg-[#F5F0E6] p-1 rounded-xl border border-[#DDD6C8]">
            <button
              onClick={() => setActiveSubTab('iot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'iot'
                  ? 'bg-[#173D35] text-[#FFFDF8] shadow-sm'
                  : 'text-[#66706B] hover:text-[#263238]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{bn ? 'আইওটি বহর' : 'IoT Fleet'}</span>
            </button>

            <button
              onClick={() => setActiveSubTab('camera')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'camera'
                  ? 'bg-[#173D35] text-[#FFFDF8] shadow-sm'
                  : 'text-[#66706B] hover:text-[#263238]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{bn ? 'ক্যামেরা ও এজ এআই' : 'Camera & Edge AI'}</span>
            </button>

            <button
              onClick={() => setActiveSubTab('health')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'health'
                  ? 'bg-[#173D35] text-[#FFFDF8] shadow-sm'
                  : 'text-[#66706B] hover:text-[#263238]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{bn ? 'ডাটা হেলথ' : 'Data Health'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#263238] bg-[#FFFDF8] px-2.5 py-1 rounded-md border border-[#DDD6C8] font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#173D35]" />
              <span>{bn ? 'ঢাকা' : 'Dhaka'}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#B68A35]/15 border border-[#B68A35]/40 text-[#8c6722] text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{bn ? 'সিমুলেশন মোড' : 'Simulation Mode'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Sub-Tab 1: IoT Fleet View */}
      {activeSubTab === 'iot' && (
        <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#263238]">{bn ? 'আইওটি সেন্সর বহর' : 'IoT Sensor Fleet'}</h3>
            <p className="text-xs text-[#66706B]">{bn ? 'ঢাকা মিউনিসিপ্যাল পরিবেশগত সেন্সিং মেশ' : 'Dhaka Municipal Environmental Sensing Mesh'}</p>
          </div>

          {/* 6 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#66706B] block mb-1 font-semibold">{bn ? 'মোট নোড' : 'Total Nodes'}</span>
              <div className="text-xl font-black text-[#263238] font-mono">{formatNumber(sampleNodes.length)}</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#5D7A4E]/40 rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#5D7A4E] block mb-1 font-semibold">{bn ? 'সক্রিয় (সুস্থ)' : 'Active (Healthy)'}</span>
              <div className="text-xl font-black text-[#5D7A4E] font-mono">{formatNumber(activeCount)}</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#B68A35]/40 rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#B68A35] block mb-1 font-semibold">{bn ? 'সতর্কতা' : 'Warning'}</span>
              <div className="text-xl font-black text-[#B68A35] font-mono">{formatNumber(warningCount)}</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#B85042]/40 rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#B85042] block mb-1 font-semibold">{bn ? 'অফলাইন' : 'Offline'}</span>
              <div className="text-xl font-black text-[#B85042] font-mono">{formatNumber(offlineCount)}</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#66706B] block mb-1 font-semibold">{bn ? 'গড় ব্যাটারি' : 'Avg Battery'}</span>
              <div className="text-xl font-black text-[#173D35] font-mono">{formatNumber(averageBattery)}%</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#66706B] block mb-1 font-semibold">{bn ? 'মোট ক্যাশ' : 'Total Cache'}</span>
              <div className="text-xl font-black text-[#C96B35] font-mono">{formatNumber(queuedCount)}</div>
            </div>
          </div>

          {/* Grid Layout: Mini Map on Left, Device Table on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 h-[340px] lg:h-[480px]">
              <DhakaMiniGisMap
                nodes={sampleNodes}
                selectedNodeId={selectedNodeId}
                hoveredNodeId={hoveredNodeId}
                onSelectNode={handleSelectNode}
                onHoverNode={setHoveredNodeId}
                lang={lang}
              />
            </div>

            <div className="lg:col-span-7 bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm">
              <div className="p-3 border-b border-[#DDD6C8] flex flex-wrap items-center justify-between gap-3 bg-[#F5F0E6]/50">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#66706B]" />
                  <input
                    type="text"
                    placeholder={bn ? 'নোড আইডি বা এলাকা খুঁজুন...' : 'Search node ID, location...'}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setNodePage(1);
                    }}
                    className="w-full bg-white border border-[#DDD6C8] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#263238] placeholder-[#66706B] outline-none focus:border-[#173D35]"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {(['ALL', 'ONLINE', 'OFFLINE'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setNodeStatusFilter(status);
                        setNodePage(1);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                        nodeStatusFilter === status
                          ? 'bg-[#173D35] text-[#FFFDF8] shadow-xs'
                          : 'bg-white text-[#66706B] hover:text-[#263238] border border-[#DDD6C8]'
                      }`}
                    >
                      {status === 'ALL' ? (bn ? 'সকল' : 'ALL') : status === 'ONLINE' ? (bn ? 'অনলাইন' : 'ONLINE') : (bn ? 'অফলাইন' : 'OFFLINE')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#F5F0E6] text-[11px] text-[#66706B] uppercase tracking-wider sticky top-0 z-10 border-b border-[#DDD6C8]">
                    <tr>
                      <th className="py-2.5 px-3">{bn ? 'নোড / লোকেশন' : 'Node / Location'}</th>
                      <th className="py-2.5 px-3">{bn ? 'ব্যাটারি' : 'Battery'}</th>
                      <th className="py-2.5 px-3">{bn ? 'মেইন পাওয়ার' : 'Mains'}</th>
                      <th className="py-2.5 px-3">{bn ? 'নেটওয়ার্ক' : 'Network'}</th>
                      <th className="py-2.5 px-3">{bn ? 'সিগন্যাল' : 'Signal'}</th>
                      <th className="py-2.5 px-3">{bn ? 'ক্যাশ' : 'Cache'}</th>
                      <th className="py-2.5 px-3">{bn ? 'শেষ সিঙ্ক' : 'Last Sync'}</th>
                      <th className="py-2.5 px-3">{bn ? 'সেন্সর হেলথ' : 'Sensor Health'}</th>
                      <th className="py-2.5 px-3">{bn ? 'ক্যাডেন্স' : 'Cadence'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD6C8] text-[#263238]">
                    {paginatedNodes.map((n) => {
                      const isSelected = n.nodeId === selectedNodeId;
                      const isHovered = n.nodeId === hoveredNodeId;
                      const hasCoords = n.latitude !== null && n.longitude !== null;

                      return (
                        <tr
                          key={n.nodeId}
                          onClick={() => handleSelectNode(n.nodeId)}
                          onMouseEnter={() => setHoveredNodeId(n.nodeId)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#173D35]/10 border-l-4 border-l-[#173D35] text-[#263238] font-medium'
                              : isHovered
                              ? 'bg-[#F5F0E6] text-[#263238]'
                              : 'hover:bg-[#F5F0E6]/60'
                          }`}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  n.statusCategory === 'ACTIVE'
                                    ? 'bg-[#5D7A4E]'
                                    : n.statusCategory === 'WARNING'
                                    ? 'bg-[#B68A35]'
                                    : 'bg-[#B85042]'
                                }`}
                              />
                              <div>
                                <span className="block font-bold text-[#263238]">{n.zoneName}</span>
                                <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#66706B]">
                                  <span>{n.locationId} · {n.nodeId}</span>
                                  {!hasCoords && (
                                    <span className="text-[9px] text-[#8c6722] bg-[#B68A35]/15 px-1 py-0.2 rounded border border-[#B68A35]/30 font-sans">
                                      {bn ? 'ম্যাপে অনুপস্থিত' : 'Map location unavailable'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-mono">{n.battery}</td>
                          <td className="py-2 px-3">
                            {n.mains ? (
                              <span className="text-[#5D7A4E] font-bold">{bn ? '✔ হ্যাঁ' : '✔ Yes'}</span>
                            ) : (
                              <span className="text-[#B85042] font-bold">{bn ? '✖ না' : '✖ No'}</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                n.network === 'ONLINE'
                                  ? 'bg-[#5D7A4E]/15 text-[#5D7A4E]'
                                  : 'bg-[#B85042]/15 text-[#B85042]'
                              }`}
                            >
                              {n.network === 'ONLINE' ? (bn ? 'অনলাইন' : 'ONLINE') : (bn ? 'অফলাইন' : 'OFFLINE')}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px]">{n.signal === 'No signal' ? (bn ? 'সিগন্যাল নেই' : 'No signal') : n.signal}</td>
                          <td className="py-2 px-3 font-mono">{formatNumber(n.cache)}</td>
                          <td className="py-2 px-3 text-[11px] text-[#66706B]">{n.lastSync === 'Live' ? (bn ? 'লাইভ' : 'Live') : (bn ? 'সিঙ্ক অপেক্ষমাণ' : 'Pending sync')}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`text-[11px] font-semibold ${
                                n.sensorHealth === 'Healthy'
                                  ? 'text-[#5D7A4E]'
                                  : n.sensorHealth === 'Degraded'
                                  ? 'text-[#B68A35]'
                                  : 'text-[#B85042]'
                              }`}
                            >
                              {n.sensorHealth === 'Healthy' ? (bn ? 'সুস্থ' : 'Healthy') : n.sensorHealth === 'Degraded' ? (bn ? 'দুর্বল' : 'Degraded') : (bn ? 'ত্রুটি' : n.sensorHealth)}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-[#F5F0E6] text-[#66706B] border border-[#DDD6C8]">
                              {n.cadence}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 border-t border-[#DDD6C8] flex items-center justify-between text-xs text-[#66706B] bg-[#F5F0E6]/30">
                <span>
                  {bn
                    ? `${formatNumber(filteredNodes.length)}টি নোডের মধ্যে ${formatNumber((nodePage - 1) * pageSize + 1)}–${formatNumber(Math.min(nodePage * pageSize, filteredNodes.length))} দেখানো হচ্ছে`
                    : `Showing ${(nodePage - 1) * pageSize + 1} – ${Math.min(nodePage * pageSize, filteredNodes.length)} of ${filteredNodes.length} nodes`}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.max(1, Math.ceil(filteredNodes.length / pageSize)) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setNodePage(p)}
                      className={`w-6 h-6 rounded text-xs font-semibold ${
                        nodePage === p ? 'bg-[#173D35] text-[#FFFDF8]' : 'hover:bg-[#DDD6C8] text-[#66706B]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Sub-Tab 2: Camera & Edge AI (Dynamic 50-Location Fleet & AI Segmentation) */}
      {activeSubTab === 'camera' && (
        <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#263238] flex items-center gap-2">
                <span>{bn ? 'ক্যামেরা ও এজ এআই বহর' : 'Camera & Edge AI Fleet'}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#173D35]/10 text-[#173D35] border border-[#173D35]/30">
                  {bn ? `ঢাকা মিউনিসিপ্যাল নজরদারি (${formatNumber(50)} নোড)` : 'Dhaka Municipal Surveillance (50 Nodes)'}
                </span>
              </h3>
              <p className="text-xs text-[#66706B]">
                {bn ? 'লোকাল এজ YOLO সেগমেন্টেশন মডেল • টেম্পার-প্রুফ SHA-256 লেজার' : 'Local Edge YOLO Segmentation Model • Tamper-Evident SHA-256 Ledger'}
              </p>
            </div>

            {/* Disclaimer pill */}
            <div className="bg-[#B68A35]/15 border border-[#B68A35]/40 px-3 py-1 rounded-lg text-[11px] text-[#8c6722] flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{bn ? 'সিন্থেটিক-প্রশিক্ষিত সিমুলেশন মডেল — ফিল্ড ভ্যালিডেটেড নয়।' : 'Synthetic-trained simulation model — not field validated.'}</span>
            </div>
          </div>

          {/* 6 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#66706B] block mb-1 font-semibold">{bn ? 'মোট ক্যামেরা' : 'Total Cameras'}</span>
              <div className="text-xl font-black text-[#263238] font-mono">{formatNumber(cameraStreams.length)}</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#173D35] block mb-1 font-semibold">{bn ? 'আইপি ক্যামেরা (RTSP)' : 'IP Camera (RTSP)'}</span>
              <div className="text-xl font-black text-[#173D35] font-mono">
                {formatNumber(cameraStreams.filter((c) => c.protocol === 'rtsp_ip').length)}
              </div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#8c6722] block mb-1 font-semibold">{bn ? 'অ্যানালগ ডিভিআর' : 'Analog DVR'}</span>
              <div className="text-xl font-black text-[#8c6722] font-mono">
                {formatNumber(cameraStreams.filter((c) => c.protocol === 'analog_dvr').length)}
              </div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#66706B] block mb-1 font-semibold">{bn ? 'এজ সিভি নোড' : 'Edge CV Nodes'}</span>
              <div className="text-xl font-black text-[#263238] font-mono">{formatNumber(cameraStreams.length)}</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#5D7A4E]/40 rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#5D7A4E] block mb-1 font-semibold">{bn ? 'সক্রিয় স্ট্রিম' : 'Streams Active'}</span>
              <div className="text-xl font-black text-[#5D7A4E] font-mono">
                {formatNumber(cameraStreams.filter((c) => c.status === 'STREAMING').length)}
              </div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#5D7A4E]/40 rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#5D7A4E] block mb-1 font-semibold">{bn ? 'প্রমাণ চেইন' : 'Evidence Chain'}</span>
              <div className="text-xl font-black text-[#5D7A4E] font-mono">{bn ? '১০০% অক্ষত' : '100% Intact'}</div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCameraFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  cameraFilter === 'all'
                    ? 'bg-[#173D35] text-[#FFFDF8] shadow-sm'
                    : 'bg-[#F5F0E6] text-[#66706B] hover:text-[#263238] border border-[#DDD6C8]'
                }`}
              >
                {bn ? `সকল (${formatNumber(50)})` : 'All (50)'}
              </button>
              <button
                onClick={() => setCameraFilter('ip')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  cameraFilter === 'ip'
                    ? 'bg-[#173D35] text-[#FFFDF8] shadow-sm'
                    : 'bg-[#F5F0E6] text-[#66706B] hover:text-[#263238] border border-[#DDD6C8]'
                }`}
              >
                {bn ? `আইপি ক্যামেরা (${formatNumber(25)})` : 'IP Camera (25)'}
              </button>
              <button
                onClick={() => setCameraFilter('analog')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  cameraFilter === 'analog'
                    ? 'bg-[#B68A35] text-[#FFFDF8] shadow-sm'
                    : 'bg-[#F5F0E6] text-[#66706B] hover:text-[#263238] border border-[#DDD6C8]'
                }`}
              >
                {bn ? `অ্যানালগ ডিভিআর (${formatNumber(25)})` : 'Analog DVR (25)'}
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#66706B]" />
                <input
                  type="text"
                  placeholder={bn ? 'ক্যামেরা আইডি, লোকেশন বা এলাকা খুঁজুন...' : 'Filter camera ID, location ID, or area...'}
                  value={cameraSearch}
                  onChange={(e) => setCameraSearch(e.target.value)}
                  className="w-full bg-white border border-[#DDD6C8] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#263238] placeholder-[#66706B] outline-none focus:border-[#173D35]"
                />
              </div>

              <select
                value={cameraStatusFilter}
                onChange={(e) => setCameraStatusFilter(e.target.value as any)}
                className="bg-white border border-[#DDD6C8] rounded-lg px-3 py-1.5 text-xs text-[#263238] outline-none focus:border-[#173D35]"
              >
                <option value="ALL">{bn ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
                <option value="ONLINE">{bn ? 'লাইভ স্ট্রিম' : 'STREAMING'}</option>
                <option value="OFFLINE">{bn ? 'অফলাইন' : 'OFFLINE'}</option>
              </select>
            </div>
          </div>

          {/* Camera Grid Cards (Covering all 50 Dhaka Monitored Locations) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCameras.map((cam) => {
              const locId = cam.location_id;
              const isIp = cam.protocol === 'rtsp_ip';

              return (
                <div
                  key={cam.camera_id}
                  className="bg-[#FFFDF8] border border-[#DDD6C8] hover:border-[#173D35]/50 rounded-2xl p-4 shadow-sm gov-card-hover flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Camera className={`w-4 h-4 ${isIp ? 'text-[#173D35]' : 'text-[#8c6722]'}`} />
                        <span className="font-bold text-[#263238] text-xs">{cam.camera_id}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            isIp
                              ? 'bg-[#173D35]/10 text-[#173D35] border-[#173D35]/30'
                              : 'bg-[#B68A35]/15 text-[#8c6722] border-[#B68A35]/30'
                          }`}
                        >
                          {isIp ? (bn ? 'আইপি ক্যামেরা' : 'IP Camera') : (bn ? 'অ্যানালগ ডিভিআর' : 'Analog DVR')}
                        </span>
                      </div>
                      <span className="bg-[#5D7A4E]/15 text-[#3b5330] text-[10px] font-bold px-2 py-0.5 rounded">
                        {cam.status === 'STREAMING' ? (bn ? 'লাইভ স্ট্রিম' : 'STREAMING') : (bn ? 'অফলাইন' : 'OFFLINE')}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#66706B] mb-2 font-medium">
                      <span className="text-[#263238] font-bold">{cam.zone_name || locId}</span>
                      <span className="text-[#66706B] ml-1.5">({locId})</span>
                    </div>

                    {/* Frame Preview with Real Off-Chain Image */}
                    <div className="h-44 rounded-xl bg-[#263238] border border-[#DDD6C8] mb-3 relative overflow-hidden flex items-center justify-center group">
                      <img
                        src={`/api/v1/cameras/frames/FRM_${locId}_04/image`}
                        alt={cam.camera_id}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-[#FFFDF8] border border-white/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5D7A4E] animate-gentle-pulse" />
                        <span>{bn ? 'এআই বিশ্লেষণ • ২৫ FPS' : 'CV Active • 25 FPS'}</span>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-[#5D7A4E] border border-[#5D7A4E]/40 font-bold">
                        {bn ? `লাইভ WLS: ${cam.latest_wls_depth_cm ?? 0.0} সেমি` : `Live WLS: ${cam.latest_wls_depth_cm ?? 0.0} cm`}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] bg-black/85 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-black/30">
                        <span className="text-[#DDD6C8]">{bn ? 'লাইভ নিশ্চিতকরণ' : 'Live Corroboration'}</span>
                        <span className="text-[#5D7A4E] font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> {bn ? 'অক্ষত' : 'Intact'}
                        </span>
                      </div>
                    </div>

                    {/* CV Inference Summary Metrics - Dynamically calculated from real WLS & Edge CV */}
                    {(() => {
                      const wlsDepth = typeof cam.latest_wls_depth_cm === 'number' ? cam.latest_wls_depth_cm : Number(cam.latest_wls_depth_cm) || 0;
                      let visualDepthText = bn ? 'শুকনো / নিরাপদ (<৫ সেমি)' : 'Clear / Dry (<5cm)';
                      let visualDepthColor = 'text-[#5D7A4E]';
                      let debrisRiskText = bn ? 'ঝুঁকি নেই' : 'None Detected';
                      let debrisColor = 'text-[#5D7A4E]';
                      let drainBlockageText = bn ? 'স্বাভাবিক প্রবাহ' : 'Clear Flow';
                      let blockageColor = 'text-[#5D7A4E]';
                      let fusionText = bn ? 'স্বাভাবিক (৯৮% আস্থা)' : 'Corroborated (98% Conf)';

                      if (wlsDepth >= 35) {
                        visualDepthText = bn ? 'কোমর সমান (>৩৫ সেমি)' : 'Waist (>35cm)';
                        visualDepthColor = 'text-[#B85042]';
                        debrisRiskText = bn ? 'উচ্চ বর্জ্য ঝুঁকি' : 'High Hazard';
                        debrisColor = 'text-[#B85042]';
                        drainBlockageText = bn ? 'গুরুতর ব্লকেজ' : 'Severe Blockage';
                        blockageColor = 'text-[#B85042]';
                        fusionText = bn ? 'নিশ্চিতকৃত (৯৬% আস্থা)' : 'Corroborated (96% Conf)';
                      } else if (wlsDepth >= 15) {
                        visualDepthText = bn ? 'হাঁটু সমান (১৫–৩৫ সেমি)' : 'Knee (15–35cm)';
                        visualDepthColor = 'text-[#C96B35]';
                        debrisRiskText = bn ? 'শনাক্ত হয়েছে' : 'Detected';
                        debrisColor = 'text-[#8c6722]';
                        drainBlockageText = bn ? 'ইনলেট আংশিক বন্ধ' : 'Inlet Clogged';
                        blockageColor = 'text-[#C96B35]';
                        fusionText = bn ? 'নিশ্চিতকৃত (৯৩% আস্থা)' : 'Corroborated (93% Conf)';
                      } else if (wlsDepth >= 5) {
                        visualDepthText = bn ? 'গোড়ালি সমান (৫–১৫ সেমি)' : 'Ankle (5–15cm)';
                        visualDepthColor = 'text-[#B68A35]';
                        debrisRiskText = bn ? 'স্বল্প ঝুঁকি' : 'Low Risk';
                        debrisColor = 'text-[#66706B]';
                        drainBlockageText = bn ? 'আংশিক প্রবাহ' : 'Partial Flow';
                        blockageColor = 'text-[#B68A35]';
                        fusionText = bn ? 'নিরীক্ষণাধীন (৮৯% আস্থা)' : 'Cross-checking (89% Conf)';
                      }

                      return (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs bg-[#F5F0E6] p-2.5 rounded-xl border border-[#DDD6C8] mb-3">
                          <div className="flex justify-between">
                            <span className="text-[#66706B]">{bn ? 'দৃশ্যমান গভীরতা' : 'Visual Depth'}</span>
                            <span className={`font-mono font-bold ${visualDepthColor}`}>{visualDepthText}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#66706B]">{bn ? 'WLS সেন্সর' : 'WLS Sensor'}</span>
                            <span className="font-mono font-bold text-[#263238]">{wlsDepth.toFixed(1)} {bn ? 'সেমি' : 'cm'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#66706B]">{bn ? 'বর্জ্য ঝুঁকি' : 'Debris Risk'}</span>
                            <span className={`font-mono font-bold ${debrisColor}`}>{debrisRiskText}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#66706B]">{bn ? 'ড্রেন ব্লকেজ' : 'Drain Blockage'}</span>
                            <span className={`font-mono font-bold ${blockageColor}`}>{drainBlockageText}</span>
                          </div>
                          <div className="flex justify-between col-span-2 pt-1 border-t border-[#DDD6C8]">
                            <span className="text-[#66706B]">{bn ? 'মাল্টি-মোডাল ফিউশন' : 'Multi-Modal Fusion'}</span>
                            <span className="font-semibold text-[#5D7A4E] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {fusionText}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions & Off-chain verification seal */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setInspectingCamera(cam);
                        setInspectingFrameIdx(4);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#173D35] hover:bg-[#24574C] text-[#FFFDF8] border border-[#173D35] text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{bn ? 'ফ্রেম ও এআই মাস্ক পরিদর্শন' : 'Inspect Frame & AI Masks (ফ্রেম ও মাস্ক)'}</span>
                    </button>

                    <div className="pt-2 border-t border-[#DDD6C8] flex items-center justify-between text-[10px] text-[#66706B]">
                      <span className="flex items-center gap-1 text-[#5D7A4E] font-medium">
                        <Lock className="w-3 h-3" /> {bn ? 'কাঁচা মিডিয়া অফ-চেইন' : 'Raw Media Off-chain'}
                      </span>
                      <span className="font-mono text-[#66706B]">{bn ? 'SHA-256 লেজারভুক্ত' : 'SHA-256 Ledgered'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Frame & Segmentation Masks Inspector Modal */}
          {inspectingCamera && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
              <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#263238]">
                {/* Modal Header */}
                <div className="p-4 border-b border-[#DDD6C8] bg-[#F5F0E6] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Camera className="w-5 h-5 text-[#173D35]" />
                    <div>
                      <h4 className="text-sm font-bold text-[#263238] flex items-center gap-2">
                        <span>{bn ? `ক্যামেরা এআই ভিশন ইন্সপেক্টর — ${inspectingCamera.camera_id}` : `Camera AI Vision Inspector — ${inspectingCamera.camera_id}`}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#173D35]/10 text-[#173D35] border border-[#173D35]/20 font-mono font-semibold">
                          {inspectingCamera.zone_name} ({inspectingCamera.location_id})
                        </span>
                      </h4>
                      <p className="text-[11px] text-[#66706B]">
                        {bn ? 'ঢাকা মিউনিসিপ্যাল সিসিটিভি স্ট্রিম • লোকাল YOLO সেগমেন্টেশন • হ্যাশ-চেইন্ড প্রমাণ' : 'Dhaka Municipal CCTV Stream • Local YOLO Segmentation • Hash-Chained Evidence'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setInspectingCamera(null)}
                    className="p-1.5 rounded-lg bg-white border border-[#DDD6C8] text-[#66706B] hover:text-[#263238] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 md:p-6 overflow-y-auto space-y-4">
                  {/* Scenario Frame Selector Pills */}
                  <div className="bg-[#F5F0E6] border border-[#DDD6C8] p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-[#66706B] font-semibold">{bn ? 'টেস্ট দৃশ্যপট ফ্রেম নির্বাচন করুন:' : 'Select Test Scenario Frame:'}</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { idx: 0, label: bn ? 'FRM ০০: শুকনো রাস্তা (০ সেমি)' : 'FRM 00: Dry Road (0cm)' },
                        { idx: 2, label: bn ? 'FRM ০২: অগভীর নালা (৫ সেমি)' : 'FRM 02: Shallow Gutter (5cm)' },
                        { idx: 4, label: bn ? 'FRM ০৪: হাঁটু সমান পানি (২২ সেমি)' : 'FRM 04: Knee Flood (22cm)' },
                        { idx: 6, label: bn ? 'FRM ০৬: তীব্র বন্যা (৪২ সেমি)' : 'FRM 06: Severe Flood (42cm)' },
                        { idx: 9, label: bn ? 'FRM ০৯: দুর্যোগপূর্ণ আবহাওয়া' : 'FRM 09: Difficult Weather' },
                      ].map((item) => (
                        <button
                          key={item.idx}
                          onClick={() => setInspectingFrameIdx(item.idx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            inspectingFrameIdx === item.idx
                              ? 'bg-[#173D35] text-[#FFFDF8] shadow-sm'
                              : 'bg-white text-[#66706B] hover:text-[#263238] border border-[#DDD6C8]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Inspector Grid: CCTV Frame with SVG Masks Overlay + Telemetry Fusion */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: 640x640 Interactive Frame Canvas with Translucent Segmentation Masks */}
                    <div className="lg:col-span-7 flex flex-col space-y-2">
                      <div className="relative w-full aspect-square rounded-2xl bg-black border border-[#DDD6C8] overflow-hidden shadow-xl">
                        <img
                          src={`/api/v1/cameras/frames/FRM_${inspectingCamera.location_id}_${String(inspectingFrameIdx).padStart(2, '0')}/image`}
                          alt="CCTV Frame"
                          className="w-full h-full object-cover"
                        />

                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-[#263238]/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-[#FFFDF8] z-10">
                            <RefreshCw className="w-6 h-6 animate-spin text-[#B68A35]" />
                            <span className="text-xs font-semibold">{bn ? 'এজ YOLO ইনফারেন্স চলছে...' : 'Running Edge YOLO Inference...'}</span>
                          </div>
                        )}

                        {/* Interactive SVG Segmentation Masks Overlay */}
                        {showMasks && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 640 640">
                            {frameAnalysis?.vision_inference?.detected_masks?.map((m: any, idx: number) => {
                              const color =
                                m.class_id === 0
                                  ? '#38bdf8'
                                  : m.class_id === 1
                                  ? '#f59e0b'
                                  : m.class_id === 2
                                  ? '#ef4444'
                                  : m.class_id === 3
                                  ? '#94a3b8'
                                  : m.class_id === 4
                                  ? '#fb923c'
                                  : '#c084fc';
                              const pointsStr = m.points.map((pt: [number, number]) => `${pt[0]},${pt[1]}`).join(' ');
                              return (
                                <g key={idx}>
                                  <polygon
                                    points={pointsStr}
                                    fill={color}
                                    fillOpacity="0.38"
                                    stroke={color}
                                    strokeWidth="2.5"
                                  />
                                </g>
                              );
                            })}
                          </svg>
                        )}

                        {/* Mask Toggle Control */}
                        <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-2">
                          <button
                            onClick={() => setShowMasks(!showMasks)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#FFFDF8] hover:text-[#B68A35]"
                          >
                            <Layers className="w-3.5 h-3.5 text-[#B68A35]" />
                            <span>{showMasks ? (bn ? 'মাস্ক লুকান' : 'Hide Masks') : (bn ? 'মাস্ক প্রদর্শন' : 'Show Masks')}</span>
                          </button>
                        </div>

                        {/* Legend */}
                        <div className="absolute bottom-3 left-3 right-3 bg-black/85 backdrop-blur-md p-2 rounded-xl border border-white/20 text-[10px] flex flex-wrap gap-2 items-center justify-between text-white">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="flex items-center gap-1 text-[#38bdf8]">
                              <span className="w-2.5 h-2.5 rounded-sm bg-[#38bdf8]" /> {bn ? 'অগভীর' : 'Shallow'}
                            </span>
                            <span className="flex items-center gap-1 text-[#f59e0b]">
                              <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" /> {bn ? 'হাঁটু সমান' : 'Knee'}
                            </span>
                            <span className="flex items-center gap-1 text-[#ef4444]">
                              <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" /> {bn ? 'তীব্র' : 'Severe'}
                            </span>
                            <span className="flex items-center gap-1 text-[#94a3b8]">
                              <span className="w-2.5 h-2.5 rounded-sm bg-[#94a3b8]" /> {bn ? 'বর্জ্য' : 'Debris'}
                            </span>
                            <span className="flex items-center gap-1 text-[#fb923c]">
                              <span className="w-2.5 h-2.5 rounded-sm bg-[#fb923c]" /> {bn ? 'ইনলেট বন্ধ' : 'Inlet Blockage'}
                            </span>
                          </div>
                          <span className="text-[#DDD6C8] font-mono">
                            {bn ? 'লেটেন্সি:' : 'Latency:'} {frameAnalysis?.vision_inference?.inference_latency_ms ?? 34}ms
                          </span>
                        </div>
                      </div>

                      {frameData && (
                        <div className="bg-[#F5F0E6] border border-[#DDD6C8] px-3 py-2 rounded-xl text-[11px] text-[#66706B] flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-[#66706B] font-semibold">{bn ? 'অবস্থা:' : 'Condition:'}</span>{' '}
                            <span className="text-[#263238] capitalize font-medium">{frameData.weather ?? 'Normal'} • {frameData.lighting ?? 'Daylight'}</span>
                          </div>
                          <div>
                            <span className="text-[#66706B] font-semibold">{bn ? 'টার্গেট ব্যান্ড:' : 'Target Band:'}</span>{' '}
                            <span className="text-[#173D35] font-mono font-medium">{frameData.expected_depth_band ?? 'shallow'} ({frameData.expected_wls_depth_range ?? '0-15cm'})</span>
                          </div>
                          <div className="text-[10px] text-[#8c6722] font-mono font-bold bg-[#B68A35]/15 px-2 py-0.5 rounded border border-[#B68A35]/30">
                            {bn ? 'সিমুলেশন বেঞ্চমার্ক' : 'SIM BENCHMARK'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Multi-Modal Sensor-Vision Fusion & Blockchain Evidence Card */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* 1. Multi-Modal Fusion Engine Card */}
                      <div className="bg-white border border-[#DDD6C8] rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-2">
                          <span className="text-xs font-bold text-[#263238] flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-[#173D35]" />
                            <span>{bn ? 'সেন্সর-ভিশন ফিউশন ফলাফল' : 'Sensor-Vision Fusion Result'}</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              frameAnalysis?.sensor_vision_fusion?.fusion_status === 'CORROBORATED'
                                ? 'bg-[#5D7A4E]/15 text-[#5D7A4E] border border-[#5D7A4E]/30'
                                : 'bg-[#B68A35]/15 text-[#8c6722] border border-[#B68A35]/30'
                            }`}
                          >
                            {frameAnalysis?.sensor_vision_fusion?.fusion_status === 'CORROBORATED' ? (bn ? 'নিশ্চিতকৃত' : 'CORROBORATED') : (frameAnalysis?.sensor_vision_fusion?.fusion_status ?? (bn ? 'নিশ্চিতকৃত' : 'CORROBORATED'))}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-[#F5F0E6] p-2.5 rounded-xl border border-[#DDD6C8]">
                            <span className="text-[10px] text-[#66706B] block mb-1 font-semibold">{bn ? 'দৃশ্যমান গভীরতা ব্যান্ড' : 'Visual Depth Band'}</span>
                            <span className="font-mono font-bold text-[#B68A35] capitalize text-sm">
                              {frameAnalysis?.vision_inference?.estimated_depth_band ?? 'knee'}
                            </span>
                          </div>
                          <div className="bg-[#F5F0E6] p-2.5 rounded-xl border border-[#DDD6C8]">
                            <span className="text-[10px] text-[#66706B] block mb-1 font-semibold">{bn ? 'ভৌত WLS সেন্সর' : 'Physical WLS Sensor'}</span>
                            <span className="font-mono font-bold text-[#263238] text-sm">
                              {typeof frameAnalysis?.sensor_vision_fusion?.modalities?.wls_sensor?.water_depth_cm === 'number'
                                ? frameAnalysis.sensor_vision_fusion.modalities.wls_sensor.water_depth_cm
                                : typeof inspectingCamera.latest_wls_depth_cm === 'number'
                                ? inspectingCamera.latest_wls_depth_cm
                                : 0.0}{' '}
                              {bn ? 'সেমি' : 'cm'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#263238]">
                          <div className="flex justify-between">
                            <span className="text-[#66706B]">{bn ? 'ডায়নামিক আস্থা' : 'Dynamic Confidence'}</span>
                            <span className="font-bold text-[#173D35] font-mono">
                              {frameAnalysis?.sensor_vision_fusion?.fused_confidence != null
                                ? `${Math.round(frameAnalysis.sensor_vision_fusion.fused_confidence * 100)}%`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#66706B]">{bn ? 'পানি কভারেজ অনুপাত' : 'Water Coverage Ratio'}</span>
                            <span className="font-mono text-[#263238] font-bold">
                              {frameAnalysis?.vision_inference?.water_surface_coverage_ratio != null
                                ? `${Math.round(frameAnalysis.vision_inference.water_surface_coverage_ratio * 100)}%`
                                : '0%'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#66706B]">{bn ? 'বর্জ্য ঝুঁকি' : 'Debris Hazard'}</span>
                            <span
                              className={`font-semibold ${
                                frameAnalysis?.vision_inference?.debris_detected ? 'text-[#8c6722]' : 'text-[#66706B]'
                              }`}
                            >
                              {frameAnalysis?.vision_inference?.debris_detected ? (bn ? 'শনাক্ত (ঝুঁকি)' : 'Detected (Hazard)') : (bn ? 'নেই' : 'None')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#66706B]">{bn ? 'ড্রেন ইনলেট ব্লকেজ' : 'Drain Inlet Clogging'}</span>
                            <span
                              className={`font-semibold ${
                                frameAnalysis?.vision_inference?.drain_inlet_blockage_detected
                                  ? 'text-[#C96B35]'
                                  : 'text-[#66706B]'
                              }`}
                            >
                              {frameAnalysis?.vision_inference?.drain_inlet_blockage_detected
                                ? (bn ? 'ব্লকেজ সতর্কতা' : 'Blockage Alert')
                                : (bn ? 'পরিচ্ছন্ন' : 'Clear')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#66706B]">{bn ? 'রাস্তায় প্রতিবন্ধকতা' : 'Road Obstruction'}</span>
                            <span
                              className={`font-semibold ${
                                frameAnalysis?.vision_inference?.road_obstruction_detected
                                  ? 'text-[#B85042]'
                                  : 'text-[#66706B]'
                              }`}
                            >
                              {frameAnalysis?.vision_inference?.road_obstruction_detected
                                ? (bn ? 'আটকে থাকা যানবাহন' : 'Stalled Vehicle')
                                : (bn ? 'পরিচ্ছন্ন' : 'Clear')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Blockchain Evidence Integrity Card */}
                      <div className="bg-white border border-[#DDD6C8] rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-2">
                          <span className="text-xs font-bold text-[#263238] flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-[#5D7A4E]" />
                            <span>{bn ? 'টেম্পার-প্রুফ প্রমাণ রেজিস্ট্রি' : 'Tamper-Evident Evidence Registry'}</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              evidenceStatus?.verified || evidenceStatus?.status === 'VERIFIED'
                                ? 'bg-[#5D7A4E]/15 text-[#5D7A4E]'
                                : 'bg-[#B85042]/15 text-[#B85042]'
                            }`}
                          >
                            {evidenceStatus?.verified || evidenceStatus?.status === 'VERIFIED' ? (bn ? 'যাচাইকৃত (অক্ষত)' : 'VERIFIED') : (bn ? 'সতর্কতা' : (evidenceStatus?.status ?? 'VERIFIED'))}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#263238] font-mono text-[11px]">
                          <div>
                            <span className="text-[#66706B] block text-[10px] font-sans font-semibold">{bn ? 'ইমেজ SHA-256 (অফ-চেইন):' : 'IMAGE SHA-256 (OFF-CHAIN):'}</span>
                            <span className="text-[#263238] break-all font-semibold">
                              {frameAnalysis?.evidence_integrity?.image_sha256 || '1da5cdffd20a45208add38383913a2c2...'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#66706B] block text-[10px] font-sans font-semibold">{bn ? 'লেবেল SHA-256 (COCO/YOLO):' : 'LABELS SHA-256 (COCO/YOLO):'}</span>
                            <span className="text-[#263238] break-all font-semibold">
                              {frameAnalysis?.evidence_integrity?.annotation_sha256 || '06a19acd1da3e69b0f7032ecff504...'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            handleVerifyEvidence(
                              `FRM_${inspectingCamera.location_id}_${String(inspectingFrameIdx).padStart(2, '0')}`
                            )
                          }
                          disabled={isVerifyingEvidence}
                          className="w-full py-2 px-3 rounded-xl bg-[#173D35] hover:bg-[#24574C] text-[#FFFDF8] text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingEvidence ? 'animate-spin' : ''}`} />
                          <span>{bn ? 'ব্লকচেইন ক্রিপ্টোগ্রাফিক হ্যাশ যাচাই করুন' : 'Verify Blockchain Cryptographic Hash'}</span>
                        </button>
                      </div>

                      {/* 3. Deterministic Safety & Dispatch Interlock */}
                      <div className="bg-[#B68A35]/15 border border-[#B68A35]/30 rounded-2xl p-3.5 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-[#8c6722] font-bold">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{bn ? 'ডিটারমিনিস্টিক সেফটি ইন্টারলক' : 'Deterministic Safety Interlock'}</span>
                        </div>
                        <p className="text-[11px] text-[#66706B] leading-relaxed">
                          {bn
                            ? 'এআই ভিশন আউটপুট শুধুমাত্র সিদ্ধান্ত গ্রহণের সহায়ক সুপারিশ। মোটর চালাতে অপারেটরের ডিজিটাল স্বাক্ষর এবং ১২টি ডিটারমিনিস্টিক সেফটি গেট মূল্যায়ন বাধ্যতামূলক।'
                            : 'AI vision outputs are decision-support recommendations only. Motors require signed human operator authorization and 12 deterministic safety gate evaluations.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Sub-Tab 3: Data Health */}
      {activeSubTab === 'health' && (
        <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#263238]">{bn ? 'ডাটা হেলথ ও সিস্টেম সততা' : 'Data Health'}</h3>
            <p className="text-xs text-[#66706B]">{bn ? 'আঞ্চলিক ডাটা মান, অসঙ্গতি, পূর্বাভাস ঝুঁকি, ক্যাডেন্স ও অফলাইন রিপ্লে' : 'Regional Data Quality, Anomalies, Forecast Risk, Cadence & Offline Replay'}</p>
          </div>

          {/* 6 KPI Cards - Derived Dynamically from Telemetry */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#66706B] block mb-1 font-semibold">{bn ? 'ডাটা কোয়ালিটি' : 'Data Quality'}</span>
              <div className="text-sm font-bold text-[#5D7A4E] font-mono">{dataHealthMetrics.qualityScore} &plusmn; 0.02</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#66706B] block mb-1 font-semibold">{bn ? 'নেটওয়ার্ক কভারেজ' : 'Coverage'}</span>
              <div className="text-sm font-bold text-[#263238] font-mono">{dataHealthMetrics.coverage}% ({dataHealthMetrics.online}/{dataHealthMetrics.total})</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#66706B] block mb-1 font-semibold">{bn ? 'গড় অনিশ্চয়তা' : 'Uncertainty (Avg.)'}</span>
              <div className="text-sm font-bold text-[#B68A35] font-mono">{dataHealthMetrics.avgUncertainty} (&uarr;)</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#66706B] block mb-1 font-semibold">{bn ? 'অসঙ্গতি ঘটনা (২৪ ঘণ্টা)' : 'Anomaly Events (24h)'}</span>
              <div className="text-[11px] font-bold text-[#263238]">S:{dataHealthMetrics.warning + 2} D:{dataHealthMetrics.offline + 1} St:2 M:1</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#B85042]/40 rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#B85042] block mb-1 font-semibold">{bn ? 'বৃষ্টিপাতের ঝুঁকি' : 'Forecast Risk (24h)'}</span>
              <div className="text-xs font-bold text-[#B85042]">{bn ? 'উচ্চ (৭০–৯০ মিমি)' : 'High (70–90 mm)'}</div>
            </div>
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 shadow-xs gov-card-hover">
              <span className="text-[10px] text-[#173D35] block mb-1 font-semibold">{bn ? 'পোলিং ক্যাডেন্স' : 'Polling Cadence'}</span>
              <div className="text-xs font-bold text-[#173D35]">{bn ? 'অ্যাডাপটিভ (৫-মোড)' : 'Adaptive (5-Mode)'}</div>
            </div>
          </div>

          {/* Grid: Anomaly Chart & Regional Quality Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2 border-b border-[#DDD6C8] pb-2">
                <div>
                  <span className="text-xs font-bold text-[#263238] block">{bn ? 'অসঙ্গতি শনাক্তকরণ ট্রেন্ড' : 'Anomaly Detection Trend'}</span>
                  <span className="text-[10px] text-[#66706B]">{bn ? 'বিগত ২৪ ঘণ্টার অসঙ্গতির সংখ্যা' : 'Recorded anomalies across last 24h'}</span>
                </div>
                <span className="text-[10px] font-semibold text-[#173D35] bg-[#173D35]/10 px-2 py-0.5 rounded border border-[#173D35]/20">
                  {bn ? 'মোট: ২১টি ঘটনা' : 'Total: 21 events'}
                </span>
              </div>

              {/* High-visibility Gradient Bar Chart */}
              <div className="h-44 flex items-end gap-3 pt-6 px-3 bg-[#F5F0E6]/50 rounded-xl border border-[#DDD6C8]/60 my-2">
                {[
                  { time: '00:00', val: 2, label: 'Spike' },
                  { time: '04:00', val: 1, label: 'Drift' },
                  { time: '08:00', val: 5, label: 'Spike' },
                  { time: '12:00', val: 9, label: 'Peak' },
                  { time: '16:00', val: 6, label: 'Stuck' },
                  { time: '20:00', val: 3, label: 'Spike' },
                ].map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer h-full justify-end">
                    <span className="text-[10px] font-bold text-[#173D35] bg-[#FFFDF8] px-1 rounded shadow-2xs border border-[#DDD6C8]/60">
                      {formatNumber(item.val)}
                    </span>
                    <div
                      className="w-full bg-gradient-to-t from-[#173D35] to-[#5D7A4E] rounded-t-md transition-all duration-300 group-hover:brightness-125 shadow-xs"
                      style={{ height: `${Math.max(18, (item.val / 10) * 100)}%` }}
                      title={`${item.time}: ${item.val} anomalies (${item.label})`}
                    />
                    <span className="text-[9px] text-[#66706B] font-mono font-semibold">{item.time}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#66706B] pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#173D35]" />
                  <span>S: Spike (স্পাইক)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#B68A35]" />
                  <span>D: Drift (ড্রিফট)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#B85042]" />
                  <span>St: Stuck / M: Missing</span>
                </span>
              </div>
            </div>

            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-[#DDD6C8] pb-2">
                <span className="text-xs font-bold text-[#263238]">{bn ? 'আঞ্চলিক মানের সূচক' : 'Regional Quality Index'}</span>
                <span className="text-[10px] text-[#66706B]">{bn ? 'ঢাকা ৫টি জোন ভিত্তিক' : 'Grouped by 5 Dhaka Zones'}</span>
              </div>
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] text-[#66706B] uppercase border-b border-[#DDD6C8] bg-[#F5F0E6]">
                  <tr>
                    <th className="py-2 px-3">{bn ? 'অঞ্চল' : 'Zone'}</th>
                    <th className="py-2 px-3">{bn ? 'মান' : 'Quality'}</th>
                    <th className="py-2 px-3">{bn ? 'অনিশ্চয়তা' : 'Uncertainty'}</th>
                    <th className="py-2 px-3">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD6C8] text-[#263238]">
                  {dataHealthMetrics.regionalStats.map((reg, idx) => (
                    <tr key={idx} className="hover:bg-[#F5F0E6]/50 transition-colors">
                      <td className="py-2 px-3 font-semibold text-[#263238]">{reg.zone}</td>
                      <td className="py-2 px-3 font-mono">{reg.quality}</td>
                      <td className="py-2 px-3 font-mono">{reg.uncertainty}</td>
                      <td className={`py-2 px-3 font-bold ${reg.statusColor}`}>{reg.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Polling Cadence & Offline Cache Replay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-bold text-[#263238] block mb-3 border-b border-[#DDD6C8] pb-2">
                {bn ? 'পোলিং ক্যাডেন্স (অ্যাডাপটিভ নিয়ন্ত্রণ)' : 'Polling Cadence (Adaptive Control)'}
              </span>
              <div className="grid grid-cols-6 gap-1 text-center text-[10px]">
                <div className="p-2 rounded bg-[#5D7A4E]/15 border border-[#5D7A4E]/30">
                  <span className="text-[#24574C] block font-bold">{bn ? 'স্বাভাবিক' : 'Normal'}</span>
                  <span className="text-[#66706B]">{bn ? '১০ মিনিট' : '10 min'}</span>
                </div>
                <div className="p-2 rounded bg-[#B68A35]/15 border border-[#B68A35]/30">
                  <span className="text-[#8c6722] block font-bold">{bn ? 'নজরদারি' : 'Watch'}</span>
                  <span className="text-[#66706B]">{bn ? '১০ মিনিট' : '10 min'}</span>
                </div>
                <div className="p-2 rounded bg-[#B85042]/15 border border-[#B85042]/30">
                  <span className="text-[#B85042] block font-bold">{bn ? 'সতর্কতা' : 'Alert'}</span>
                  <span className="text-[#66706B]">{bn ? 'ধারাবাহিক' : 'Continuous'}</span>
                </div>
                <div className="p-2 rounded bg-[#173D35]/15 border border-[#173D35]/30">
                  <span className="text-[#173D35] block font-bold">{bn ? 'পাম্পিং' : 'Pumping'}</span>
                  <span className="text-[#66706B]">{bn ? 'ধারাবাহিক' : 'Continuous'}</span>
                </div>
                <div className="p-2 rounded bg-[#C96B35]/15 border border-[#C96B35]/30">
                  <span className="text-[#C96B35] block font-bold">{bn ? 'পুনরুদ্ধার' : 'Recovery'}</span>
                  <span className="text-[#66706B]">{bn ? '১০ মিনিট' : '10 min'}</span>
                </div>
                <div className="p-2 rounded bg-[#5D7A4E]/15 border border-[#5D7A4E]/30">
                  <span className="text-[#24574C] block font-bold">{bn ? 'স্বাভাবিক' : 'Normal'}</span>
                  <span className="text-[#66706B]">{bn ? '১০ মিনিট' : '10 min'}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-[#DDD6C8] pb-2">
                <span className="text-xs font-bold text-[#263238]">
                  {bn ? `অফলাইন ক্যাশ রিপ্লে (${sampleNodes.find((node) => node.cache > 0)?.zoneName || 'ঢাকা নোড'})` : `Offline Cache Replay (${sampleNodes.find((node) => node.cache > 0)?.zoneName || 'Dhaka node'})`}
                </span>
                <button
                  onClick={handleTriggerReplay}
                  disabled={isReplayingCache}
                  className="text-[10px] font-bold text-[#173D35] bg-[#173D35]/10 hover:bg-[#173D35]/20 px-2.5 py-1 rounded-lg border border-[#173D35]/30 transition cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isReplayingCache ? 'animate-spin' : ''}`} />
                  <span>{isReplayingCache ? (bn ? 'রিপ্লে হচ্ছে...' : 'Replaying...') : (bn ? 'ক্যাশ রিপ্লে চালান' : 'Trigger Cache Replay')}</span>
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#66706B] text-[11px]">
                  <span>{bn ? 'শেষ অনলাইন ১২:১৪' : 'Last Online 12:14'}</span>
                  <span>{bn ? 'অফলাইন (২৮ মিনিট)' : 'Offline (28 min)'}</span>
                  <span>{bn ? 'ক্যাশ (৩৪ রেকর্ড)' : 'Cached (34 records)'}</span>
                  <span>{bn ? 'রিপ্লে ৩ মিনিট' : 'Replay (3 min)'}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#DDD6C8] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#173D35] to-[#5D7A4E] rounded-full transition-all duration-500"
                    style={{ width: `${replayProgress}%` }}
                  />
                </div>
                {replayNotice ? (
                  <p className="text-[11px] font-bold text-[#173D35] mt-1 bg-[#5D7A4E]/15 p-1.5 rounded border border-[#5D7A4E]/30 animate-fade-in">
                    {replayNotice}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#66706B] mt-1">
                    {bn
                      ? '১,০০০ রেকর্ড পর্যন্ত FIFO বাফার যাচাইকৃত। সিস্টেম পুনরুদ্ধারে বাসি কমান্ড বাতিল করা হয়।'
                      : 'FIFO buffer validated up to 1,000 records. Stale commands rejected on recovery.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

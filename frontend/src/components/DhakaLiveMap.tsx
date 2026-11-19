import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type {
  HotspotFeature,
  InfrastructureFeature,
  DrainChannel,
  LayerFilters,
  SeverityLevel,
} from '../types';
import {
  Map as MapIcon,
  Satellite,
  Moon,
  Key,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  Radio,
  X,
  Check,
  ShieldCheck,
  Globe,
  Layers,
} from 'lucide-react';

interface DhakaLiveMapProps {
  hotspots: HotspotFeature[];
  infrastructure: InfrastructureFeature[];
  drains: DrainChannel[];
  filters: LayerFilters;
  onSelectHotspot: (hotspot: HotspotFeature) => void;
  selectedHotspotId?: string | null;
}

type BasemapType = 'osm' | 'satellite' | 'dark' | 'custom';

interface WeatherMetrics {
  temp: number;
  rain: number;
  humidity: number;
  wind: number;
  lastUpdated: string;
}

const SEVERITY_COLORS: Record<SeverityLevel, { bg: string; border: string; label: string }> = {
  Normal: { bg: '#10b981', border: '#059669', label: 'Normal' },
  Watch: { bg: '#eab308', border: '#ca8a04', label: 'Watch' },
  Waterlogged: { bg: '#f97316', border: '#ea580c', label: 'Waterlogged' },
  Severe: { bg: '#ef4444', border: '#b91c1c', label: 'Severe' },
};

export const DhakaLiveMap: React.FC<DhakaLiveMapProps> = ({
  hotspots,
  infrastructure,
  drains,
  filters,
  onSelectHotspot,
  selectedHotspotId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);

  // Basemap & API Key State
  const [activeBasemap, setActiveBasemap] = useState<BasemapType>(() => {
    return (localStorage.getItem('urban_ai_basemap') as BasemapType) || 'osm';
  });
  const [mapboxToken, setMapboxToken] = useState<string>(() => {
    return localStorage.getItem('urban_ai_mapbox_token') || '';
  });
  const [cartoKey, setCartoKey] = useState<string>(() => {
    return localStorage.getItem('urban_ai_carto_key') || '';
  });
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [keyInputType, setKeyInputType] = useState<'mapbox' | 'carto'>('mapbox');
  const [tempToken, setTempToken] = useState<string>('');
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  // Online Realtime Weather Metrics (Open-Meteo API)
  const [weather, setWeather] = useState<WeatherMetrics | null>(null);

  // Live Doppler Weather Radar (RainViewer API)
  const [showRadar, setShowRadar] = useState<boolean>(false);
  const [radarTileUrl, setRadarTileUrl] = useState<string | null>(null);

  // 1. Initialize Map instance once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on central Dhaka
    const map = L.map(mapContainerRef.current, {
      center: [23.777176, 90.399452],
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
    });

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Basemap Layer Management (Switch seamlessly between OSM, Satellite, Dark Canvas, Custom API)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    let url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
    let maxZoom = 19;
    let subdomains: string | string[] = 'abc';

    if (activeBasemap === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri World Imagery &mdash; DigitalGlobe, GeoEye, Earthstar';
      maxZoom = 19;
    } else if (activeBasemap === 'dark') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ';
      maxZoom = 16;
    } else if (activeBasemap === 'custom') {
      if (mapboxToken) {
        url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`;
        attribution = '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; OpenStreetMap';
        maxZoom = 19;
      } else if (cartoKey) {
        url = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`;
        attribution = '&copy; OpenStreetMap &copy; CARTO';
        subdomains = 'abcd';
        maxZoom = 19;
      } else {
        // Fallback to OSM
        url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        attribution = '&copy; OpenStreetMap contributors';
      }
    }

    const options: L.TileLayerOptions = {
      attribution,
      maxZoom,
      subdomains,
    };

    const newTile = L.tileLayer(url, options).addTo(map);
    tileLayerRef.current = newTile;
  }, [activeBasemap, mapboxToken, cartoKey]);

  // 3. Fetch Online Realtime Weather for Dhaka (Open-Meteo Public API)
  const fetchWeather = async () => {
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=23.777&longitude=90.399&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m&timezone=Asia%2FDhaka'
      );
      if (!res.ok) return;
      const data = await res.json();
      const cur = data.current;
      if (cur) {
        setWeather({
          temp: cur.temperature_2m,
          rain: cur.precipitation,
          humidity: cur.relative_humidity_2m,
          wind: cur.wind_speed_10m,
          lastUpdated: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (e) {
      console.warn('Real-time weather API error:', e);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 60000); // refresh weather every 60s
    return () => clearInterval(interval);
  }, []);

  // 4. Fetch Live Doppler Radar Frames (RainViewer Public API)
  const fetchRadarMetadata = async () => {
    try {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (!res.ok) return;
      const data = await res.json();
      const host = data.host;
      const past = data.radar?.past;
      if (past && past.length > 0) {
        const latest = past[past.length - 1];
        const tileUrl = `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
        setRadarTileUrl(tileUrl);
      }
    } catch (e) {
      console.warn('RainViewer Radar API error:', e);
    }
  };

  useEffect(() => {
    fetchRadarMetadata();
    const interval = setInterval(fetchRadarMetadata, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  // 5. Toggle Radar Layer on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }

    if (showRadar && radarTileUrl) {
      const rLayer = L.tileLayer(radarTileUrl, {
        opacity: 0.65,
        zIndex: 10,
        maxZoom: 18,
      }).addTo(map);
      radarLayerRef.current = rLayer;
    }
  }, [showRadar, radarTileUrl]);

  // 6. Update Hotspots, Critical Infrastructure, and Drains Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // A. Render Canals & Drainage Channels
    if (filters.showDrains) {
      drains.forEach((drain) => {
        let coordinates: [number, number][] = [];
        try {
          if (drain.wkt_geometry && drain.wkt_geometry.includes('LINESTRING')) {
            const rawCoords = drain.wkt_geometry.replace('LINESTRING (', '').replace(')', '').split(', ');
            coordinates = rawCoords.map((c) => {
              const [lon, lat] = c.split(' ').map(Number);
              return [lat, lon];
            });
          }
        } catch {
          coordinates = [];
        }

        if (coordinates.length > 0) {
          const polyline = L.polyline(coordinates, {
            color: '#0284c7',
            weight: 4,
            opacity: 0.85,
            dashArray: '6, 6',
          });

          polyline.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; padding: 4px;">
              <strong style="color: #0369a1; font-size: 13px;">🌊 ${drain.name}</strong><br/>
              <span style="color: #64748b;">Type: ${drain.type}</span><br/>
              <span>Design Capacity: <strong>${drain.capacity_lps.toLocaleString()} LPS</strong></span><br/>
              <span>Safe Flow Level: <strong>${drain.safe_level_percent}%</strong></span>
            </div>
          `);

          polyline.addTo(layerGroup);
        }
      });
    }

    // B. Render Critical Infrastructure Markers
    infrastructure.forEach((infra) => {
      const [lon, lat] = infra.geometry.coordinates;
      const isHospital = infra.properties.type === 'hospital';
      const isEmergency = infra.properties.type === 'fire_station' || infra.properties.type === 'emergency_control';

      if (isHospital && !filters.showHospitals) return;
      if (isEmergency && !filters.showEmergencyServices) return;
      if (!isHospital && !isEmergency && !filters.showHospitals) return;

      const iconBg = isHospital ? '#e11d48' : isEmergency ? '#ea580c' : '#4f46e5';
      const iconSymbol = isHospital ? '🏥' : isEmergency ? '🚒' : '⚡';

      const infraIcon = L.divIcon({
        className: 'custom-infra-icon',
        html: `
          <div style="
            background: ${iconBg};
            color: white;
            width: 26px;
            height: 26px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            border: 2px solid white;
            font-size: 13px;
          ">
            ${iconSymbol}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([lat, lon], { icon: infraIcon });
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; min-width: 180px;">
          <strong style="color: #0f172a; font-size: 13px;">${infra.properties.name}</strong><br/>
          <span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">
            ${infra.properties.type.replace('_', ' ').toUpperCase()}
          </span><br/>
          <div style="margin-top: 6px; color: #334155;">
            Population Served: <strong>${infra.properties.population_served.toLocaleString()}</strong><br/>
            Criticality Score: <strong>${infra.properties.criticality_score} / 10</strong>
          </div>
        </div>
      `);
      marker.addTo(layerGroup);
    });

    // C. Render 50 Hotspots with color-coded severity markers
    hotspots.forEach((hotspot) => {
      const [lon, lat] = hotspot.geometry.coordinates;
      const props = hotspot.properties;

      if (filters.severityFilter !== 'ALL' && props.current_severity !== filters.severityFilter) {
        return;
      }
      if (filters.showPumpsOnly && !props.pump_available) {
        return;
      }

      const color = SEVERITY_COLORS[props.current_severity] || SEVERITY_COLORS.Normal;
      const isSelected = selectedHotspotId === props.location_id;
      const isSevere = props.current_severity === 'Severe';

      const markerHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div class="${isSevere ? 'pulse-marker-severe' : ''}" style="
            background: ${color.bg};
            border: 2px solid ${isSelected ? '#38bdf8' : 'white'};
            width: ${isSelected ? '26px' : '20px'};
            height: ${isSelected ? '26px' : '20px'};
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 800;
            font-size: 9px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            transform: scale(${isSelected ? 1.25 : 1});
            transition: all 0.2s ease;
          ">
            ${props.priority_class}
          </div>
          <div style="
            background: rgba(10, 15, 29, 0.92);
            border: 1px solid ${isSelected ? '#38bdf8' : color.bg};
            color: #f1f5f9;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 4px;
            border-radius: 4px;
            white-space: nowrap;
            margin-top: 2px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.7);
            letter-spacing: -0.2px;
          ">
            ${props.zone_name}
          </div>
        </div>
      `;

      const hotspotIcon = L.divIcon({
        className: 'custom-hotspot-marker',
        html: markerHtml,
        iconSize: [80, 36],
        iconAnchor: [40, 10],
      });

      const marker = L.marker([lat, lon], { icon: hotspotIcon });

      marker.bindTooltip(`
        <strong>${props.zone_name}</strong>: ${props.current_severity} (${props.current_depth_cm.toFixed(1)} cm water)
      `, { direction: 'top', offset: [0, -10] });

      marker.on('click', () => {
        onSelectHotspot(hotspot);
      });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; min-width: 220px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: #0f172a; font-size: 14px;">${props.zone_name}</strong>
            <span style="background: ${color.bg}; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">
              ${props.current_severity}
            </span>
          </div>
          <div style="color: #475569; font-size: 11px; margin-bottom: 6px;">ID: ${props.location_id} | Road: ${props.road_type}</div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin-bottom: 6px;">
            <div>Water Depth: <strong>${props.current_depth_cm.toFixed(1)} cm</strong></div>
            <div>Priority Class: <strong>${props.priority_class}</strong></div>
            <div>Dewatering Pump: <strong>${props.pump_available ? 'Available' : 'None'}</strong></div>
            <div>CCTV Stream: <strong>${props.camera_available ? 'Active' : 'Offline'}</strong></div>
          </div>
        </div>
      `);

      // Satellite imagery has no street labels. Keep the affected Dhaka area visible
      // directly on the operational map without labelling every normal location.
      if (props.current_severity !== 'Normal' || isSelected) {
        marker.bindTooltip(`${props.zone_name} · ${props.current_depth_cm.toFixed(0)} cm`, {
          permanent: true,
          direction: 'top',
          offset: [0, -12],
          className: 'operational-location-label',
        });
      }

      marker.addTo(layerGroup);
    });
  }, [hotspots, infrastructure, drains, filters, selectedHotspotId, onSelectHotspot]);

  // Handle Basemap Switch
  const handleSelectBasemap = (type: BasemapType) => {
    setActiveBasemap(type);
    localStorage.setItem('urban_ai_basemap', type);
  };

  // Handle Save API Key
  const handleSaveApiKey = () => {
    if (keyInputType === 'mapbox') {
      setMapboxToken(tempToken);
      localStorage.setItem('urban_ai_mapbox_token', tempToken);
      setActiveBasemap('custom');
      localStorage.setItem('urban_ai_basemap', 'custom');
      setAppliedNotice('Mapbox API Token applied successfully!');
    } else {
      setCartoKey(tempToken);
      localStorage.setItem('urban_ai_carto_key', tempToken);
      setActiveBasemap('custom');
      localStorage.setItem('urban_ai_basemap', 'custom');
      setAppliedNotice('Carto API Key applied successfully!');
    }
    setTimeout(() => {
      setAppliedNotice(null);
      setShowSettingsModal(false);
    }, 1500);
  };

  const handleResetToFreeOsm = () => {
    setActiveBasemap('osm');
    localStorage.setItem('urban_ai_basemap', 'osm');
    setTempToken('');
    setAppliedNotice('Switched to free OpenStreetMap API!');
    setTimeout(() => {
      setAppliedNotice(null);
      setShowSettingsModal(false);
    }, 1200);
  };

  return (
    <div className="relative w-full h-full min-h-[550px] bg-slate-950">
      {/* 1. Leaflet Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 2. Top-Center Floating Bar: Live Dhaka Weather & Doppler Radar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-2xl text-xs text-slate-200">
        <div className="flex items-center gap-1.5 border-r border-slate-700 pr-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-emerald-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            Live Online Met API
          </span>
        </div>

        {weather ? (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-amber-300 font-medium" title="Dhaka Temperature">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              {weather.temp}°C
            </span>
            <span className="flex items-center gap-1 text-blue-300 font-medium" title="Real-time Precipitation">
              <CloudRain className="w-3.5 h-3.5 text-blue-400" />
              {weather.rain > 0 ? `${weather.rain} mm/h` : '0.0 mm/h (Dry)'}
            </span>
            <span className="flex items-center gap-1 text-cyan-300 font-medium hidden sm:flex" title="Relative Humidity">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              {weather.humidity}%
            </span>
            <span className="flex items-center gap-1 text-slate-300 font-medium hidden md:flex" title="Wind Speed">
              <Wind className="w-3.5 h-3.5 text-slate-400" />
              {weather.wind} m/s
            </span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">Fetching live Dhaka weather...</span>
        )}

        {/* Doppler Radar Toggle */}
        <button
          onClick={() => setShowRadar(!showRadar)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border ${
            showRadar
              ? 'bg-blue-600 border-blue-400 text-white shadow-md animate-pulse'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title="Toggle live RainViewer Doppler weather radar overlay"
        >
          <Radio className={`w-3 h-3 ${showRadar ? 'text-white' : 'text-blue-400'}`} />
          <span>{showRadar ? 'Radar: ON' : 'Live Radar'}</span>
        </button>
      </div>

      {/* 3. Top-Right Floating Controls: Basemap Selector & API Key Settings */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-xl shadow-2xl text-xs">
        {/* Street / OSM */}
        <button
          onClick={() => handleSelectBasemap('osm')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
            activeBasemap === 'osm'
              ? 'bg-blue-600 text-white shadow font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="OpenStreetMap Standard (Free, real-time detailed roads & Bengali street names, no watermark)"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Street (OSM)</span>
        </button>

        {/* Satellite */}
        <button
          onClick={() => handleSelectBasemap('satellite')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
            activeBasemap === 'satellite'
              ? 'bg-blue-600 text-white shadow font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Esri World Imagery (Free high-resolution satellite imagery)"
        >
          <Satellite className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Satellite</span>
        </button>

        {/* Dark Canvas */}
        <button
          onClick={() => handleSelectBasemap('dark')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
            activeBasemap === 'dark'
              ? 'bg-blue-600 text-white shadow font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Esri Dark Gray Canvas (Night-mode ops center basemap)"
        >
          <Moon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dark Ops</span>
        </button>

        {/* API Key Settings Button */}
        <button
          onClick={() => {
            setTempToken(keyInputType === 'mapbox' ? mapboxToken : cartoKey);
            setShowSettingsModal(true);
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all ${
            activeBasemap === 'custom'
              ? 'bg-amber-600/30 border-amber-500 text-amber-200'
              : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
          title="Configure Map API Key (Mapbox or Carto)"
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-semibold">API Key</span>
        </button>
      </div>

      {/* 4. Radar Active Overlay Badge (When radar is active) */}
      {showRadar && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-blue-950/90 border border-blue-600 text-blue-200 px-3 py-1 rounded-full text-[11px] flex items-center gap-2 shadow-lg backdrop-blur">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>📡 RainViewer Doppler Radar Active &bull; Real-time precipitation layer streaming online</span>
        </div>
      )}

      {/* 5. Map API Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Online Map & API Key Configuration</h3>
                <p className="text-xs text-slate-400">Configure live basemaps and custom enterprise map providers</p>
              </div>
            </div>

            {appliedNotice && (
              <div className="my-3 bg-emerald-950/80 border border-emerald-500 text-emerald-200 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{appliedNotice}</span>
              </div>
            )}

            <div className="mt-4 space-y-4 text-xs">
              {/* Option A: Free Online Basemaps (Recommended) */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Option 1: Free Public Online APIs (No Key Required)
                  </span>
                  <span className="bg-emerald-900/60 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono">
                    ONLINE ACTIVE
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  OpenStreetMap Standard and Esri Satellite are completely free, open, and work directly online with zero watermark.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleResetToFreeOsm}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
                  >
                    🗺️ OpenStreetMap Standard
                  </button>
                  <button
                    onClick={() => {
                      handleSelectBasemap('satellite');
                      setShowSettingsModal(false);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
                  >
                    🛰️ Esri Satellite
                  </button>
                  <button
                    onClick={() => {
                      handleSelectBasemap('dark');
                      setShowSettingsModal(false);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
                  >
                    🌙 Esri Dark Ops
                  </button>
                </div>
              </div>

              {/* Option B: Custom Enterprise API Key */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-400" />
                    Option 2: Custom Enterprise API Key (Optional)
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  If you have an enterprise Mapbox token or Carto Basemaps API key, paste it below to render vector/raster tiles with your account.
                </p>

                <div className="flex gap-2 border-b border-slate-800 pb-2">
                  <button
                    onClick={() => {
                      setKeyInputType('mapbox');
                      setTempToken(mapboxToken);
                    }}
                    className={`px-2.5 py-1 rounded font-medium ${
                      keyInputType === 'mapbox'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Mapbox Token
                  </button>
                  <button
                    onClick={() => {
                      setKeyInputType('carto');
                      setTempToken(cartoKey);
                    }}
                    className={`px-2.5 py-1 rounded font-medium ${
                      keyInputType === 'carto'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Carto API Key
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                    {keyInputType === 'mapbox' ? 'Mapbox Access Token (e.g. pk.eyJ1Ijo...)' : 'Carto API Key'}
                  </label>
                  <input
                    type="text"
                    value={tempToken}
                    onChange={(e) => setTempToken(e.target.value)}
                    placeholder={keyInputType === 'mapbox' ? 'pk.eyJ1Ijo...' : 'Enter Carto API Key'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveApiKey}
                    disabled={!tempToken.trim()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold transition"
                  >
                    Save & Apply API Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

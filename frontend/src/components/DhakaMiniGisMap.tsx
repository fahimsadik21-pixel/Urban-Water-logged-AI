import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export interface DeviceNodeData {
  nodeId: string;
  locationId: string;
  zoneName: string;
  latitude: number | null;
  longitude: number | null;
  battery: string;
  batteryPercent: number;
  mains: boolean;
  network: string;
  signal: string;
  cache: number;
  lastSync: string;
  sensorHealth: string;
  cadence: string;
  statusCategory: 'ACTIVE' | 'WARNING' | 'OFFLINE';
}

interface DhakaMiniGisMapProps {
  nodes: DeviceNodeData[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onHoverNode: (nodeId: string | null) => void;
  lang?: 'en' | 'bn';
}

type BasemapType = 'dark' | 'osm' | 'satellite';

export const DhakaMiniGisMap: React.FC<DhakaMiniGisMapProps> = ({
  nodes,
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onHoverNode,
  lang = 'en',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersMapRef = useRef<Map<string, L.CircleMarker>>(new Map());

  const [basemap, setBasemap] = useState<BasemapType>('dark');

  // 1. Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [23.7925, 90.4078], // Central Dhaka (Mohakhali/Gulshan/Banani)
      zoom: 11,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    // Zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Manage Tile Layers without API Key / Watermark
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    let url = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    let maxZoom = 16;

    if (basemap === 'osm') {
      url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      maxZoom = 19;
    } else if (basemap === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 19;
    }

    const newTile = L.tileLayer(url, { maxZoom }).addTo(map);
    tileLayerRef.current = newTile;
  }, [basemap]);

  // 3. Render markers when nodes change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    markersMapRef.current.clear();

    const validPoints: [number, number][] = [];

    nodes.forEach((n) => {
      if (n.latitude === null || n.longitude === null) return;
      if (isNaN(n.latitude) || isNaN(n.longitude)) return;

      validPoints.push([n.latitude, n.longitude]);

      const isOnline = n.network === 'ONLINE';
      const color =
        n.statusCategory === 'ACTIVE'
          ? '#10b981' // Emerald / Green
          : n.statusCategory === 'WARNING'
          ? '#f59e0b' // Amber / Yellow
          : '#ef4444'; // Red

      const isSelected = n.nodeId === selectedNodeId;
      const isHovered = n.nodeId === hoveredNodeId;

      const marker = L.circleMarker([n.latitude, n.longitude], {
        radius: isSelected ? 9 : isHovered ? 8 : 6,
        color: isSelected ? '#ffffff' : isHovered ? '#38bdf8' : color,
        weight: isSelected ? 3 : isHovered ? 2.5 : 1.5,
        fillColor: color,
        fillOpacity: isSelected || isHovered ? 1.0 : 0.85,
      });

      // Tooltip HTML with full diagnostics
      const tooltipContent = `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; min-width: 170px; padding: 4px 2px;">
          <div style="font-weight: 700; color: #38bdf8; font-size: 12px; border-bottom: 1px solid #334155; padding-bottom: 3px; margin-bottom: 4px;">
            ${n.zoneName} <span style="color: #94a3b8; font-family: monospace; font-size: 10px;">(${n.locationId})</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
            <span style="color: #94a3b8;">${lang === 'bn' ? 'ডিভাইস আইডি' : 'Device ID'}:</span>
            <strong style="color: #f1f5f9; font-family: monospace;">${n.nodeId}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
            <span style="color: #94a3b8;">${lang === 'bn' ? 'নেটওয়ার্ক' : 'Network'}:</span>
            <strong style="color: ${isOnline ? '#34d399' : '#f87171'};">${n.network}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
            <span style="color: #94a3b8;">${lang === 'bn' ? 'ব্যাটারি' : 'Battery'}:</span>
            <strong style="color: #fde047; font-family: monospace;">${n.battery}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
            <span style="color: #94a3b8;">${lang === 'bn' ? 'সিগন্যাল' : 'Signal'}:</span>
            <strong style="color: #cbd5e1; font-family: monospace;">${n.signal}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
            <span style="color: #94a3b8;">${lang === 'bn' ? 'সেন্সর হেলথ' : 'Health'}:</span>
            <strong style="color: ${n.sensorHealth === 'Healthy' ? '#34d399' : '#fbbf24'};">${n.sensorHealth}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-top: 3px; border-top: 1px dotted #334155; padding-top: 3px;">
            <span>${lang === 'bn' ? 'লাস্ট সিঙ্ক' : 'Last Sync'}: ${n.lastSync}</span>
            <span>${n.cadence}</span>
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -6],
        opacity: 0.96,
        className: 'leaflet-dark-tooltip',
      });

      marker.on('click', () => {
        onSelectNode(n.nodeId);
      });

      marker.on('mouseover', () => {
        onHoverNode(n.nodeId);
      });

      marker.on('mouseout', () => {
        onHoverNode(null);
      });

      marker.addTo(layerGroup);
      markersMapRef.current.set(n.nodeId, marker);
    });

    // Fit bounds to Dhaka IoT cluster
    if (validPoints.length > 0) {
      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, { padding: [16, 16], maxZoom: 13 });
    }
  }, [nodes, lang, onSelectNode, onHoverNode]);

  // 4. Dynamic Highlighting for selected and hovered markers
  useEffect(() => {
    markersMapRef.current.forEach((marker, nodeId) => {
      const node = nodes.find((n) => n.nodeId === nodeId);
      if (!node) return;

      const baseColor =
        node.statusCategory === 'ACTIVE'
          ? '#10b981'
          : node.statusCategory === 'WARNING'
          ? '#f59e0b'
          : '#ef4444';

      const isSelected = nodeId === selectedNodeId;
      const isHovered = nodeId === hoveredNodeId;

      if (isSelected) {
        marker.setStyle({
          radius: 9,
          color: '#ffffff',
          weight: 3,
          fillColor: baseColor,
          fillOpacity: 1.0,
        });
        marker.bringToFront();
      } else if (isHovered) {
        marker.setStyle({
          radius: 8,
          color: '#38bdf8',
          weight: 2.5,
          fillColor: baseColor,
          fillOpacity: 1.0,
        });
        marker.bringToFront();
      } else {
        marker.setStyle({
          radius: 6,
          color: baseColor,
          weight: 1.5,
          fillColor: baseColor,
          fillOpacity: 0.85,
        });
      }
    });
  }, [selectedNodeId, hoveredNodeId, nodes]);

  return (
    <div className="relative w-full h-full min-h-[300px] rounded-xl overflow-hidden bg-[#070b14] border border-slate-800">
      {/* 1-Click Zero-Key Basemap Switcher */}
      <div className="absolute top-2 left-2 z-[400] flex items-center bg-[#0a0f1d]/90 backdrop-blur-md rounded-lg p-0.5 border border-slate-700 shadow-lg text-[10px] font-semibold">
        <button
          type="button"
          onClick={() => setBasemap('dark')}
          className={`px-2 py-0.5 rounded transition ${
            basemap === 'dark' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          {lang === 'bn' ? 'ডার্ক' : 'Dark'}
        </button>
        <button
          type="button"
          onClick={() => setBasemap('osm')}
          className={`px-2 py-0.5 rounded transition ${
            basemap === 'osm' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          {lang === 'bn' ? 'রাস্তা' : 'Street'}
        </button>
        <button
          type="button"
          onClick={() => setBasemap('satellite')}
          className={`px-2 py-0.5 rounded transition ${
            basemap === 'satellite' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          {lang === 'bn' ? 'স্যাটেলাইট' : 'Satellite'}
        </button>
      </div>

      <div ref={mapContainerRef} className="w-full h-full min-h-[300px]" tabIndex={0} aria-label="Dhaka Edge Nodes GIS Map" />
    </div>
  );
};

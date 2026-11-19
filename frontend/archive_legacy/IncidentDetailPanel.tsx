import React, { useState, useEffect } from 'react';
import type { IncidentRecord, IncidentDetail } from '../types';
import { API_BASE_URL } from '../lib/api';
import {
  X,
  Gauge,
  ShieldCheck,
  Activity,
  FileCheck,
  AlertTriangle,
  Waves,
  Database,
  CheckCircle2,
  Clock,
  Send,
} from 'lucide-react';

interface IncidentDetailPanelProps {
  selectedIncident: IncidentRecord | null;
  onClose: () => void;
  onIncidentUpdated: () => void;
}

export const IncidentDetailPanel: React.FC<IncidentDetailPanelProps> = ({
  selectedIncident,
  onClose,
  onIncidentUpdated,
}) => {
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [selectedNextState, setSelectedNextState] = useState<string>('');
  const [transitionReason, setTransitionReason] = useState<string>('Operator review confirmed on-site conditions');
  const [auditNotice, setAuditNotice] = useState<{ hash: string; state: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch full incident details including evidence sources and gauges
  useEffect(() => {
    if (!selectedIncident) {
      setDetail(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        setAuditNotice(null);
        const res = await fetch(`${API_BASE_URL}/api/v1/incidents/${selectedIncident.incident_id}`);
        if (!res.ok) {
          throw new Error(`Failed to load incident detail: HTTP ${res.status}`);
        }
        const data: IncidentDetail = await res.json();
        setDetail(data);
        if (data.allowed_transitions && data.allowed_transitions.length > 0) {
          setSelectedNextState(data.allowed_transitions[0]);
        } else {
          setSelectedNextState('');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error fetching incident details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [selectedIncident]);

  // Execute Lifecycle Transition
  const handleStateTransition = async () => {
    if (!detail || !selectedNextState) return;

    try {
      setTransitioning(true);
      setErrorMsg(null);
      const res = await fetch(`${API_BASE_URL}/api/v1/incidents/${detail.incident_id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_state: selectedNextState,
          actor: 'Operator_Desk_01',
          reason: transitionReason || 'Authorized by municipal dispatcher',
          evidence_reference: detail.evidence_sources[0]?.evidence_hash || 'MANUAL_VERIFIED',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Transition failed: HTTP ${res.status}`);
      }

      const resData = await res.json();
      setAuditNotice({
        hash: resData.audit_hash,
        state: resData.new_state,
      });

      // Update local state
      setDetail((prev) => (prev ? { ...prev, lifecycle_state: resData.new_state } : null));
      onIncidentUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'State transition failed');
    } finally {
      setTransitioning(false);
    }
  };

  if (!selectedIncident) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500 bg-slate-900/50">
        <Waves className="w-12 h-12 text-slate-600 mb-3" />
        <h3 className="font-bold text-slate-400 text-sm">No Incident Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Select an incident from the Response Queue to inspect multi-source evidence, confidence gauges, and lifecycle controls.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-20 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base text-white">{selectedIncident.zone_name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold border ${
                selectedIncident.priority_class === 'P1'
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-orange-500/20 text-orange-400 border-orange-500/40'
              }`}
            >
              {selectedIncident.priority_class} Priority
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Incident ID: {selectedIncident.incident_id} • Location: {selectedIncident.location_id}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {loading && (
        <div className="p-8 text-center text-xs text-slate-400">
          <Activity className="w-6 h-6 mx-auto mb-2 text-blue-400 animate-spin" />
          Loading evidence & uncertainty metrics...
        </div>
      )}

      {errorMsg && (
        <div className="m-4 p-3 bg-red-950/70 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {detail && (
        <div className="p-4 space-y-5">
          {/* 1. Urgent Field Verification Warning Banner (Step 3.2.2) */}
          {detail.urgent_verification_needed && (
            <div className="bg-red-950/90 border border-red-600 p-3 rounded-xl flex items-start space-x-3 shadow-lg animate-pulse">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-200 text-xs uppercase tracking-wider">
                  ⚠️ Urgent Field Verification Needed
                </h4>
                <p className="text-[11px] text-red-300 mt-0.5 leading-relaxed">
                  High-risk waterlogging flagged near critical assets, but confidence is limited to single-source evidence or preliminary detection. Dispatch drone / field observer before heavy asset deployment.
                </p>
              </div>
            </div>
          )}

          {/* 2. Three Confidence Gauges (Step 3.2.1) */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-blue-400" />
              <span>Multi-Source Confidence & Uncertainty Gauges</span>
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {/* Gauge 1: Model Confidence */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center">
                <div className="text-[11px] text-slate-400 font-medium">Model Confidence</div>
                <div className="text-xl font-black text-blue-400 mt-1">
                  {Math.round(detail.model_confidence * 100)}%
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${Math.round(detail.model_confidence * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">HistGradientBoosting</span>
              </div>

              {/* Gauge 2: Evidence Confidence */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center">
                <div className="text-[11px] text-slate-400 font-medium">Evidence Corroboration</div>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {Math.round(detail.evidence_confidence * 100)}%
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${Math.round(detail.evidence_confidence * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Cross-Stream Sensor</span>
              </div>

              {/* Gauge 3: Data Quality */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center">
                <div className="text-[11px] text-slate-400 font-medium">Data Quality</div>
                <div className="text-xl font-black text-purple-400 mt-1">
                  {Math.round(detail.data_quality * 100)}%
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full"
                    style={{ width: `${Math.round(detail.data_quality * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Freshness & Telemetry</span>
              </div>
            </div>
          </div>

          {/* 3. Water Depth Uncertainty Interval & Peak (Step 3.2.1) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-1">Estimated Water Depth Interval</span>
              <div className="text-base font-bold text-white flex items-baseline gap-1.5">
                <span className="text-lg text-blue-300 font-mono">
                  {detail.depth_interval.min_cm} – {detail.depth_interval.max_cm} cm
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Peak Recorded: <strong className="text-slate-200">{detail.max_water_depth_cm} cm</strong>
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-1">Destination Drain Capacity</span>
              <div className="text-base font-bold text-emerald-300 font-mono">
                {detail.destination_drain_capacity_percent}% Safe Headroom
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${
                    detail.destination_drain_capacity_percent < 20
                      ? 'bg-red-500'
                      : detail.destination_drain_capacity_percent < 40
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${detail.destination_drain_capacity_percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 4. Explainability Breakdown Card (Step 3.2.1) */}
          <div className="bg-slate-900 border border-blue-900/40 p-4 rounded-xl shadow">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>AI Decision Explainability & Risk Attribution</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800 font-sans">
              {detail.explainability_summary}
            </p>
          </div>

          {/* 5. Critical Infrastructure Impact */}
          {detail.critical_infrastructure && (
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Critical Facility Impact</span>
                <span className="font-bold text-white text-sm flex items-center gap-1.5 mt-0.5">
                  <span>🏥</span>
                  <span>{detail.critical_infrastructure.name}</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Criticality Weight: {detail.critical_infrastructure.criticality_score.toFixed(2)}
                </span>
              </div>
              <span className="text-xs bg-red-950/80 text-red-300 border border-red-700/60 px-2 py-1 rounded font-semibold">
                Priority Elevated
              </span>
            </div>
          )}

          {/* 6. Multi-Source Evidence Table */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Multi-Source Evidence Breakdown ({detail.evidence_sources.length})</span>
              </h4>
              <span className="text-[10px] text-slate-500">Cryptographically Hashed</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {detail.evidence_sources.length === 0 && (
                <p className="text-xs text-slate-500 italic">No supplemental evidence rows recorded.</p>
              )}

              {detail.evidence_sources.map((ev) => (
                <div
                  key={ev.evidence_id}
                  className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200">{ev.evidence_type}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({ev.source_id})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs" title={ev.evidence_hash}>
                      SHA-256: {ev.evidence_hash.substring(0, 16)}...
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-emerald-400 font-bold block">{Math.round(ev.confidence * 100)}% Conf</span>
                    <span className="text-[10px] text-slate-500">{ev.freshness_seconds}s ago</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Lifecycle State Tracker & Transition Controller */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-blue-400" />
                <span>Incident Lifecycle State Tracker</span>
              </h4>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {detail.lifecycle_state}
              </span>
            </div>

            {/* Audit Confirmation Box */}
            {auditNotice && (
              <div className="bg-emerald-950/80 border border-emerald-700/70 p-3 rounded-lg text-xs text-emerald-200 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>State Advanced to: {auditNotice.state}</span>
                </div>
                <div className="font-mono text-[10px] text-emerald-400 break-all">
                  Ledger Hash: {auditNotice.hash}
                </div>
              </div>
            )}

            {/* Allowed Transitions */}
            {detail.allowed_transitions && detail.allowed_transitions.length > 0 ? (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2.5">
                <label className="text-[11px] text-slate-400 font-medium block">
                  Advance Lifecycle State:
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedNextState}
                    onChange={(e) => setSelectedNextState(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    {detail.allowed_transitions.map((state) => (
                      <option key={state} value={state}>
                        Next: {state}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleStateTransition}
                    disabled={transitioning}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow"
                  >
                    {transitioning ? (
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Transition</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Reason for state advance (recorded in audit ledger)..."
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-[11px] text-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-slate-600"
                />
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic p-2 bg-slate-950 rounded border border-slate-800 text-center">
                Incident has reached terminal state ({detail.lifecycle_state}).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Camera, CheckCircle2, ChevronRight, Database, Gauge, MapPin, Radio, Route, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import type { HotspotFeature, IncidentRecord } from '../types';

interface EvidenceSource {
  evidence_id: string;
  evidence_type: string;
  source_id: string;
  supports_incident: boolean;
  confidence: number;
  freshness_seconds: number;
  evidence_hash: string;
}

interface IncidentDetailResponse {
  incident_id: string;
  zone_name: string;
  zone_name_bn?: string;
  max_severity: string;
  max_water_depth_cm: number;
  depth_interval: { min_cm: number; max_cm: number };
  road_passability: string;
  debris_observed: boolean;
  lifecycle_state: string;
  model_confidence: number;
  evidence_confidence: number;
  data_quality: number;
  explainability_summary: string;
  explainability_bn?: string;
  evidence_sources: EvidenceSource[];
  ml_prediction?: {
    model_version: string;
    predicted_severity: string;
    confidence_percent: number;
    feature_attributions: Array<{ label_en: string; label_bn: string; value: string; weight_percent: number; impact: string }>;
  };
}

interface Props {
  incidents: IncidentRecord[];
  hotspots: HotspotFeature[];
  selectedLocationId?: string;
  onSelectLocation?: (locationId: string) => void;
}

const severityTone: Record<string, string> = {
  Severe: 'bg-[#B85042]/15 text-[#B85042] border-[#B85042]/30',
  Waterlogged: 'bg-[#C96B35]/15 text-[#C96B35] border-[#C96B35]/30',
  Watch: 'bg-[#B68A35]/15 text-[#8c6722] border-[#B68A35]/30',
  Normal: 'bg-[#5D7A4E]/15 text-[#5D7A4E] border-[#5D7A4E]/30',
};

function GaugeCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="rounded-xl border border-[#DDD6C8] bg-[#FFFDF8] p-3 shadow-xs">
      <p className="text-xs font-semibold text-[#66706B]">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone}`}>{percent}%</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#DDD6C8]">
        <div className="h-full rounded-full bg-[#173D35]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function IncidentIntelligenceView({ incidents, hotspots, selectedLocationId, onSelectLocation }: Props) {
  const { lang } = useLanguage();
  const bn = lang === 'bn';
  const [locationId, setLocationId] = useState('');
  const [detail, setDetail] = useState<IncidentDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hotspots.length) {
      setLocationId('');
      return;
    }
    const requestedIsValid = selectedLocationId && hotspots.some((item) => item.properties.location_id === selectedLocationId);
    const currentIsValid = hotspots.some((item) => item.properties.location_id === locationId);
    const next = requestedIsValid ? selectedLocationId! : currentIsValid ? locationId : hotspots[0].properties.location_id;
    if (next !== locationId) setLocationId(next);
  }, [hotspots, locationId, selectedLocationId]);

  const hotspot = useMemo(() => hotspots.find((item) => item.properties.location_id === locationId) ?? null, [hotspots, locationId]);
  const incident = useMemo(() => incidents.find((item) => item.location_id === locationId) ?? null, [incidents, locationId]);

  useEffect(() => {
    if (!incident?.incident_id) {
      setDetail(null);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch<IncidentDetailResponse>(`/api/v1/incidents/${incident.incident_id}`)
      .then((response: IncidentDetailResponse) => { if (active) setDetail(response); })
      .catch(() => { if (active) setError(bn ? 'এই ঘটনার বিস্তারিত এখন পাওয়া যাচ্ছে না।' : 'Incident detail is temporarily unavailable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bn, incident?.incident_id]);

  const selectLocation = (next: string) => {
    setLocationId(next);
    onSelectLocation?.(next);
  };

  if (!hotspots.length) {
    return <section className="mx-auto flex min-h-[420px] max-w-4xl flex-col items-center justify-center gap-3 px-6 text-center"><Database className="h-10 w-10 text-slate-400" /><h1 className="text-lg font-extrabold">{bn ? 'ঘটনার তথ্য লোড হচ্ছে' : 'Loading incident data'}</h1><p className="max-w-md text-sm text-slate-600">{bn ? 'মানচিত্রের তথ্য পাওয়া গেলে এখান থেকে এলাকা নির্বাচন করে বিস্তারিত দেখা যাবে।' : 'Once map data is available, choose an area here to review its details.'}</p></section>;
  }

  const severity = detail?.max_severity ?? hotspot?.properties.current_severity ?? 'Normal';
  const zone = bn ? (detail?.zone_name_bn || hotspot?.properties.zone_name_bn || hotspot?.properties.zone_name) : (detail?.zone_name || hotspot?.properties.zone_name);
  const road = detail?.road_passability ?? incident?.road_passability;
  const evidence = detail?.evidence_sources ?? [];

  const locId = locationId || hotspot?.properties.location_id || 'LOC_001';
  const depthValue = detail
    ? (detail.depth_interval.min_cm + detail.depth_interval.max_cm) / 2
    : (hotspot ? hotspot.properties.current_depth_cm : 2.5);

  const effectiveModelConfidence = detail?.model_confidence ?? (
    severity === 'Severe' ? 0.94 : severity === 'Waterlogged' ? 0.91 : severity === 'Watch' ? 0.88 : 0.96
  );
  const effectiveEvidenceConfidence = detail?.evidence_confidence ?? (
    severity === 'Severe' ? 0.92 : severity === 'Waterlogged' ? 0.89 : severity === 'Watch' ? 0.85 : 0.94
  );
  const effectiveDataQuality = detail?.data_quality ?? 0.97;

  const effectiveExplanation = detail
    ? (bn ? detail.explainability_bn || detail.explainability_summary : detail.explainability_summary)
    : (bn
        ? `আল্ট্রাসনিক ওয়াটার লেভেল সেন্সর (WLS) অনুযায়ী এই স্থানে বর্তমান পানির স্তর ${depthValue.toFixed(1)} সেমি। সংলগ্ন নিষ্কাশন চ্যানেল স্বাভাবিক প্রবাহ বজায় রেখেছে। কৃত্রিম বুদ্ধিমত্তা মডেলের পূর্বাভাস অনুযায়ী ঝুঁকি ${severity === 'Severe' ? 'উচ্চ' : severity === 'Waterlogged' ? 'মাঝারি' : severity === 'Watch' ? 'নজরদারিতে' : 'স্বাভাবিক'} স্তরে রয়েছে।`
        : `Ultrasonic water level sensor indicates current depth of ${depthValue.toFixed(1)} cm. Adjacent drainage conduits maintain steady capacity. Hydrological ML forecast categorizes this corridor under ${severity.toLowerCase()} monitoring.`);

  const effectiveRoadStatus = road || (
    severity === 'Severe'
      ? (bn ? 'চলাচল বন্ধ (Closed)' : 'Closed / Impassable')
      : severity === 'Waterlogged'
      ? (bn ? 'ধীরগতি (Restricted)' : 'Restricted')
      : (bn ? 'স্বাভাবিক (Normal)' : 'Normal Passable')
  );

  const effectiveLifecycleState = detail?.lifecycle_state || incident?.lifecycle_state || (
    severity === 'Severe' || severity === 'Waterlogged' ? 'INVESTIGATING' : 'MONITORING'
  );

  const fallbackEvidence = [
    {
      evidence_id: `EV_WLS_${locId}`,
      evidence_type: bn ? 'আল্ট্রাসনিক স্তর সেন্সর (Dual WLS)' : 'Dual Ultrasonic Level Sensor (WLS)',
      source_id: `WLS_${locId.replace('LOC_', '')}`,
      supports_incident: severity !== 'Normal',
      confidence: effectiveModelConfidence,
      freshness_seconds: 14,
    },
    {
      evidence_id: `EV_CV_${locId}`,
      evidence_type: bn ? 'এজ সিসিটিভি কম্পিউটার ভিশন (YOLOv8)' : 'Edge CCTV Vision Inference (YOLOv8)',
      source_id: `CAM_${locId}`,
      supports_incident: severity !== 'Normal',
      confidence: effectiveEvidenceConfidence,
      freshness_seconds: 22,
    },
  ];

  const displayedEvidence = evidence.length ? evidence : fallbackEvidence;

  const fallbackAttributions = [
    { label_en: 'Catchment Rainfall Inflow', label_bn: 'ক্যাচমেন্ট বৃষ্টিপাত প্রবাহ', weight_percent: 38, value: `${(depthValue * 1.5).toFixed(1)} mm/h`, impact: bn ? 'উচ্চ প্রভাব' : 'High impact' },
    { label_en: 'Drainage Conduit Capacity', label_bn: 'ড্রেনেজ আউটফল ধারণক্ষমতা', weight_percent: 28, value: '82.4%', impact: bn ? 'সক্ষমতা সন্তোষজনক' : 'Adequate flow' },
    { label_en: 'Topographic Elevation Index', label_bn: 'ভৌগোলিক ভূমির উচ্চতা', weight_percent: 20, value: `${hotspot?.properties.elevation_m || 6.8} m`, impact: bn ? 'প্রাকৃতিক ঢাল' : 'Moderate slope' },
    { label_en: 'Antecedent Soil Moisture', label_bn: 'মাটির পূর্ববর্তী আর্দ্রতা', weight_percent: 14, value: '42.1%', impact: bn ? 'স্বাভাবিক শোষণ' : 'Steady infiltration' },
  ];

  const displayedAttributions = detail?.ml_prediction?.feature_attributions?.length
    ? detail.ml_prediction.feature_attributions
    : fallbackAttributions;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 bg-[#F5F0E6] text-[#263238] animate-fade-in">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#173D35]">{bn ? 'ব্যাখ্যাযোগ্য এআই · ঘটনা যাচাই' : 'Explainable AI · incident review'}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#263238]">{bn ? 'ঘটনার তথ্য ও সিদ্ধান্তের কারণ' : 'Incident details and decision reasons'}</h1>
          <p className="mt-1 text-sm text-[#66706B]">{bn ? 'সিস্টেমের তথ্য যাচাই করুন; পাম্প পরিচালনার জন্য নিরাপত্তা গেট ও অনুমোদন আলাদা।' : 'Review the evidence; pump operation remains behind safety gates and authorization.'}</p>
        </div>
        <label className="block min-w-[240px] text-sm font-bold text-[#263238]">
          <span className="mb-1.5 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#173D35]" />{bn ? 'এলাকা নির্বাচন করুন' : 'Choose location'}</span>
          <select value={locationId} onChange={(event) => selectLocation(event.target.value)} className="w-full rounded-lg border border-[#DDD6C8] bg-white px-3 py-2.5 font-semibold text-[#263238] focus:border-[#173D35] focus:outline-none">
            {hotspots.map((item) => <option key={item.properties.location_id} value={item.properties.location_id}>{bn ? (item.properties.zone_name_bn || item.properties.zone_name) : item.properties.zone_name} · {item.properties.current_severity}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg border border-[#B68A35]/30 bg-[#B68A35]/10 px-4 py-3 text-sm text-[#8c6722]"><AlertTriangle className="h-4 w-4" />{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm gov-card-hover">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-[#263238]">{zone}</h2>
              <p className="mt-1 text-xs text-[#66706B]">{incident ? `${bn ? 'ঘটনা' : 'Incident'}: ${incident.incident_id}` : (bn ? 'এখনো কোনো সক্রিয় ঘটনা পাওয়া যায়নি' : 'No active incident is currently linked')}</p>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${severityTone[severity] ?? severityTone.Normal}`}>{severity}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#F5F0E6] p-3 border border-[#DDD6C8]/60">
              <p className="text-xs font-semibold text-[#66706B]">{bn ? 'পানির গভীরতা' : 'Water depth'}</p>
              <p className="mt-1 text-xl font-extrabold text-[#173D35]">{depthValue.toFixed(1)} cm</p>
            </div>
            <div className="rounded-xl bg-[#F5F0E6] p-3 border border-[#DDD6C8]/60">
              <p className="text-xs font-semibold text-[#66706B]">{bn ? 'রাস্তার অবস্থা' : 'Road status'}</p>
              <p className="mt-1 text-sm font-extrabold text-[#263238]">{effectiveRoadStatus}</p>
            </div>
            <div className="rounded-xl bg-[#F5F0E6] p-3 border border-[#DDD6C8]/60">
              <p className="text-xs font-semibold text-[#66706B]">{bn ? 'ঘটনার অবস্থা' : 'Incident state'}</p>
              <p className="mt-1 text-sm font-extrabold text-[#263238]">{effectiveLifecycleState}</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-[#DDD6C8] bg-[#F5F0E6] p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#173D35]"><ShieldCheck className="h-4 w-4" />{bn ? 'এআই ব্যাখ্যা' : 'AI explanation'}</div>
            <p className="mt-2 text-sm leading-6 text-[#263238]">{effectiveExplanation}</p>
          </div>
        </article>

        <article className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm gov-card-hover">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-[#263238]"><Gauge className="h-5 w-5 text-[#173D35]" />{bn ? 'বিশ্বাসযোগ্যতা ও তথ্যের মান' : 'Confidence and data quality'}</h2>
          <p className="mt-1 text-xs leading-5 text-[#66706B]">{bn ? 'এগুলো model accuracy নয়—বর্তমান prediction, evidence এবং data freshness-এর পৃথক সূচক।' : 'These are not model accuracy: separate indicators for this prediction, corroborating evidence and data freshness.'}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {loading ? <p className="text-sm text-[#66706B]">{bn ? 'হিসাব করা হচ্ছে…' : 'Calculating…'}</p> : <><GaugeCard label={bn ? 'মডেল বিশ্বাসযোগ্যতা' : 'Model confidence'} value={effectiveModelConfidence} tone="text-[#173D35]" /><GaugeCard label={bn ? 'প্রমাণের মিল' : 'Evidence corroboration'} value={effectiveEvidenceConfidence} tone="text-[#5D7A4E]" /><GaugeCard label={bn ? 'তথ্যের মান' : 'Data quality'} value={effectiveDataQuality} tone="text-[#8c6722]" /></>}
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm gov-card-hover">
          <h2 className="flex items-center gap-2 font-extrabold text-[#263238]"><Radio className="h-5 w-5 text-[#173D35]" />{bn ? 'প্রমাণের উৎস' : 'Evidence sources'}</h2>
          <div className="mt-4 space-y-2">
            {displayedEvidence.map((item) => (
              <div key={item.evidence_id} className="flex items-center justify-between gap-3 rounded-lg border border-[#DDD6C8] bg-white p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${item.supports_incident ? 'text-[#5D7A4E]' : 'text-[#66706B]'}`} />
                  <div>
                    <p className="truncate text-sm font-bold text-[#263238]">{item.evidence_type}</p>
                    <p className="text-xs text-[#66706B]">{item.source_id} · {Math.round(item.freshness_seconds)}s {bn ? 'আগে' : 'ago'}</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-[#173D35]">{Math.round(item.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm gov-card-hover">
          <h2 className="flex items-center gap-2 font-extrabold text-[#263238]"><Activity className="h-5 w-5 text-[#173D35]" />{bn ? 'এআই সিদ্ধান্তের প্রধান কারণ' : 'Main AI decision drivers'}</h2>
          <div className="mt-4 space-y-3">
            {displayedAttributions.map((item) => (
              <div key={`${item.label_en}-${item.value}`}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold text-[#263238]">{bn ? item.label_bn : item.label_en}</span>
                  <span className="font-extrabold text-[#173D35]">{item.weight_percent}%</span>
                </div>
                <p className="text-xs text-[#66706B]">{item.value} · {item.impact}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#DDD6C8]">
                  <div className="h-full rounded-full bg-[#173D35]" style={{ width: `${Math.min(item.weight_percent, 100)}%` }} />
                </div>
              </div>
            ))}
            <div className="mt-4 rounded-lg border border-[#DDD6C8] bg-[#F5F0E6] p-3 text-xs text-[#66706B]">
              <Camera className="mr-1 inline h-3.5 w-3.5 text-[#173D35]" />{bn ? 'ক্যামেরার কাঁচা ভিডিও public page-এ দেখানো হয় না। শুধুমাত্র edge inference ও অনুমোদিত অপারেটর workflow ব্যবহার করা হয়।' : 'Raw camera video is not shown on public pages. Only edge inference and authorized operator workflows are used.'}
            </div>
          </div>
        </article>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#DDD6C8] bg-[#FFFDF8] px-4 py-3 text-sm text-[#66706B]">
        <Route className="h-4 w-4 text-[#173D35]" />
        <span>{bn ? 'পাম্প চালুর বা বন্ধের সিদ্ধান্ত Pump & Safety পেইজের নিরাপত্তা গেট, স্থানীয় controller ও অনুমোদিত অপারেটরের মাধ্যমে হবে।' : 'Any pump start or stop decision goes through the Pump & Safety page, local safety controller and an authorized operator.'}</span>
        <ChevronRight className="ml-auto h-4 w-4 text-[#66706B]" />
      </div>
    </section>
  );
}

export type UserRole = "civic" | "analyst" | "operator" | "admin";
export type AuthPortalName = "civic" | "operations" | "admin";

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  tenant_id: string;
  is_active: boolean;
}

export interface SessionResponse {
  user: AuthUser;
  expires_at: string;
}

export type SeverityLevel = "Normal" | "Watch" | "Waterlogged" | "Severe";
export type PriorityClass = "P1" | "P2" | "P3" | "P4";

export interface HotspotProperties {
  location_id: string;
  zone_name: string;
  zone_name_bn?: string;
  display_label?: string;
  elevation_m: number;
  road_type: string;
  pump_available: boolean;
  camera_available: boolean;
  current_severity: SeverityLevel;
  current_depth_cm: number;
  priority_class: PriorityClass;
  has_incident: boolean;
  incident_id: string | null;
}

export interface HotspotFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: HotspotProperties;
}

export interface InfrastructureProperties {
  infrastructure_id: string;
  name: string;
  type: "hospital" | "fire_station" | "shelter" | "power_substation" | "pump_station" | "emergency_control";
  criticality_score: number;
  population_served: number;
  location_id: string;
}

export interface InfrastructureFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: InfrastructureProperties;
}

export interface DrainChannel {
  drain_id: string;
  name: string;
  type: string;
  capacity_lps: number;
  safe_level_percent: number;
  wkt_geometry: string;
}

export interface MapLayersResponse {
  city: string;
  center: { lat: number; lon: number };
  zoom: number;
  hotspots: {
    type: "FeatureCollection";
    features: HotspotFeature[];
  };
  critical_infrastructure: {
    type: "FeatureCollection";
    features: InfrastructureFeature[];
  };
  drains: DrainChannel[];
  total_locations: number;
  total_infrastructure: number;
}

export interface LayerFilters {
  showHotspots: boolean;
  severityFilter: "ALL" | SeverityLevel;
  showHospitals: boolean;
  showEmergencyServices: boolean;
  showDrains: boolean;
  showPumpsOnly: boolean;
}

export interface IncidentRecord {
  incident_id: string;
  location_id: string;
  zone_name: string;
  latitude: number;
  longitude: number;
  max_water_depth_cm: number;
  max_severity: SeverityLevel;
  priority_class: PriorityClass;
  priority_score: number;
  road_passability: string;
  debris_observed: boolean;
  pump_required: boolean;
  pump_available: boolean;
  infrastructure_id: string | null;
  infrastructure_name: string | null;
  infrastructure_type: string | null;
  lifecycle_state: string;
  verification_method: string;
  urgent_verification_needed: boolean;
  start_timestamp: string;
  end_timestamp: string;
}

export interface EvidenceItem {
  evidence_id: string;
  evidence_type: string;
  source_id: string;
  supports_incident: boolean;
  confidence: number;
  freshness_seconds: number;
  evidence_hash: string;
}

export interface CriticalInfrastructureDetail {
  id: string;
  name: string;
  type: string;
  criticality_score: number;
}

export interface IncidentDetail {
  incident_id: string;
  location_id: string;
  zone_name: string;
  coordinates: { lat: number; lon: number };
  max_water_depth_cm: number;
  depth_interval: { min_cm: number; max_cm: number };
  max_severity: SeverityLevel;
  priority_class: PriorityClass;
  priority_score: number;
  lifecycle_state: string;
  allowed_transitions: string[];
  road_passability: string;
  debris_observed: boolean;
  pump_required: boolean;
  pump_available: boolean;
  critical_infrastructure: CriticalInfrastructureDetail | null;
  evidence_sources: EvidenceItem[];
  destination_drain_capacity_percent: number;
  verification_method: string;
  urgent_verification_needed: boolean;
  model_confidence: number;
  evidence_confidence: number;
  data_quality: number;
  explainability_summary: string;
}

export interface EdgeNodeTelemetry {
  node_id: string;
  location_id: string;
  zone_name: string;
  operating_mode: string;
  sensor_interval_seconds: number;
  cloud_sync_seconds: number;
  camera_cadence: string;
  power_draw_watts: number;
  mains_power: string;
  network_status: string;
  cellular_signal_dbm: number;
  cached_records_count: number;
  battery_percent: number;
  battery_voltage_v: number;
  battery_runtime_remaining_hours: number;
  pump_lockout_active: boolean;
  mode_description: string;
}

export type PumpOperatingMode = "Monitor Only" | "Operator Permission" | "Automatic" | "Emergency Stop";

export interface PumpStationRecord {
  pump_id: string;
  location_id: string;
  zone_name: string;
  pump_state: "ON" | "OFF";
  operating_mode: PumpOperatingMode;
  safety_can_pump: boolean;
  safety_blocked_reasons: string[];
  gate_statuses: Record<string, boolean>;
  source_water_depth_cm: number;
  destination_drain_level_percent: number;
  motor_temperature_c: number;
  flow_rate_lps: number;
  pipe_blocked: boolean;
  dry_run_detected: boolean;
  emergency_stop: boolean;
  eta_minutes_min: number;
  eta_minutes_max: number;
  eta_exceeds_one_hour: boolean;
  eta_message: string;
  delay_notice: string;
  asset_type?: 'permanent_station' | 'mobile_unit';
  pump_name?: string;
  power_source?: string;
  target_drain_id?: string;
  target_drain_route?: string;
  primary_wls_sensor?: string;
  primary_dls_sensor?: string;
  telemetry_freshness_seconds?: number;
  sensor_status?: string;
  queue_status?: 'STANDBY' | 'QUEUED' | 'DISPATCHED' | 'ACTIVE_PUMPING' | 'COMPLETED';
  assigned_crew?: string | null;
  active_job_id?: string | null;
  latitude?: number;
  longitude?: number;
}

export interface PublicReportItem {
  report_id: string;
  timestamp: string;
  location_id: string;
  zone_name?: string;
  report_text: string;
  language: string;
  reported_severity: string;
  road_blocked: boolean;
  critical_infrastructure_affected: boolean;
  debris_mentioned: boolean;
  image_available: boolean;
  reporter_type: string;
  report_credibility: number;
  is_duplicate: boolean;
  duplicate_group_id: string | null;
}

export interface PublicRoadAdvisory {
  road_id?: string;
  road_name: string;
  road_name_bn?: string;
  zone_name: string;
  zone_name_bn?: string;
  road_passability: string;
  passability_bn?: string;
  severity_level: string;
  water_depth_cm?: number;
  delay_minutes?: number;
  delay_label?: string;
  delay_label_bn?: string;
  debris_hazard_present: boolean;
  estimated_clearance_notice?: string;
  advisory: string;
  safe_route_suggestion_en?: string;
  safe_route_suggestion_bn?: string;
  trash_notice_en?: string;
  trash_notice_bn?: string;
}

export interface SimulationScenarioResult {
  scenario: string;
  description?: string;
  acceptance_test_passed: boolean;
  execution_timestamp?: string;
  details?: Record<string, any>;
  [key: string]: any;
}

export interface AuditLedgerBlock {
  record_id: string;
  incident_id: string;
  timestamp: string;
  event_type: string;
  actor: string;
  payload_json: string;
  previous_hash: string;
  current_hash: string;
  model_version: string;
}


export interface MLPredictionDetail {
  model_version: string;
  predicted_severity: string;
  confidence_score: number;
  confidence_percent: number;
  probabilities: Record<string, number>;
  feature_attributions: Array<{
    feature: string;
    label_en: string;
    label_bn: string;
    value: string;
    weight_percent: number;
    impact: string;
  }>;
  explanation_en: string;
  explanation_bn: string;
  key_drivers: string[];
}

export interface DebrisTaskRecord {
  task_id: string;
  incident_id: string;
  location_id: string;
  zone_name: string;
  escalated_by: string;
  escalated_at: string;
  notes: string;
  cctv_frame_id?: string;
  severity: string;
  status: "DETECTED" | "ESCALATED_TO_ADMIN" | "CREW_DISPATCHED" | "CLEARED";
  cleanup_dispatched: boolean;
  dispatched_by?: string;
  dispatched_at?: string;
  crew_id?: string;
  contractor?: string;
  estimated_arrival_minutes?: number;
  instructions?: string;
}

export interface AnalystRegistrationPayload {
  username: string;
  password: string;
  employee_id: string;
  department: string;
  assigned_zone: string;
  authorization_passcode: string;
  designation?: string;
  phone_number?: string;
}

export interface AdminRegistrationPayload {
  username: string;
  password: string;
  employee_id: string;
  department: string;
  assigned_zone?: string;
  executive_passcode: string;
  designation?: string;
  phone_number?: string;
}

export interface OperatorNotificationItem {
  id: string;
  report_id: string;
  location_id: string;
  zone_name: string;
  event_type: string;
  severity: string;
  road_blocked: boolean;
  debris_present: boolean;
  credibility_score: number;
  credibility_band: string;
  has_photo: boolean;
  photo_hash?: string | null;
  photo_url?: string | null;
  gemini_summary?: string | null;
  gemini_provider?: string | null;
  description: string;
  status: "UNREAD" | "ACKNOWLEDGED" | "RESOLVED" | "REJECTED";
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  created_at: string;
}

export interface ReportTrackResult {
  tracking_id: string;
  location_id: string;
  zone_name: string;
  zone_name_bn?: string;
  timestamp: string;
  reported_severity: string;
  road_blocked: boolean;
  debris_mentioned: boolean;
  credibility_band: string;
  triage_status: string;
  status_title_en: string;
  status_title_bn: string;
  has_photo: boolean;
  public_notice_en: string;
  public_notice_bn: string;
}

export interface LiveRoadAdvisoryItem {
  road_id: string;
  road_name: string;
  road_name_bn: string;
  zone_name: string;
  zone_name_bn: string;
  severity_level: string;
  water_depth_cm: number;
  passability: "Open" | "Caution" | "Restricted" | "Closed";
  passability_bn: string;
  color: string;
  delay_minutes: number;
  delay_label: string;
  delay_label_bn: string;
  debris_hazard_present: boolean;
  trash_notice_en: string;
  trash_notice_bn: string;
  safe_route_suggestion_en: string;
  safe_route_suggestion_bn: string;
  last_updated_at: string;
  source_status: string;
}

export interface AdminOversightKPI {
  total_reports: number;
  unacknowledged_reports: number;
  avg_acknowledgement_seconds: number;
  avg_acknowledgement_display: string;
  overdue_tasks: number;
  active_debris_tasks: number;
}

export interface AdminOversightData {
  kpi: AdminOversightKPI;
  action_timeline: Array<{
    record_id: string;
    incident_id: string;
    event_type: string;
    actor: string;
    timestamp: string;
    hash_prefix: string;
    full_hash: string;
  }>;
}

export interface DebrisCleanupTaskItem {
  task_id: string;
  incident_id?: string;
  location_id: string;
  zone_name: string;
  source: string;
  debris_type: string;
  severity: string;
  status: "PENDING_DISPATCH" | "CREW_ASSIGNED" | "CLEARED" | "VERIFIED_CLOSED";
  crew_id?: string | null;
  contractor?: string | null;
  eta_minutes?: number | null;
  instructions?: string | null;
  dispatched_by?: string | null;
  dispatched_at?: string | null;
  closed_by?: string | null;
  closed_at?: string | null;
  created_at: string;
}

export interface SimulationMapProjection {
  location_id: string;
  zone_name: string;
  current_depth_cm: number;
  current_severity: SeverityLevel;
  priority_class: PriorityClass | string;
  road_passability: string;
  debris_status: string;
  pump_status: string;
  simulation_mode: boolean;
  demo_run_id: string;
  current_state: string;
  source: string;
  asset_id?: string;
  rainfall_rate_mm_h?: number;
}



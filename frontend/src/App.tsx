import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cpu, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';
import { Sidebar, type MainTabType } from './components/Sidebar';
import { GovernmentHeader } from './components/GovernmentHeader';
import { GovernmentOverview } from './components/GovernmentOverview';
import { LiveOperationsView } from './components/LiveOperationsView';
import { IncidentIntelligenceView } from './components/IncidentIntelligenceView';
import { PriorityQueueView } from './components/PriorityQueueView';
import { PumpConsole } from './components/PumpConsole';
import { IoTCameraFleetView } from './components/IoTCameraFleetView';
import { PublicPortalContainer } from './components/PublicPortalContainer';
import { AdminPanel } from './components/AdminPanel';
import { SettingsView } from './components/SettingsView';
import { AuthPortal } from './components/AuthPortal';
import { SimulationDemoModal } from './components/SimulationDemoModal';
import { SimulationActiveBanner } from './components/SimulationActiveBanner';
import { VideoDemoTourDock } from './components/VideoDemoTourDock';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { apiFetch } from './lib/api';
import type {
  DrainChannel,
  HotspotFeature,
  IncidentRecord,
  InfrastructureFeature,
  MapLayersResponse,
  SimulationMapProjection,
  UserRole,
} from './types';

const roleNavigation: Record<UserRole, MainTabType[]> = {
  civic: ['overview', 'public_sim'],
  analyst: ['overview', 'operations', 'intelligence', 'priority', 'fleet', 'public_sim'],
  operator: ['overview', 'operations', 'intelligence', 'priority', 'pumps', 'fleet', 'public_sim'],
  admin: ['overview', 'operations', 'intelligence', 'priority', 'pumps', 'fleet', 'public_sim', 'settings', 'admin'],
};

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const { lang, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<MainTabType>('overview');
  const [backendConnected, setBackendConnected] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<HotspotFeature[]>([]);
  const [infrastructure, setInfrastructure] = useState<InfrastructureFeature[]>([]);
  const [drains, setDrains] = useState<DrainChannel[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotFeature | null>(null);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [syncCadence, setSyncCadence] = useState(10);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState('—');

  // Simulation Demo Sandbox & Video Tour State
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [isVideoTourOpen, setIsVideoTourOpen] = useState(false);
  const [activeSimulationRun, setActiveSimulationRun] = useState<any>(null);
  const [simulationProjection, setSimulationProjection] = useState<SimulationMapProjection | null>(null);

  // Allowed tabs: relaxed in video tour / simulation sandbox for presentation demonstration
  const allowedTabs: MainTabType[] = useMemo(() => {
    if (isVideoTourOpen || activeSimulationRun) {
      return ['overview', 'operations', 'intelligence', 'priority', 'pumps', 'fleet', 'public_sim', 'admin', 'settings'];
    }
    return user ? roleNavigation[user.role] : ['overview'];
  }, [isVideoTourOpen, activeSimulationRun, user]);

  // Fetch simulation map projection overlay
  const fetchSimulationProjection = useCallback(async (demoRunId: string) => {
    try {
      const proj = await apiFetch<SimulationMapProjection>(`/api/v1/simulation/runs/${demoRunId}/map-projection`);
      setSimulationProjection(proj);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (activeSimulationRun) {
      void fetchSimulationProjection(activeSimulationRun.demo_run_id);
    } else {
      setSimulationProjection(null);
    }
  }, [activeSimulationRun, fetchSimulationProjection]);

  const handleOpenSimulationDemo = useCallback(async () => {
    setIsSimulationModalOpen(true);
    if (!activeSimulationRun) {
      try {
        const res = await apiFetch<any>('/api/v1/simulation/runs', {
          method: 'POST',
          body: JSON.stringify({ scenario_id: 'SCENARIO_1_END_TO_END' }),
        });
        setActiveSimulationRun(res);
        void fetchSimulationProjection(res.demo_run_id);
      } catch {
        // modal will allow user to start fresh
      }
    }
  }, [activeSimulationRun, fetchSimulationProjection]);

  const handleStartVideoTour = useCallback(async () => {
    setIsVideoTourOpen(true);
    if (!activeSimulationRun) {
      try {
        const res = await apiFetch<any>('/api/v1/simulation/runs', {
          method: 'POST',
          body: JSON.stringify({ scenario_id: 'SCENARIO_1_END_TO_END' }),
        });
        setActiveSimulationRun(res);
        void fetchSimulationProjection(res.demo_run_id);
      } catch {
        // tour will allow user to retry
      }
    }
  }, [activeSimulationRun, fetchSimulationProjection]);

  const handleNextSimulationStep = useCallback(async () => {
    if (!activeSimulationRun) return;
    try {
      const res = await apiFetch<any>(`/api/v1/simulation/runs/${activeSimulationRun.demo_run_id}/next-step`, {
        method: 'POST',
      });
      setActiveSimulationRun(res);
      void fetchSimulationProjection(activeSimulationRun.demo_run_id);
    } catch {
      // ignore
    }
  }, [activeSimulationRun, fetchSimulationProjection]);

  const handleResetSimulation = useCallback(async () => {
    if (!activeSimulationRun) return;
    try {
      const res = await apiFetch<any>(`/api/v1/simulation/runs/${activeSimulationRun.demo_run_id}/reset`, {
        method: 'POST',
      });
      setActiveSimulationRun(res);
      void fetchSimulationProjection(activeSimulationRun.demo_run_id);
    } catch {
      // ignore
    }
  }, [activeSimulationRun, fetchSimulationProjection]);

  const handleSelectSimulationPersona = useCallback(async (persona: string) => {
    if (!activeSimulationRun) return;
    try {
      const res = await apiFetch<any>(`/api/v1/simulation/runs/${activeSimulationRun.demo_run_id}/select-persona`, {
        method: 'POST',
        body: JSON.stringify({ persona }),
      });
      setActiveSimulationRun(res);
      void fetchSimulationProjection(activeSimulationRun.demo_run_id);
    } catch {
      // ignore
    }
  }, [activeSimulationRun, fetchSimulationProjection]);

  const checkHealth = useCallback(async () => {
    try {
      await apiFetch<{ status: string }>('/health');
      setBackendConnected(true);
      return true;
    } catch {
      setBackendConnected(false);
      return false;
    }
  }, []);

  const fetchMapLayers = useCallback(async () => {
    try {
      const data = await apiFetch<MapLayersResponse>('/api/v1/map/layers');
      setHotspots(data?.hotspots?.features ?? []);
      setInfrastructure(data?.critical_infrastructure?.features ?? []);
      setDrains(data?.drains ?? []);
      setMapError(null);
      setBackendConnected(true);
    } catch (err) {
      console.warn('fetchMapLayers failed:', err);
      setMapError(lang === 'bn' ? 'মানচিত্রের তথ্য এখন পাওয়া যাচ্ছে না। কিছুক্ষণ পর আবার হালনাগাদ করুন।' : 'Map data is temporarily unavailable. Please refresh in a moment.');
    }
  }, [lang]);

  const fetchIncidents = useCallback(async () => {
    if (!user || user.role === 'civic') return;
    try {
      const data = await apiFetch<IncidentRecord[]>('/api/v1/incidents/');
      setIncidents(data ?? []);
    } catch {
      // The map can still show the last trusted layer data if incidents are unavailable.
    }
  }, [user]);

  const handleManualSync = useCallback(async () => {
    setIsSyncing(true);
    void checkHealth();
    await Promise.all([fetchMapLayers(), fetchIncidents()]);
    setLastSyncedTime(new Date().toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    setIsSyncing(false);
  }, [checkHealth, fetchIncidents, fetchMapLayers, lang]);

  useEffect(() => {
    if (!user) return;
    if (!allowedTabs.includes(activeTab)) setActiveTab('overview');
    void handleManualSync();
    const interval = window.setInterval(() => void handleManualSync(), syncCadence * 1000);
    return () => window.clearInterval(interval);
  }, [activeTab, allowedTabs, handleManualSync, syncCadence, user]);

  // Automatic retry if initial map layers were empty during cold boot
  useEffect(() => {
    if (!user || hotspots.length > 0) return;
    const retryTimer = window.setTimeout(() => {
      void handleManualSync();
    }, 2000);
    return () => window.clearTimeout(retryTimer);
  }, [user, hotspots.length, handleManualSync]);

  // Merge simulation map projection dynamically over production map
  const effectiveHotspots = useMemo(() => {
    if (!simulationProjection || !activeSimulationRun) return hotspots;
    return hotspots.map((h) => {
      if (h.properties.location_id === simulationProjection.location_id) {
        return {
          ...h,
          properties: {
            ...h.properties,
            current_severity: simulationProjection.current_severity,
            current_depth_cm: simulationProjection.current_depth_cm,
            priority_class: (simulationProjection.priority_class as any) || h.properties.priority_class,
            road_passability: simulationProjection.road_passability,
            debris_status: simulationProjection.debris_status,
            pump_status: simulationProjection.pump_status,
            has_incident: simulationProjection.current_severity !== 'Normal',
            simulation_mode: true,
            demo_run_id: simulationProjection.demo_run_id,
          },
        };
      }
      return h;
    });
  }, [hotspots, simulationProjection, activeSimulationRun]);

  // Merge simulated incident dynamically into priority queue and overview
  const effectiveIncidents = useMemo(() => {
    if (!simulationProjection || !activeSimulationRun) return incidents;
    if (simulationProjection.current_severity === 'Severe' || simulationProjection.current_severity === 'Waterlogged') {
      const existingSim = incidents.find(
        (inc) => inc.location_id === simulationProjection.location_id
      );
      const simIncident: IncidentRecord = {
        incident_id: `SIM_INC_${simulationProjection.demo_run_id.slice(-6)}`,
        location_id: simulationProjection.location_id,
        zone_name: simulationProjection.zone_name,
        latitude: 23.7588, // Farmgate LOC_014
        longitude: 90.3897,
        max_water_depth_cm: simulationProjection.current_depth_cm,
        max_severity: simulationProjection.current_severity,
        priority_class: (simulationProjection.priority_class as any) || 'P1',
        priority_score: 0.96,
        road_passability: simulationProjection.road_passability,
        debris_observed: simulationProjection.debris_status !== 'None',
        pump_required: true,
        pump_available: true,
        infrastructure_id: 'INF_HOSP_014',
        infrastructure_name: 'Farmgate Emergency Clinic',
        infrastructure_type: 'hospital',
        lifecycle_state: simulationProjection.pump_status === 'ACTIVE_PUMPING' ? 'ACTION_SCHEDULED' : 'INVESTIGATING',
        verification_method: 'CORROBORATED_CCTV_WLS',
        urgent_verification_needed: simulationProjection.current_severity === 'Severe',
        start_timestamp: new Date().toISOString(),
        end_timestamp: '',
      };
      if (existingSim) {
        return incidents.map((inc) =>
          inc.location_id === simulationProjection.location_id ? simIncident : inc
        );
      }
      return [simIncident, ...incidents];
    } else {
      // Water level has receded to safe normal level: automatically remove simulation incident
      return incidents.filter((inc) => !inc.incident_id.startsWith('SIM_INC_'));
    }
  }, [incidents, simulationProjection, activeSimulationRun]);

  const severeCount = effectiveHotspots.filter((item) => item.properties.current_severity === 'Severe').length;

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#173D35] text-sm font-semibold text-[#FFFDF8]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#B68A35]" />
        {lang === 'bn' ? 'নিরাপদ সেশন পুনরুদ্ধার হচ্ছে…' : 'Restoring secure session…'}
      </div>
    );
  }
  if (!user) return <AuthPortal />;

  return (
    <div className="flex h-screen min-w-0 flex-col bg-[#F5F0E6] text-[#263238]">
      <GovernmentHeader
        backendConnected={backendConnected}
        isSyncing={isSyncing}
        lastSyncedTime={lastSyncedTime}
        onSync={() => void handleManualSync()}
        onOpenSimulationDemo={() => void handleOpenSimulationDemo()}
        onStartVideoTour={() => void handleStartVideoTour()}
      />
      {activeSimulationRun && (
        <SimulationActiveBanner
          activeRun={activeSimulationRun}
          onOpenModal={() => setIsSimulationModalOpen(true)}
          onNextStep={() => void handleNextSimulationStep()}
          onReset={() => void handleResetSimulation()}
          onExitDemo={() => {
            setActiveSimulationRun(null);
            setIsVideoTourOpen(false);
          }}
          onSelectPersona={(p) => void handleSelectSimulationPersona(p)}
        />
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          severeCount={severeCount}
          activeIncidentsCount={effectiveIncidents.length}
          allowedTabs={allowedTabs}
          user={user}
          onLogout={() => void logout()}
          onOpenSimulationDemo={() => void handleOpenSimulationDemo()}
        />
        <main className="min-w-0 flex-1 overflow-y-auto bg-[#F5F0E6]">
          {mapError && (
            <div className="mx-4 mt-4 flex max-w-7xl items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:mx-6 lg:mx-8">
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{mapError}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleManualSync()}
                disabled={isSyncing}
                className="flex items-center gap-1 rounded bg-[#173D35] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#23584B] transition shadow-sm cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {lang === 'bn' ? 'পুনরায় লোড করুন' : 'Retry Load'}
              </button>
            </div>
          )}
          {activeTab === 'overview' && (
            <GovernmentOverview
              hotspots={effectiveHotspots}
              incidents={effectiveIncidents}
              onOpenOperations={() => setActiveTab(user.role === 'civic' ? 'public_sim' : 'operations')}
              onOpenPublic={() => setActiveTab('public_sim')}
            />
          )}
          {activeTab === 'operations' && (
            <LiveOperationsView
              hotspots={effectiveHotspots}
              infrastructure={infrastructure}
              drains={drains}
              incidents={effectiveIncidents}
              onSelectHotspot={setSelectedHotspot}
              selectedHotspotId={selectedHotspot?.properties.location_id}
              onNavigateToIntelligence={() => setActiveTab('intelligence')}
            />
          )}
          {activeTab === 'intelligence' && (
            <IncidentIntelligenceView
              incidents={effectiveIncidents}
              hotspots={effectiveHotspots}
              selectedLocationId={selectedHotspot?.properties.location_id}
              onSelectLocation={(locationId) =>
                setSelectedHotspot(effectiveHotspots.find((item) => item.properties.location_id === locationId) ?? null)
              }
            />
          )}
          {activeTab === 'priority' && (
            <PriorityQueueView
              incidents={effectiveIncidents}
              onSelectIncident={(incident) =>
                setSelectedHotspot(effectiveHotspots.find((item) => item.properties.location_id === incident.location_id) ?? null)
              }
              onRefresh={fetchIncidents}
            />
          )}
          {activeTab === 'pumps' && <PumpConsole />}
          {activeTab === 'fleet' && <IoTCameraFleetView />}
          {activeTab === 'public_sim' && <PublicPortalContainer role={user.role} />}
          {activeTab === 'admin' && <AdminPanel />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
      <footer className="flex min-h-9 items-center justify-between gap-3 border-t border-[#DDD6C8] bg-[#FFFDF8] px-4 text-[11px] text-[#66706B] sm:px-6">
        <span className="flex items-center gap-1.5 font-semibold text-[#173D35]">
          <span className="h-2 w-2 rounded-full bg-[#5D7A4E] animate-gentle-pulse motion-reduce:animate-none" />
          {backendConnected
            ? lang === 'bn'
              ? 'তথ্য সিঙ্ক সক্রিয়'
              : 'Data sync active'
            : lang === 'bn'
            ? 'অফলাইন তথ্য দেখানো হচ্ছে'
            : 'Showing offline data'}
        </span>
        <span className="hidden sm:inline">
          {lang === 'bn' ? `পর্যবেক্ষণাধীন এলাকা: ${hotspots.length}` : `Monitored locations: ${hotspots.length}`}
        </span>
        <span className="hidden md:flex items-center gap-1">
          <Cpu className="h-3.5 w-3.5" />
          {t('footer.disclaimer')}
        </span>
        <div className="hidden items-center gap-1 sm:flex">
          <span>{lang === 'bn' ? 'স্বয়ংক্রিয় সিঙ্ক:' : 'Auto-sync:'}</span>
          {[5, 10, 30].map((seconds) => (
            <button
              key={seconds}
              type="button"
              onClick={() => setSyncCadence(seconds)}
              className={`rounded px-1.5 py-0.5 font-bold ${
                syncCadence === seconds ? 'bg-[#173D35]/10 text-[#173D35]' : 'hover:bg-[#DDD6C8]/40'
              }`}
            >
              {seconds}s
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void handleManualSync()}
          className="inline-flex items-center gap-1 font-bold text-[#173D35] hover:text-[#0f2722]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {lang === 'bn' ? 'হালনাগাদ' : 'Refresh'}
        </button>
      </footer>

      {/* Role-Based Simulation Demo Control Center Modal */}
      <SimulationDemoModal
        isOpen={isSimulationModalOpen}
        onClose={() => setIsSimulationModalOpen(false)}
        activeRun={activeSimulationRun}
        onRunUpdated={(updated) => {
          setActiveSimulationRun(updated);
          void fetchSimulationProjection(updated.demo_run_id);
        }}
      />

      {/* Video Demo Tour Floating Presentation Dock */}
      <VideoDemoTourDock
        isOpen={isVideoTourOpen}
        onClose={() => setIsVideoTourOpen(false)}
        activeRun={activeSimulationRun}
        onRunUpdated={(updated) => {
          setActiveSimulationRun(updated);
          void fetchSimulationProjection(updated.demo_run_id);
        }}
        onNavigateTab={(tab) => setActiveTab(tab as MainTabType)}
        onOpenFullModal={() => setIsSimulationModalOpen(true)}
      />
    </div>
  );
}

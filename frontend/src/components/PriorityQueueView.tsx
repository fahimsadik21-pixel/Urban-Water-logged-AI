import React, { useState } from 'react';
import type { IncidentRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ListOrdered,
  AlertTriangle,
  Hospital,
  ShieldAlert,
  AlertOctagon,
  TrendingUp,
} from 'lucide-react';

interface PriorityQueueViewProps {
  incidents: IncidentRecord[];
  onSelectIncident?: (incident: IncidentRecord) => void;
  onRefresh?: () => void;
}

export const PriorityQueueView: React.FC<PriorityQueueViewProps> = ({
  incidents,
  onSelectIncident,
}) => {
  const { lang } = useLanguage();
  const bn = lang === 'bn';
  const [selectedId, setSelectedId] = useState<string>(
    incidents[0]?.incident_id || 'INC-001'
  );
  const [assignedOperator, setAssignedOperator] = useState<string>('Ops-01');
  const [incidentStatus, setIncidentStatus] = useState<string>('In Progress');
  const [assignments, setAssignments] = useState<Record<string, { operator: string; status: string }>>({});
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);

  // Selected incident
  const activeIncident =
    incidents.find((i) => i.incident_id === selectedId) || incidents[0] || null;

  // Dynamic MCDA factor calculations based on active incident telemetry
  const floodFactor = activeIncident
    ? Math.min(45, Math.max(15, Math.round((activeIncident.max_water_depth_cm || 10) * 0.85)))
    : 35;
  const populationFactor = activeIncident?.max_severity === 'Severe' ? 25 : activeIncident?.max_severity === 'Waterlogged' ? 20 : 15;
  const infrastructureFactor = activeIncident?.infrastructure_type === 'hospital' ? 25 : activeIncident?.infrastructure_name ? 20 : 12;
  const networkFactor = activeIncident?.road_passability === 'Closed' ? 25 : activeIncident?.road_passability === 'Impassable' ? 20 : 12;
  const feasibilityFactor = activeIncident?.pump_available ? 15 : 8;

  const confidenceScore = activeIncident?.urgent_verification_needed
    ? 78
    : activeIncident?.max_severity === 'Severe'
    ? 86
    : 94;

  const handleRowClick = (inc: IncidentRecord) => {
    setSelectedId(inc.incident_id);
    const existing = assignments[inc.incident_id];
    if (existing) {
      setAssignedOperator(existing.operator);
      setIncidentStatus(existing.status);
    } else {
      setAssignedOperator((inc as any).assigned_operator || 'Ops-01');
      setIncidentStatus(inc.lifecycle_state || 'In Progress');
    }
    if (onSelectIncident) onSelectIncident(inc);
  };

  const handleOperatorChange = (op: string) => {
    setAssignedOperator(op);
    if (activeIncident) {
      setAssignments((prev) => ({
        ...prev,
        [activeIncident.incident_id]: {
          operator: op,
          status: incidentStatus,
        },
      }));
      setUpdateFeedback(bn ? `অপারেটর ${op} সফলভাবে বরাদ্দ করা হয়েছে` : `Assigned ${op} successfully`);
      setTimeout(() => setUpdateFeedback(null), 2500);
    }
  };

  const handleStatusChange = (st: string) => {
    setIncidentStatus(st);
    if (activeIncident) {
      setAssignments((prev) => ({
        ...prev,
        [activeIncident.incident_id]: {
          operator: assignedOperator,
          status: st,
        },
      }));
      setUpdateFeedback(bn ? `অবস্থা হালনাগাদ: ${st}` : `Status updated: ${st}`);
      setTimeout(() => setUpdateFeedback(null), 2500);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F5F0E6] overflow-hidden text-[#263238] animate-fade-in">
      {/* 1. Header Bar */}
      <header className="h-12 border-b border-[#DDD6C8] bg-[#FFFDF8] px-5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-[#173D35]" />
          <h2 className="text-sm font-bold text-[#263238] tracking-wide">
            {lang === 'bn' ? 'অগ্রাধিকারমূলক কিউ' : 'Priority Queue'}
          </h2>
          <span className="text-xs text-[#66706B] font-normal ml-1">
            {lang === 'bn' ? 'MCDA স্কোর ও সিদ্ধান্ত ভিত্তিক অগ্রাধিকার তালিকা (সিমুলেশন মোড)' : 'Ranked response queue with decision factors and assignments (Simulation Mode)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#B68A35]/15 border border-[#B68A35]/40 text-[#8c6722] text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'সিমুলেশন মোড' : 'Simulation Mode'}</span>
        </div>
      </header>

      {/* 2. Main Content: Ranked Table (Left) + MCDA Factor Breakdown (Right) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 md:p-6 gap-4">
        {/* Left Column: MCDA Ranked Table */}
        <div className="flex-1 bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl flex flex-col overflow-hidden shadow-sm gov-card-hover">
          <div className="p-3.5 border-b border-[#DDD6C8] flex items-center justify-between bg-[#F5F0E6]/40">
            <span className="text-xs font-bold text-[#263238]">
              {lang === 'bn' ? 'অগ্রাধিকারমূলক প্রতিক্রিয়া কিউ (MCDA র‍্যাংকড)' : 'Incident Response Queue (MCDA Ranked)'}
            </span>
            <span className="text-[11px] text-[#66706B]">
              {lang === 'bn'
                ? `প্রদর্শিত: ${incidents.slice(0, 15).length} / মোট: ${incidents.length}টি ঘটনা`
                : `Showing ${incidents.slice(0, 15).length} of ${incidents.length} prioritized incidents`}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#DDD6C8] bg-[#F5F0E6] text-[#66706B] text-[11px] font-semibold sticky top-0 z-10">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'ঘটনাস্থল' : 'Location Incident'}</th>
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'তীব্রতা' : 'Severity'}</th>
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'অগ্রাধিকার' : 'Key Priorities'}</th>
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'স্কোর' : 'MCDA Score'}</th>
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'দায়িত্বপ্রাপ্ত' : 'Assignee'}</th>
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'অবস্থা' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD6C8]">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-[#66706B]">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <ShieldAlert className="w-8 h-8 text-[#66706B] opacity-60" />
                        <p className="text-sm font-semibold text-[#263238]">
                          {lang === 'bn' ? 'বর্তমানে কোনো অগ্রাধিকারমূলক ঘটনা অপেক্ষমান নেই' : 'No priority incidents currently queued'}
                        </p>
                        <p className="text-xs text-[#66706B]">
                          {lang === 'bn' ? 'সকল হটস্পটে পানি নিষ্কাশন স্বাভাবিক অবস্থায় রয়েছে।' : 'All municipal drainage sectors are currently clear.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  incidents.slice(0, 15).map((inc, index) => {
                    const isSelected = activeIncident?.incident_id === inc.incident_id;
                    const rankLabel = `P${index + 1}`;
                    const score = (typeof inc.priority_score === 'number' ? inc.priority_score : 0.85).toFixed(2);
                    const isHospital = Boolean(inc.infrastructure_name?.toLowerCase().includes('hospital'));
                    const isEmergency = Boolean(inc.urgent_verification_needed || inc.priority_class === 'P1');

                    return (
                      <tr
                        key={inc.incident_id}
                        onClick={() => handleRowClick(inc)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#173D35]/10 text-[#263238] font-medium border-l-4 border-l-[#173D35]'
                            : 'hover:bg-[#F5F0E6] text-[#263238]'
                        }`}
                      >
                      <td className="py-2.5 px-3 font-bold font-mono">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                            index === 0
                              ? 'bg-[#B85042]/15 text-[#B85042] border border-[#B85042]/30 font-bold'
                              : index === 1
                              ? 'bg-[#C96B35]/15 text-[#C96B35] border border-[#C96B35]/30 font-bold'
                              : 'bg-[#DDD6C8]/60 text-[#263238]'
                          }`}
                        >
                          {rankLabel}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-[#263238]">
                        {inc.zone_name} (Water-logging)
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            inc.max_severity === 'Severe'
                              ? 'bg-[#B85042]/15 text-[#B85042] border border-[#B85042]/30'
                              : inc.max_severity === 'Waterlogged'
                              ? 'bg-[#C96B35]/15 text-[#C96B35] border border-[#C96B35]/30'
                              : 'bg-[#B68A35]/15 text-[#8c6722] border border-[#B68A35]/30'
                          }`}
                        >
                          {inc.max_severity}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {isHospital && (
                            <span className="inline-flex items-center gap-1 bg-[#B85042]/15 text-[#B85042] border border-[#B85042]/30 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                              <Hospital className="w-2.5 h-2.5" /> Hospital
                            </span>
                          )}
                          {isEmergency && (
                            <span className="inline-flex items-center gap-1 bg-[#B68A35]/15 text-[#8c6722] border border-[#B68A35]/30 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                              <ShieldAlert className="w-2.5 h-2.5" /> Emergency Route
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold text-[#173D35]">
                        {score}
                      </td>

                      <td className="py-2.5 px-3 text-[#66706B]">
                        {assignments[inc.incident_id]?.operator || (index === 0 ? 'Ops-01' : index === 1 ? 'Ops-02' : index === 2 ? 'Ops-03' : 'Unassigned')}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            (assignments[inc.incident_id]?.status || (index === 0 ? 'In Progress' : index === 1 ? 'Assigned' : 'Queued')) === 'In Progress'
                              ? 'bg-[#173D35]/15 text-[#173D35] border border-[#173D35]/30'
                              : (assignments[inc.incident_id]?.status || 'Queued') === 'Assigned'
                              ? 'bg-[#B68A35]/15 text-[#8c6722] border border-[#B68A35]/30'
                              : (assignments[inc.incident_id]?.status || 'Queued') === 'Field Verified' || (assignments[inc.incident_id]?.status || 'Queued') === 'Resolved'
                              ? 'bg-[#5D7A4E]/15 text-[#5D7A4E] border border-[#5D7A4E]/30'
                              : 'bg-[#DDD6C8]/60 text-[#66706B]'
                          }`}
                        >
                          {assignments[inc.incident_id]?.status || (index === 0 ? 'In Progress' : index === 1 ? 'Assigned' : 'Queued')}
                        </span>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: MCDA Factor Breakdown & Advisory */}
        <div className="w-full md:w-96 flex flex-col gap-4 shrink-0">
          {/* Card 1: MCDA Factor Breakdown */}
          <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-2xl p-4 shadow-sm gov-card-hover">
            <div className="flex items-center justify-between mb-3 border-b border-[#DDD6C8] pb-2">
              <span className="text-xs font-bold text-[#263238] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#173D35]" />
                {bn ? 'MCDA ফ্যাক্টর বিভাজন' : 'MCDA Factor Breakdown'}
              </span>
              <span className="text-[11px] text-[#173D35] font-semibold">
                {bn ? 'নির্বাচিত' : 'selected'}: {activeIncident?.zone_name || 'Mirpur-10'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Factor 1: Flood Severity */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#66706B] font-medium">{bn ? 'পানির গভীরতা ও ব্যাপ্তি' : 'Flood Severity (Depth & Extent)'}</span>
                  <span className="font-mono font-bold text-[#173D35]">{floodFactor}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#DDD6C8] overflow-hidden">
                  <div className="h-full bg-[#173D35] rounded-full transition-all duration-500" style={{ width: `${floodFactor}%` }} />
                </div>
              </div>

              {/* Factor 2: Population Exposure */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#66706B] font-medium">{bn ? 'জনঘনত্ব ও নাগরিক ঝুঁকি' : 'Population Exposure'}</span>
                  <span className="font-mono font-bold text-[#173D35]">{populationFactor}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#DDD6C8] overflow-hidden">
                  <div className="h-full bg-[#5D7A4E] rounded-full transition-all duration-500" style={{ width: `${populationFactor}%` }} />
                </div>
              </div>

              {/* Factor 3: Critical Infrastructure */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#66706B] font-medium">{bn ? 'গুরুত্বপূর্ণ স্থাপনা (হাসপাতাল)' : 'Critical Infrastructure (Hospital)'}</span>
                  <span className="font-mono font-bold text-[#173D35]">{infrastructureFactor}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#DDD6C8] overflow-hidden">
                  <div className="h-full bg-[#B68A35] rounded-full transition-all duration-500" style={{ width: `${infrastructureFactor}%` }} />
                </div>
              </div>

              {/* Factor 4: Network Impact */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#66706B] font-medium">{bn ? 'যোগাযোগ ও সড়ক বাধা' : 'Network Impact (Connectivity)'}</span>
                  <span className="font-mono font-bold text-[#173D35]">{networkFactor}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#DDD6C8] overflow-hidden">
                  <div className="h-full bg-[#C96B35] rounded-full transition-all duration-500" style={{ width: `${networkFactor}%` }} />
                </div>
              </div>

              {/* Factor 5: Response Feasibility */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#66706B] font-medium">{bn ? 'পাম্প প্রাপ্যতা ও সক্ষমতা' : 'Response Feasibility'}</span>
                  <span className="font-mono font-bold text-[#173D35]">{feasibilityFactor}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#DDD6C8] overflow-hidden">
                  <div className="h-full bg-[#7A817C] rounded-full transition-all duration-500" style={{ width: `${feasibilityFactor}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: High-Risk, Low-Confidence Advisory Box */}
          <div className="bg-[#FFFDF8] border border-[#B85042]/40 rounded-2xl p-4 shadow-sm gov-card-hover flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#B85042] font-bold text-xs mb-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{bn ? 'উচ্চ ঝুঁকি ও এআই মডেল পরামর্শ' : 'High-Risk Multi-Modal Advisory'}</span>
              </div>
              <p className="text-xs text-[#66706B] leading-relaxed mb-3">
                {bn
                  ? `এই ঘটনাস্থলের ঝুঁকি সর্বোচ্চ হলেও মডেলের আস্থা স্কোর (${confidenceScore}%)। ফিল্ড ক্রস-চেক সুপারিশ করা হচ্ছে।`
                  : `This incident has elevated operational risk with model confidence (${confidenceScore}%). Corroboration advised.`}
              </p>
              <div className="p-2.5 rounded-lg bg-[#B85042]/10 border border-[#B85042]/30 text-[11px] text-[#B85042] font-medium">
                &rarr; {bn ? 'মাঠ পর্যায়ে পরিদর্শক দল / নিকটবর্তী সিসিটিভি ড্রেন ভিশন নিশ্চিত করুন।' : 'Field verification / Edge CCTV stream confirmation recommended.'}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#DDD6C8] text-[10px] text-[#66706B] flex items-center justify-between">
              <span>{bn ? 'নিরাপত্তা বিধি: গেট চেক ছাড়া অটো পাম্পিং নিষিদ্ধ' : 'Safety Rule: Do not auto-pump without gate check'}</span>
              <span className="text-[#173D35] font-semibold">Protocol 3.2.1</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Operator Assignment & Status */}
      <footer className="h-14 border-t border-[#DDD6C8] bg-[#FFFDF8] px-5 flex flex-wrap items-center justify-between gap-4 shrink-0 text-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[#66706B]">{bn ? 'নির্বাচিত ঘটনা:' : 'Selected Incident:'}</span>
            <span className="font-bold text-[#263238]">{activeIncident?.zone_name || 'Mirpur-10'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#66706B]">{bn ? 'দায়িত্বপ্রাপ্ত অপারেটর:' : 'Assigned Operator:'}</span>
            <select
              value={assignedOperator}
              onChange={(e) => handleOperatorChange(e.target.value)}
              className="bg-white border border-[#DDD6C8] rounded px-2 py-1 text-xs text-[#263238] focus:border-[#173D35] outline-none"
            >
              <option value="Ops-01">Ops-01 (DCC Central)</option>
              <option value="Ops-02">Ops-02 (Mirpur Zone)</option>
              <option value="Ops-03">Ops-03 (Gulshan Zone)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#66706B]">{bn ? 'বর্তমান অবস্থা:' : 'Current Status:'}</span>
            <select
              value={incidentStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-white border border-[#DDD6C8] rounded px-2 py-1 text-xs text-[#173D35] font-semibold focus:border-[#173D35] outline-none"
            >
              <option value="In Progress">{bn ? 'প্রক্রিয়াধীন (In Progress)' : 'In Progress'}</option>
              <option value="Assigned">{bn ? 'বরাদ্দকৃত (Assigned)' : 'Assigned'}</option>
              <option value="Field Verified">{bn ? 'যাচাইকৃত (Field Verified)' : 'Field Verified'}</option>
              <option value="Resolved">{bn ? 'সমাধানকৃত (Resolved)' : 'Resolved'}</option>
            </select>
          </div>

          {updateFeedback && (
            <span className="text-xs text-[#5D7A4E] font-bold bg-[#5D7A4E]/10 px-2 py-0.5 rounded border border-[#5D7A4E]/30 animate-fade-in">
              ✓ {updateFeedback}
            </span>
          )}
        </div>

        <div className="text-[11px] text-[#66706B]">
          {bn ? 'সর্বশেষ আপডেট:' : 'Last Update:'} <span className="text-[#263238] font-medium">{bn ? 'এইমাত্র' : 'Just now'}</span>
        </div>
      </footer>
    </div>
  );
};

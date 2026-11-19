import React, { useState, useEffect, useRef } from 'react';
import type { LiveRoadAdvisoryItem, ReportTrackResult } from '../types';
import { apiFetch } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Send,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Waves,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Upload,
  Copy,
  Search,
  X,
  Navigation,
} from 'lucide-react';

const DHAKA_MONITORED_LOCATIONS = [
  { id: 'LOC_001', name: 'Mirpur-10', name_bn: 'মিরপুর-১০' },
  { id: 'LOC_002', name: 'Kazipara', name_bn: 'কাজীপাড়া' },
  { id: 'LOC_003', name: 'Shewrapara', name_bn: 'শেওড়াপাড়া' },
  { id: 'LOC_004', name: 'Kallyanpur', name_bn: 'কল্যাণপুর' },
  { id: 'LOC_005', name: 'Shyamoli', name_bn: 'শ্যামলী' },
  { id: 'LOC_006', name: 'Asad Gate', name_bn: 'আসাদ গেট' },
  { id: 'LOC_007', name: 'Mohammadpur Town Hall', name_bn: 'মোহাম্মদপুর টাউন হল' },
  { id: 'LOC_008', name: 'Dhanmondi 27', name_bn: 'ধানমন্ডি ২৭' },
  { id: 'LOC_009', name: 'Dhanmondi 32 Bridge', name_bn: 'ধানমন্ডি ৩২ ব্রিজ' },
  { id: 'LOC_010', name: 'Kalabagan Dolphin Goli', name_bn: 'কলাবাগান ডলফিন গলি' },
  { id: 'LOC_011', name: 'Green Road Crossing', name_bn: 'গ্রিন রোড ক্রসিং' },
  { id: 'LOC_012', name: 'Panthapath Signal', name_bn: 'পান্থপথ সিগন্যাল' },
  { id: 'LOC_013', name: 'Karwan Bazar Mor', name_bn: 'কারওয়ান বাজার মোড়' },
  { id: 'LOC_014', name: 'Farmgate Ananda Mor', name_bn: 'ফার্মগেট আনন্দ মোড়' },
  { id: 'LOC_015', name: 'Bijoy Sarani Intersection', name_bn: 'বিজয় সরণি মোড়' },
  { id: 'LOC_016', name: 'Jahangir Gate', name_bn: 'জাহাঙ্গীর গেট' },
  { id: 'LOC_017', name: 'Mohakhali Wireless Gate', name_bn: 'মহাখালী ওয়্যারলেস গেট' },
  { id: 'LOC_018', name: 'Mohakhali Bus Terminal', name_bn: 'মহাখালী বাস টার্মিনাল' },
  { id: 'LOC_019', name: 'Banani 11 Intersection', name_bn: 'বনানী ১১ মোড়' },
  { id: 'LOC_020', name: 'Gulshan 1 Circle', name_bn: 'গুলশান ১ সার্কেল' },
  { id: 'LOC_021', name: 'Gulshan 2 Circle', name_bn: 'গুলশান ২ সার্কেল' },
  { id: 'LOC_022', name: 'Badda Link Road', name_bn: 'বাড্ডা লিংক রোড' },
  { id: 'LOC_023', name: 'Rampura Bridge', name_bn: 'রামপুরা ব্রিজ' },
  { id: 'LOC_024', name: 'Malibagh Railgate', name_bn: 'মালিবাগ রেলগেট' },
  { id: 'LOC_025', name: 'Shantinagar Mor', name_bn: 'শান্তিনগর মোড়' },
  { id: 'LOC_026', name: 'Kakrail Mor', name_bn: 'কাকরাইল মোড়' },
  { id: 'LOC_027', name: 'Moghbazar Mor', name_bn: 'মগবাজার মোড়' },
  { id: 'LOC_028', name: 'Banglamotor Mor', name_bn: 'বাংলামোটর মোড়' },
  { id: 'LOC_029', name: 'Shahbagh Intersection', name_bn: 'শাহবাগ মোড়' },
  { id: 'LOC_030', name: 'Nilkhet Mor', name_bn: 'নীলক্ষেত মোড়' },
  { id: 'LOC_031', name: 'Azimpur Bus Stand', name_bn: 'আজিমপুর বাস স্ট্যান্ড' },
  { id: 'LOC_032', name: 'New Market Mor', name_bn: 'নিউ মার্কেট মোড়' },
  { id: 'LOC_033', name: 'Elephant Road Bata Signal', name_bn: 'এলিফ্যান্ট রোড বাটা সিগন্যাল' },
  { id: 'LOC_034', name: 'Science Lab Intersection', name_bn: 'সায়েন্স ল্যাব মোড়' },
  { id: 'LOC_035', name: 'Chawkbazar Mor', name_bn: 'চকবাজার মোড়' },
  { id: 'LOC_036', name: 'Lalbagh Fort Road', name_bn: 'লালবাগ কেল্লা রোড' },
  { id: 'LOC_037', name: 'Nazimuddin Road', name_bn: 'নাজিমুদ্দিন রোড' },
  { id: 'LOC_038', name: 'Sadarghat Launch Terminal', name_bn: 'সদরঘাট লঞ্চ টার্মিনাল' },
  { id: 'LOC_039', name: 'Motijheel Shapla Chattar', name_bn: 'মতিঝিল শাপলা চত্বর' },
  { id: 'LOC_040', name: 'Paltan Mor', name_bn: 'পল্টন মোড়' },
  { id: 'LOC_041', name: 'Sayedabad Bus Terminal', name_bn: 'সায়েদাবাদ বাস টার্মিনাল' },
  { id: 'LOC_042', name: 'Jatrabari Mor', name_bn: 'যাত্রাবাড়ী মোড়' },
  { id: 'LOC_043', name: 'Jurain Rail Crossing', name_bn: 'জুরাইন রেল ক্রসিং' },
  { id: 'LOC_044', name: 'Postogola Bridge Approach', name_bn: 'পোস্তগোলা ব্রিজ এপ্রোচ' },
  { id: 'LOC_045', name: 'Kamrangirchar Main Road', name_bn: 'কামরাঙ্গীরচর মেইন রোড' },
  { id: 'LOC_046', name: 'Hazaribagh Tannery Mor', name_bn: 'হাজারীবাগ ট্যানারি মোড়' },
  { id: 'LOC_047', name: 'Rayerbazar Sluice Gate', name_bn: 'রায়েরবাজার স্লুইস গেট' },
  { id: 'LOC_048', name: 'Gabtoli Bus Terminal', name_bn: 'গাবতলী বাস টার্মিনাল' },
  { id: 'LOC_049', name: 'Kuril Flyover Intersection', name_bn: 'কুড়িল ফ্লাইওভার ইন্টারসেকশন' },
  { id: 'LOC_050', name: 'Uttara Sector 3 Jashimuddin', name_bn: 'উত্তরা ৩ নম্বর সেক্টর জসীমউদ্দীন' },
];

export const CitizenReportingPortal: React.FC<{ showOperationsFeed?: boolean }> = () => {
  const { lang } = useLanguage();
  const bn = lang === 'bn';

  const [activeTab, setActiveTab] = useState<'report' | 'track' | 'roads'>('report');

  // Form State
  const [monitoredLocations, setMonitoredLocations] = useState(DHAKA_MONITORED_LOCATIONS);
  const [selectedLocation, setSelectedLocation] = useState<string>('LOC_008'); // Default to Dhanmondi 27
  const [reportText, setReportText] = useState<string>('');
  const [severity, setSeverity] = useState<string>('Waterlogged');
  const [roadBlockage, setRoadBlockage] = useState<boolean>(true);
  const [debrisPresent, setDebrisPresent] = useState<boolean>(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tracking Lookup State
  const [trackQuery, setTrackQuery] = useState<string>('');
  const [trackingResult, setTrackingResult] = useState<ReportTrackResult | null>(null);
  const [trackLoading, setTrackLoading] = useState<boolean>(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Live Road Advisories State
  const [roadAdvisories, setRoadAdvisories] = useState<LiveRoadAdvisoryItem[]>([]);
  const [roadSearch, setRoadSearch] = useState<string>('');
  const [roadsLoading, setRoadsLoading] = useState<boolean>(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch dynamic verified monitored locations from backend
  useEffect(() => {
    apiFetch<any[]>('/api/v1/reports/locations')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMonitoredLocations(data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch dynamic locations, using canonical fallback:', err);
      });
  }, []);

  // Load road advisories on mount or when switching to roads tab
  useEffect(() => {
    if (activeTab === 'roads') {
      void fetchRoadAdvisories();
    }
  }, [activeTab]);

  const fetchRoadAdvisories = async () => {
    try {
      setRoadsLoading(true);
      const res = await apiFetch<LiveRoadAdvisoryItem[]>('/api/v1/public/road-advisories');
      setRoadAdvisories(res ?? []);
    } catch (e) {
      console.warn('Could not fetch road advisories:', e);
    } finally {
      setRoadsLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(bn ? 'ফাইলের আকার ১০ মেগাবাইটের বেশি হতে পারবে না।' : 'File size cannot exceed 10 MB.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSubmitResult(null);

      const formData = new FormData();
      formData.append('location_id', selectedLocation);
      formData.append('description', reportText);
      formData.append('severity', severity);
      formData.append('road_blockage', roadBlockage ? 'true' : 'false');
      formData.append('debris_present', debrisPresent ? 'true' : 'false');
      formData.append('reporter_type', 'verified_public');
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await apiFetch<any>('/api/v1/reports/submit-form', {
        method: 'POST',
        body: formData,
      });

      setSubmitResult(res);
      setReportText('');
      handleRemovePhoto();
    } catch (err: any) {
      setErrorMsg(err.message || 'Report submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;

    try {
      setTrackLoading(true);
      setTrackError(null);
      setTrackingResult(null);
      const res = await apiFetch<ReportTrackResult>(`/api/v1/reports/track/${trackQuery.trim()}`);
      setTrackingResult(res);
    } catch (err: any) {
      setTrackError(err.message || (bn ? 'রিপোর্টটি পাওয়া যায়নি।' : 'Tracking ID not found.'));
    } finally {
      setTrackLoading(false);
    }
  };

  const filteredRoads = roadAdvisories.filter((r) => {
    const q = roadSearch.toLowerCase();
    return (
      r.road_name.toLowerCase().includes(q) ||
      r.road_name_bn.toLowerCase().includes(q) ||
      r.zone_name.toLowerCase().includes(q) ||
      r.zone_name_bn.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full w-full bg-[#F5F0E6] overflow-y-auto text-[#263238] p-4 md:p-6 animate-fade-in">
      {/* Tab Switcher */}
      <div className="max-w-2xl mx-auto w-full mb-6">
        <div className="flex rounded-2xl bg-[#FFFDF8] border border-[#DDD6C8] p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'report'
                ? 'bg-[#173D35] text-[#FFFDF8] shadow-xs'
                : 'text-[#66706B] hover:text-[#263238]'
            }`}
          >
            <Camera className="w-4 h-4" />
            {bn ? 'নাগরিক জলজট রিপোর্ট' : 'Report Waterlogging'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roads')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'roads'
                ? 'bg-[#173D35] text-[#FFFDF8] shadow-xs'
                : 'text-[#66706B] hover:text-[#263238]'
            }`}
          >
            <Navigation className="w-4 h-4" />
            {bn ? 'লাইভ রাস্তা পরিস্থিতি' : 'Live Road Advisories'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('track')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'track'
                ? 'bg-[#173D35] text-[#FFFDF8] shadow-xs'
                : 'text-[#66706B] hover:text-[#263238]'
            }`}
          >
            <Search className="w-4 h-4" />
            {bn ? 'রিপোর্ট ট্র্যাক করুন' : 'Track Report Status'}
          </button>
        </div>
      </div>

      {/* TAB 1: REPORT SUBMISSION */}
      {activeTab === 'report' && (
        <div className="max-w-xl mx-auto w-full">
          <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-3xl p-6 shadow-sm gov-card-hover space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-[#263238] flex items-center gap-2">
                <Waves className="w-5 h-5 text-[#173D35]" />
                {bn ? 'নাগরিক জলজট ও বর্জ্য রিপোর্ট দাখিল' : 'Report Waterlogging & Drainage Obstruction'}
              </h3>
              <p className="text-xs text-[#66706B] mt-1">
                {bn
                  ? 'ঢাকা শহরের জলাবদ্ধতা ও বর্জ্য রিপোর্ট করুন। আপনার ছবি অফ-চেইনে সংরক্ষিত হয়ে অপারেটর কমান্ডে সরাসরি পাঠানো হবে।'
                  : 'Help Dhaka authorities respond faster. Photos stay off-chain; audit ledger stores cryptographic hashes.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#B85042]/10 border border-[#B85042]/30 text-[#B85042] text-xs">
                {errorMsg}
              </div>
            )}

            {submitResult ? (
              <div className="p-5 rounded-2xl bg-[#5D7A4E]/10 border border-[#5D7A4E]/30 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#5D7A4E] font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-[#5D7A4E]" />
                    {bn ? 'রিপোর্ট সফলভাবে গৃহীত হয়েছে' : 'Report Successfully Submitted'}
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#5D7A4E]/15 text-[#24574C] border border-[#5D7A4E]/30 font-bold">
                    {submitResult.credibility_band} Credibility
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#DDD6C8] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#66706B] block font-mono">TRACKING ID</span>
                    <span className="text-sm font-mono font-bold text-[#173D35]">{submitResult.tracking_id}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(submitResult.tracking_id);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    className="p-2 rounded-lg bg-[#F5F0E6] hover:bg-[#DDD6C8] text-[#263238] border border-[#DDD6C8] text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedId ? (bn ? 'কপি হয়েছে!' : 'Copied!') : bn ? 'কপি' : 'Copy'}
                  </button>
                </div>

                {/* Gemini AI Summary Pill */}
                {submitResult.gemini_analysis && (
                  <div className="p-3 rounded-xl bg-[#173D35]/10 border border-[#173D35]/20 text-[#173D35] text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-[#173D35]" />
                      {submitResult.gemini_analysis.provider === 'gemini'
                        ? bn
                          ? 'জেমিনাই ভিশন এআই চাক্ষুষ বিশ্লেষণ (পরামর্শমূলক)'
                          : 'Gemini Vision AI Analysis (Advisory)'
                        : bn
                        ? 'সিমুলেশন / নিয়ম-ভিত্তিক বিশ্লেষণ'
                        : 'Simulation / Rule-Based Analysis'}
                    </div>
                    <p className="text-[11px] text-[#263238]">
                      {bn
                        ? submitResult.gemini_analysis.analysis_summary_bn || submitResult.gemini_analysis.analysis_summary_en
                        : submitResult.gemini_analysis.analysis_summary_en}
                    </p>
                  </div>
                )}

                {/* Credibility Explanation */}
                <div className="text-xs text-[#263238] space-y-1 bg-[#F5F0E6] p-3 rounded-xl border border-[#DDD6C8]">
                  <span className="font-bold text-[#263238] text-[11px] block">
                    {bn ? 'বিশ্বাসযোগ্যতা ও প্রমাণের ভিত্তি:' : 'Credibility Assessment Breakdown:'}
                  </span>
                  <p className="text-[11px] text-[#66706B]">
                    {bn ? submitResult.credibility_explanation_bn : submitResult.credibility_explanation_en}
                  </p>
                </div>

                {/* Citizen Guidance & Next Steps */}
                <div className="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#DDD6C8] text-xs space-y-2">
                  <span className="font-bold text-[#8c6722] flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-[#8c6722]" />
                    {bn ? 'নাগরিকদের জন্য পরবর্তী করণীয় (Next Steps):' : 'Recommended Next Steps for Citizens:'}
                  </span>
                  <div className="space-y-1 text-[#66706B] text-[11px]">
                    <p>
                      • <strong className="text-[#263238]">{bn ? 'এই রাস্তা এড়িয়ে চলুন:' : 'Avoid this route:'}</strong>{' '}
                      {bn ? 'পানি নিষ্কাশন ও ড্রেন ক্লিয়ার না হওয়া পর্যন্ত বিকল্প নিরাপদ পথ ব্যবহার করুন।' : 'Use alternative diversion routes until water recedes.'}
                    </p>
                    <p>
                      • <strong className="text-[#263238]">{bn ? 'অপারেশন টিমের রেসপন্স:' : 'Response in progress:'}</strong>{' '}
                      {bn ? 'আপনার রিপোর্টটি আঞ্চলিক হাইড্রোলজিক্যাল অ্যানালিস্ট ও পাম্প কন্ট্রোল কিউতে পাঠানো হয়েছে।' : 'Report forwarded to Regional Operations Analyst queue.'}
                    </p>
                    <p>
                      • <strong className="text-[#263238]">{bn ? 'ট্র্যাকিং আইডি সংরক্ষণ করুন:' : 'Save Tracking ID:'}</strong>{' '}
                      {bn ? '"রিপোর্ট ট্র্যাক করুন" ট্যাবে যেকোনো সময় সর্বশেষ অগ্রগতি দেখতে পারবেন।' : 'Track live status anytime via the Track Status tab.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSubmitResult(null)}
                  className="w-full py-2.5 rounded-xl bg-[#173D35] hover:bg-[#24574C] text-[#FFFDF8] font-bold text-xs shadow-xs transition"
                >
                  {bn ? 'আরেকটি রিপোর্ট দাখিল করুন' : 'Submit Another Report'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                {/* Location Select */}
                <div>
                  <label className="block text-[#263238] font-bold mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#173D35]" />
                    {bn ? 'ঢাকা অবস্থান নির্বাচন করুন *' : 'Select Monitored Dhaka Location *'}
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-2.5 text-[#263238] font-medium focus:outline-none focus:border-[#173D35]"
                  >
                    {monitoredLocations.map((loc: any) => {
                      const locId = loc.id || loc.location_id;
                      const nameEn = loc.name || loc.zone_name;
                      const nameBn = loc.name_bn || loc.zone_name_bn || nameEn;
                      return (
                        <option key={locId} value={locId}>
                          {bn ? nameBn : nameEn} ({locId})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[#263238] font-bold">
                      {bn ? 'বিবরণ লিখুন (বাংলা বা ইংরেজি) *' : 'Description (Bangla or English) *'}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setReportText(
                            'মিরপুর ১০ মোড়ে কোমর সমান পানি এবং ড্রেনের মুখে প্রচুর প্লাস্টিক বর্জ্য জমে আছে। যান চলাচল বন্ধ!'
                          )
                        }
                        className="text-[10px] text-[#173D35] font-semibold hover:underline"
                      >
                        {bn ? 'নমুনা বাংলা' : 'Sample BN'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setReportText(
                            'Severe waterlogging on Dhanmondi 27. Water is knee-deep and traffic blocked.'
                          )
                        }
                        className="text-[10px] text-[#173D35] font-semibold hover:underline"
                      >
                        {bn ? 'নমুনা ইংরেজি' : 'Sample EN'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder={
                      bn
                        ? 'রাস্তার পানির আনুমানিক গভীরতা, ল্যান্ডমার্ক বা সমস্যার বিবরণ দিন…'
                        : 'Describe water depth, landmarks, and road situation…'
                    }
                    className="w-full bg-[#FFFDF8] border border-[#DDD6C8] rounded-xl p-3 text-[#263238] placeholder-[#8C9893] focus:outline-none focus:border-[#173D35]"
                  />
                </div>

                {/* Severity Selection */}
                <div>
                  <label className="block text-[#263238] font-bold mb-1.5 flex items-center justify-between text-xs">
                    <span>{bn ? 'আনুমানিক গভীরতা ও তীব্রতা (উভয় রঙ ও চিহ্ন দ্বারা চিহ্নিত):' : 'Estimated Water Severity (Multi-cue):'}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'Watch', icon: AlertTriangle, label: 'Watch / Ankle (<10cm)', label_bn: 'সতর্কতা / গোড়ালি (<১০ সেমি)', color: 'text-yellow-700 border-yellow-500/50 bg-yellow-500/15' },
                      { val: 'Waterlogged', icon: Waves, label: 'Waterlogged / Knee (10-30cm)', label_bn: 'জলাবদ্ধতা / হাঁটু (১০-৩০ সেমি)', color: 'text-amber-700 border-amber-500/50 bg-amber-500/15' },
                      { val: 'Severe', icon: ShieldAlert, label: 'Severe / Waist (>30cm)', label_bn: 'গুরুতর / কোমর (>৩০ সেমি)', color: 'text-rose-700 border-rose-500/50 bg-rose-500/15' },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSel = severity === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setSeverity(item.val)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition font-semibold text-[11px] ${
                            isSel
                              ? `${item.color} shadow-sm ring-2 ring-[#173D35]`
                              : 'bg-white border-[#DDD6C8] text-[#66706B] hover:text-[#263238] hover:border-[#173D35]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-center">{bn ? item.label_bn : item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="p-3 rounded-xl bg-white border border-[#DDD6C8] flex items-center justify-between cursor-pointer hover:border-[#173D35]">
                    <span className="text-[#263238] text-[11px] font-semibold">
                      {bn ? 'রাস্তায় যান চলাচল বন্ধ' : 'Road Blocked'}
                    </span>
                    <input
                      type="checkbox"
                      checked={roadBlockage}
                      onChange={(e) => setRoadBlockage(e.target.checked)}
                      className="rounded border-[#DDD6C8] text-[#173D35] focus:ring-[#173D35] h-4 w-4"
                    />
                  </label>
                  <label className="p-3 rounded-xl bg-white border border-[#DDD6C8] flex items-center justify-between cursor-pointer hover:border-[#173D35]">
                    <span className="text-[#263238] text-[11px] font-semibold">
                      {bn ? 'ড্রেনে প্লাস্টিক / বর্জ্য' : 'Solid Waste / Debris'}
                    </span>
                    <input
                      type="checkbox"
                      checked={debrisPresent}
                      onChange={(e) => setDebrisPresent(e.target.checked)}
                      className="rounded border-[#DDD6C8] text-[#173D35] focus:ring-[#173D35] h-4 w-4"
                    />
                  </label>
                </div>

                {/* Real File Upload & Dropzone */}
                <div>
                  <label className="block text-[#263238] font-bold mb-1.5 flex items-center justify-between">
                    <span>{bn ? 'ঘটনাস্থলের ছবি সংযুক্ত করুন (ঐচ্ছিক)' : 'Attach On-Site Photo (Optional)'}</span>
                    <span className="text-[10px] text-[#66706B] font-normal">JPG, PNG, WEBP &bull; Max 10MB</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />

                  {photoPreview ? (
                    <div className="relative rounded-2xl border border-[#173D35]/30 p-2 bg-white flex items-center gap-3">
                      <img
                        src={photoPreview}
                        alt="Uploaded preview"
                        className="h-16 w-16 object-cover rounded-xl border border-[#DDD6C8]"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-[#263238] truncate block">
                          {photoFile?.name}
                        </span>
                        <span className="text-[10px] text-[#66706B]">
                          {((photoFile?.size || 0) / 1024).toFixed(1)} KB &bull; Verified Format
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#DDD6C8] hover:border-[#173D35] rounded-2xl p-4 text-center cursor-pointer transition bg-white"
                    >
                      <Upload className="w-6 h-6 mx-auto text-[#66706B] mb-1" />
                      <span className="text-xs font-semibold text-[#263238] block">
                        {bn ? 'ছবি আপলোড করতে ক্লিক করুন' : 'Click or drop on-site photo here'}
                      </span>
                      <span className="text-[10px] text-[#66706B]">
                        {bn
                          ? 'জেমিনাই ভিশন এআই স্বয়ংক্রিয়ভাবে পানির স্তর ও ময়লা শনাক্ত করবে'
                          : 'Gemini Vision AI validates depth bands and debris accumulation'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Privacy & Off-chain Guarantee */}
                <div className="p-3 rounded-xl bg-[#173D35]/10 border border-[#173D35]/20 text-[11px] text-[#263238] flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#173D35] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#173D35] font-semibold block mb-0.5">
                      {bn ? 'অফ-চেইন প্রাইভেসী গ্যারান্টি:' : 'Off-Chain Media Privacy Disclosure:'}
                    </strong>
                    {bn
                      ? 'নাগরিকদের মূল ছবি কখনো পাবলিক ব্লকচেইনে উন্মুক্ত হয় না। নিরাপদ অফ-চেইনে সংরক্ষিত হয়ে কেবল ক্রিপ্টোগ্রাফিক SHA-256 হ্যাশ অডিট লেজারে রাখা হয়।'
                      : 'Raw photos stay strictly off-chain in encrypted storage. Only SHA-256 cryptographic hashes and metadata enter the municipal audit ledger.'}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#173D35] hover:bg-[#24574C] disabled:opacity-50 text-[#FFFDF8] rounded-xl font-bold shadow-xs transition flex items-center justify-center gap-2 text-xs"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? (bn ? 'দাখিল হচ্ছে…' : 'Submitting…') : bn ? 'রিপোর্ট দাখিল করুন' : 'Submit Report'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE ROAD ADVISORIES */}
      {activeTab === 'roads' && (
        <div className="max-w-2xl mx-auto w-full space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={roadSearch}
                onChange={(e) => setRoadSearch(e.target.value)}
                placeholder={
                  bn
                    ? 'রাস্তা বা এলাকা খুঁজুন (যেমন: মিরপুর, ধানমন্ডি, গ্রিন রোড)…'
                    : 'Search road or area (e.g. Mirpur, Dhanmondi, Green Rd)…'
                }
                className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              onClick={fetchRoadAdvisories}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              {bn ? 'রিফ্রেশ' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-3">
            {roadsLoading && (
              <div className="text-center py-10 text-slate-400 text-xs">
                {bn ? 'রাস্তার তথ্য লোড হচ্ছে…' : 'Loading road advisories…'}
              </div>
            )}

            {!roadsLoading && filteredRoads.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                {bn ? 'কোনো রাস্তা পাওয়া যায়নি' : 'No matching road records'}
              </div>
            )}

            {!roadsLoading &&
              filteredRoads.map((road) => (
                <div
                  key={road.road_id}
                  className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 transition space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {bn ? road.road_name_bn : road.road_name}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {bn ? road.zone_name_bn : road.zone_name} &bull; Depth: {road.water_depth_cm} cm
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                          road.passability === 'Closed'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : road.passability === 'Restricted'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : road.passability === 'Caution'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {bn ? road.passability_bn : road.passability}
                      </span>
                      {road.delay_minutes > 0 && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {bn ? road.delay_label_bn : road.delay_label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trash hazard note */}
                  {road.debris_hazard_present && (
                    <div className="p-2 rounded-xl bg-orange-950/30 border border-orange-500/30 text-orange-200 text-[11px] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>{bn ? road.trash_notice_bn : road.trash_notice_en}</span>
                    </div>
                  )}

                  {/* Safe route suggestion */}
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-[11px] flex items-start gap-2">
                    <Navigation className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-300 font-bold block mb-0.5">
                        {bn ? 'বিকল্প নিরাপদ রুট পরামর্শ:' : 'Safer Alternate Route:'}
                      </strong>
                      <span>{bn ? road.safe_route_suggestion_bn : road.safe_route_suggestion_en}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 3: TRACK REPORT STATUS */}
      {activeTab === 'track' && (
        <div className="max-w-xl mx-auto w-full">
          <div className="bg-[#FFFDF8] border border-[#DDD6C8] rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-[#263238] flex items-center gap-2">
                <Search className="w-5 h-5 text-[#173D35]" />
                {bn ? 'আপনার রিপোর্ট স্ট্যাটাস খুঁজুন' : 'Track Your Waterlogging Report'}
              </h3>
              <p className="text-xs text-[#66706B] mt-1">
                {bn
                  ? 'রিপোর্ট দাখিলের সময় প্রাপ্ত ট্র্যাকিং আইডি প্রবেশ করিয়ে বর্তমান পর্যালোচনা বা অ্যাকশন জানুন।'
                  : 'Enter your tracking ID (e.g. WL-20261117-XXXX) to view municipal triage status.'}
              </p>
            </div>

            <form onSubmit={handleTrackSubmit} className="flex gap-2">
              <input
                type="text"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="WL-20261119-XXXX"
                className="flex-1 bg-white border border-[#DDD6C8] rounded-xl px-3 py-2.5 text-xs text-[#263238] placeholder-[#8C9893] font-mono focus:outline-none focus:border-[#173D35]"
              />
              <button
                type="submit"
                disabled={trackLoading}
                className="px-4 py-2.5 rounded-xl bg-[#173D35] hover:bg-[#24574C] text-[#FFFDF8] font-bold text-xs transition"
              >
                {trackLoading ? (bn ? 'অনুসন্ধান…' : 'Tracking…') : bn ? 'ট্র্যাক করুন' : 'Track'}
              </button>
            </form>

            {trackError && (
              <div className="p-3 rounded-xl bg-[#B85042]/10 border border-[#B85042]/30 text-[#B85042] text-xs font-semibold">
                {trackError}
              </div>
            )}

            {trackingResult && (
              <div className="p-5 rounded-2xl bg-white border border-[#DDD6C8] space-y-3.5 shadow-xs animate-fade-in">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#DDD6C8]">
                  <span className="font-mono text-[#173D35] font-bold">{trackingResult.tracking_id}</span>
                  <span className="text-[#66706B]">{trackingResult.timestamp.slice(0, 16).replace('T', ' ')}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-[#66706B] block">{bn ? 'অবস্থান:' : 'Location:'}</span>
                    <span className="text-sm font-bold text-[#263238]">
                      {bn ? (trackingResult.zone_name_bn || trackingResult.zone_name) : trackingResult.zone_name}
                      <span className="text-xs text-[#66706B] font-mono ml-1.5 font-normal">({trackingResult.location_id})</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#66706B] block">{bn ? 'স্ট্যাটাস:' : 'Status:'}</span>
                    <span className="px-2.5 py-1 rounded-full bg-[#173D35]/10 text-[#173D35] border border-[#173D35]/30 text-xs font-bold">
                      {bn ? trackingResult.status_title_bn : trackingResult.status_title_en}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#173D35]/5 border border-[#173D35]/20 text-[#263238] text-xs space-y-1">
                  <span className="text-[#173D35] font-bold block">{bn ? 'পাবলিক নোটিশ:' : 'Municipal Notice:'}</span>
                  <p className="text-[#66706B]">{bn ? trackingResult.public_notice_bn : trackingResult.public_notice_en}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

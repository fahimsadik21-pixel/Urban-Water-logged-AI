import { Activity, AlertTriangle, ArrowRight, MapPinned, ShieldCheck, UsersRound } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { HotspotFeature, IncidentRecord } from '../types';

interface GovernmentOverviewProps {
  hotspots: HotspotFeature[];
  incidents: IncidentRecord[];
  onOpenOperations: () => void;
  onOpenPublic: () => void;
}

export function GovernmentOverview({ hotspots, incidents, onOpenOperations, onOpenPublic }: GovernmentOverviewProps) {
  const { lang } = useLanguage();
  const bn = lang === 'bn';
  const severe = hotspots.filter((item) => item.properties.current_severity === 'Severe').length;
  const waterlogged = hotspots.filter((item) => item.properties.current_severity === 'Waterlogged').length;
  const activeCount = incidents.length > 0
    ? incidents.length
    : hotspots.filter((item) => item.properties.has_incident || item.properties.current_severity === 'Severe' || item.properties.current_severity === 'Waterlogged').length;
  const priority = incidents.length > 0
    ? incidents.filter((item) => item.priority_class === 'P1').length
    : hotspots.filter((item) => item.properties.priority_class === 'P1').length;
  const cards = [
    { label: bn ? 'তীব্র জলাবদ্ধতা' : 'Severe waterlogging', value: severe, hint: bn ? 'দ্রুত যাচাই প্রয়োজন' : 'Needs rapid verification', icon: AlertTriangle, color: 'text-[#B85042] bg-[#FFFDF8] border-[#B85042]/30' },
    { label: bn ? 'জলাবদ্ধ এলাকা' : 'Waterlogged areas', value: waterlogged, hint: bn ? 'মানচিত্রে দেখুন' : 'View on the map', icon: MapPinned, color: 'text-[#C96B35] bg-[#FFFDF8] border-[#C96B35]/30' },
    { label: bn ? 'সক্রিয় ঘটনা' : 'Active incidents', value: activeCount, hint: bn ? 'অপারেশন টিমের কিউ' : 'In the operations queue', icon: Activity, color: 'text-[#173D35] bg-[#FFFDF8] border-[#173D35]/30' },
    { label: bn ? 'অতি গুরুত্বপূর্ণ' : 'P1 priority', value: priority, hint: bn ? 'হাসপাতাল ও জরুরি সেবা' : 'Hospital and emergency impact', icon: ShieldCheck, color: 'text-[#8c6722] bg-[#FFFDF8] border-[#B68A35]/30' },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[#F5F0E6] animate-fade-in">
      <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 sm:p-7 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#173D35]">{bn ? 'ঢাকা সিটি কর্পোরেশন · অপারেশন ড্যাশবোর্ড' : 'Dhaka City Corporation · Operations dashboard'}</p>
        <h1 className="mt-2 max-w-3xl text-2xl font-extrabold leading-tight text-[#263238] sm:text-3xl">{bn ? 'জলাবদ্ধতার খবর, যাচাই ও নিরাপদ প্রতিক্রিয়া—এক জায়গায়।' : 'One clear place to detect, verify and respond to waterlogging safely.'}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#66706B]">{bn ? 'এটি সিমুলেশন ডেমো। সেন্সর, ক্যামেরা ও নাগরিক রিপোর্টের তথ্য একত্র করে অপারেশন টিমকে সিদ্ধান্তে সহায়তা করে; পাম্পের নিরাপত্তা গেট ও অনুমোদন আলাদা থাকে।' : 'This is a simulation demo. It brings together sensor, camera and citizen-report evidence to support operations; pump safety gates and human approval remain separate.'}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={onOpenOperations} className="inline-flex items-center gap-2 rounded-lg bg-[#173D35] px-4 py-2.5 text-sm font-bold text-[#FFFDF8] hover:bg-[#24574C] transition shadow-xs">{bn ? 'মানচিত্র ও অপারেশন খুলুন' : 'Open map and operations'} <ArrowRight className="h-4 w-4" /></button>
          <button type="button" onClick={onOpenPublic} className="inline-flex items-center gap-2 rounded-lg border border-[#DDD6C8] bg-white px-4 py-2.5 text-sm font-bold text-[#263238] hover:border-[#173D35] transition shadow-xs">{bn ? 'নাগরিক সেবা' : 'Citizen services'} <UsersRound className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon, color }) => (
          <article key={label} className={`rounded-xl border p-4 shadow-xs gov-card-hover ${color}`}>
            <div className="flex items-start justify-between"><span className="text-xs font-bold text-[#263238]">{label}</span><Icon className="h-5 w-5" /></div>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-[#66706B]">{hint}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

import { useState, useEffect, type FormEvent } from 'react';
import {
  Activity,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Users,
  BadgeCheck,
  Sparkles,
  Phone,
  Briefcase,
  MapPin,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sliders,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { CivicWaterLogo } from './CivicWaterLogo';
import type { AuthPortalName, UserRole } from '../types';

const SLIDES = [
  {
    src: '/slideshow/dhaka_shapla_chattar.jpg',
    altBn: 'মতিঝিল শাপলা চত্বর ফোয়ারা ও বাণিজ্যিক এলাকা',
    altEn: 'Shapla Chattar fountain & commercial roundabout in Motijheel',
    locationBn: 'মতিঝিল শাপলা চত্বর (হটস্পট #৩৫)',
    locationEn: 'Motijheel Shapla Chattar (Hotspot #35)',
  },
  {
    src: '/slideshow/dhaka_sangsad_bhaban.jpg',
    altBn: 'জাতীয় সংসদ ভবন ও চন্দ্রিমা লেক জলাধার এলাকা',
    altEn: 'National Parliament Building & Chandrima Lake catchment basin',
    locationBn: 'জাতীয় সংসদ ভবন ও মানিক মিয়া এভিনিউ (হটস্পট #১৪)',
    locationEn: 'National Parliament & Manik Mia Ave (Hotspot #14)',
  },
  {
    src: '/slideshow/dhaka_mirpur_10_metro.jpg',
    altBn: 'মিরপুর-১০ মেট্রোরেল স্টেশন ও গোলচত্বর ট্রানজিট করিডোর',
    altEn: 'Mirpur-10 Metro Rail Station and arterial transit roundabout',
    locationBn: 'মিরপুর-১০ গোলচত্বর ও মেট্রোরেল করিডোর (হটস্পট #০১)',
    locationEn: 'Mirpur-10 Circle & Metro Corridor (Hotspot #01)',
  },
  {
    src: '/slideshow/dhaka_gulshan_avenue.jpg',
    altBn: 'গুলশান এভিনিউ বাণিজ্যিক এলাকা ও হাতিরঝিল ড্রেনেজ করিডোর',
    altEn: 'Gulshan Avenue commercial corridor & Hatirjheel drainage link',
    locationBn: 'গুলশান-১ ও এভিনিউ করিডোর (হটস্পট #০৭)',
    locationEn: 'Gulshan-1 & Avenue Corridor (Hotspot #07)',
  },
  {
    src: '/slideshow/dhaka_dhanmondi_mirpur_road.jpg',
    altBn: 'ধানমন্ডি ও মিরপুর রোড প্রধান ট্রানজিট এভিনিউ',
    altEn: 'Mirpur Road & Dhanmondi main urban transit avenue',
    locationBn: 'মিরপুর রোড ও ধানমন্ডি ২৭ (হটস্পট #০৫)',
    locationEn: 'Mirpur Road & Dhanmondi 27 (Hotspot #05)',
  },
  {
    src: '/slideshow/dhaka_bijoy_sarani.jpg',
    altBn: 'বিজয় সরণি ইন্টারসেকশন ও ড্রেনেজ অববাহিকা এলাকা',
    altEn: 'Bijoy Sarani major intersection & drainage catchment basin',
    locationBn: 'বিজয় সরণি সংযোগ মোড় (হটস্পট #১৮)',
    locationEn: 'Bijoy Sarani Intersection (Hotspot #18)',
  },
];

const portalCopy: Record<AuthPortalName, { title: string; subtitle: string; icon: typeof Users; titleBn: string; subtitleBn: string }> = {
  civic: {
    title: 'Civic Access (Citizen)',
    subtitle: 'Report waterlogging and follow verified road advisories.',
    titleBn: 'নাগরিক প্রবেশ (সাধারণ জনগণ)',
    subtitleBn: 'জলাবদ্ধতার তথ্য রিপোর্ট করুন এবং নিরাপদ রাস্তার খবর জানুন।',
    icon: Users,
  },
  operations: {
    title: 'Operations Access (Analyst & Operator)',
    subtitle: 'For hydrological analysts, CCTV vision stations and pump operators.',
    titleBn: 'অপারেশনস কন্ট্রোল (বিশ্লেষক ও অপারেটর)',
    subtitleBn: 'হাইড্রোলজিক্যাল ও সিসিটিভি বিশ্লেষক এবং পাম্প চালকদের জন্য।',
    icon: Activity,
  },
  admin: {
    title: 'Executive Admin Access',
    subtitle: 'Municipal disaster response, waste management & governance.',
    titleBn: 'নির্বাহী প্রশাসন (ডিএনসিসি / ডিএসসিসি)',
    subtitleBn: 'দুর্যোগ ব্যবস্থাপনা, বর্জ্য অপসারণ ও সার্বিক নিয়ন্ত্রণ।',
    icon: ShieldCheck,
  },
};

const roleInfo: Record<UserRole, { label: string; labelBn: string; icon: typeof Users; color: string; desc: string; descBn: string }> = {
  civic: {
    label: 'Citizen (নাগরিক)',
    labelBn: 'সাধারণ নাগরিক',
    icon: Users,
    color: 'from-emerald-600 to-teal-500',
    desc: 'Report waterlogging, road safety & alerts',
    descBn: 'জলাবদ্ধতা রিপোর্ট, রাস্তার ট্রাফিক সতর্কতা',
  },
  analyst: {
    label: 'Analyst (বিশ্লেষক)',
    labelBn: 'হাইড্রোলজি ও সিসিটিভি বিশ্লেষক',
    icon: Cpu,
    color: 'from-cyan-600 to-blue-500',
    desc: 'Live ML Explainability, CCTV & Pump Actuation',
    descBn: 'এআই বিশ্লেষণ, সিসিটিভি যাচাই ও পাম্প সিগন্যাল',
  },
  operator: {
    label: 'Operator (অপারেটর)',
    labelBn: 'পাম্প স্টেশন চালক',
    icon: Sliders,
    color: 'from-blue-600 to-indigo-500',
    desc: 'Pump Control Console, 8 Safety Gates & E-Stop',
    descBn: 'পাম্প কন্ট্রোল কনসোল, ৮টি সেফটি গেট ও E-Stop',
  },
  admin: {
    label: 'Admin (প্রশাসন)',
    labelBn: 'সিটি কর্পোরেশন কর্মকর্তা',
    icon: ShieldCheck,
    color: 'from-purple-600 to-pink-500',
    desc: 'DNCC Debris Dispatch & User Management',
    descBn: 'বর্জ্য অপসারণ টিম প্রেরণ ও সার্বিক নিয়ন্ত্রণ',
  },
};

export function AuthPortal() {
  const { login, registerUser } = useAuth();
  const { lang, setLang } = useLanguage();
  const [portal, setPortal] = useState<AuthPortalName>('operations');
  const [registering, setRegistering] = useState(false);

  // Simple form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('analyst');
  const [showPassword, setShowPassword] = useState(false);

  // Optional extra details
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [assignedZone, setAssignedZone] = useState('');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flood photo slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches || isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const changePortal = (nextPortal: AuthPortalName) => {
    setPortal(nextPortal);
    if (nextPortal === 'civic') setSelectedRole('civic');
    else if (nextPortal === 'operations') setSelectedRole('analyst');
    else if (nextPortal === 'admin') setSelectedRole('admin');
    setError(null);
  };

  const handleQuickDemo = async (role: 'civic' | 'analyst' | 'operator' | 'admin') => {
    setError(null);
    setSubmitting(true);
    try {
      if (role === 'civic') {
        await login('civic', 'CivicDemo#2026', 'civic');
      } else if (role === 'analyst') {
        await login('analyst', 'AnalystDemo#2026', 'operations');
      } else if (role === 'operator') {
        await login('operator', 'OperatorDemo#2026', 'operations');
      } else {
        await login('admin', 'AdminDemo#2026', 'admin');
      }
    } catch (err: any) {
      setError(err?.message || 'ডেমো লগইন ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError(lang === 'bn' ? 'ব্যবহারকারীর নাম লিখুন' : 'Please enter a username');
      setSubmitting(false);
      return;
    }
    if (!password) {
      setError(lang === 'bn' ? 'পাসওয়ার্ড লিখুন' : 'Please enter a password');
      setSubmitting(false);
      return;
    }

    try {
      if (registering) {
        await registerUser({
          username: cleanUsername,
          password: password,
          role: selectedRole,
          employee_id: employeeId || `EMP-${selectedRole.toUpperCase()}-2026`,
          department: department || (selectedRole === 'admin' ? 'DNCC Central Command' : selectedRole === 'civic' ? 'Public Citizen' : 'DWASA Drainage & Hydrology'),
          assigned_zone: assignedZone || 'Mirpur Zone GPU Station',
          phone_number: phone || '01700000000',
        });
      } else {
        await login(cleanUsername, password, portal);
      }
    } catch (requestError: any) {
      let msg = '';
      if (typeof requestError === 'string') {
        msg = requestError;
      } else if (requestError?.message && typeof requestError.message === 'string' && requestError.message !== '[object Object]') {
        msg = requestError.message;
      } else if (requestError?.detail) {
        msg = typeof requestError.detail === 'string' ? requestError.detail : JSON.stringify(requestError.detail);
      } else if (requestError?.error && typeof requestError.error === 'string') {
        msg = requestError.error;
      } else {
        msg = lang === 'bn' ? 'লগইন বা নিবন্ধন সফল হয়নি। দয়া করে তথ্য পুনরায় যাচাই করুন।' : 'Authentication failed. Please verify credentials.';
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const CurrentIcon = portalCopy[portal].icon;

  return (
    <main className="min-h-screen bg-[#F5F0E6] text-[#263238] grid lg:grid-cols-[1fr_1.1fr]">
      {/* Left Hero Graphic Section with Real Flood-Photo Slideshow */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-[#387667] bg-[#245D4F] p-10 xl:p-12 text-[#FFFDF8]">
        {/* Slideshow Background Images */}
        <div className="absolute inset-0 z-0 bg-[#245D4F] overflow-hidden">
          {SLIDES.map((slide, idx) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={lang === 'bn' ? slide.altBn : slide.altEn}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-in-out ${
                idx === currentSlide ? 'opacity-90 scale-105 filter brightness-100 contrast-105' : 'opacity-0 scale-100'
              }`}
            />
          ))}
          {/* Subtle light-green translucent ambient wash so images remain clearly visible */}
          <div className="absolute inset-0 bg-[#1D5144]/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#163E34]/90 via-[#1C4E42]/40 to-[#1C4E42]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#163E34]/85 via-[#23584B]/40 to-transparent" />
        </div>

        {/* Content Header & Slideshow Meta Bar */}
        <div className="relative z-10">
          <div className="flex items-center justify-between bg-[#163E34]/85 backdrop-blur-md border border-[#3A7E6C]/60 rounded-2xl px-5 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <CivicWaterLogo compact />
              <div>
                <h1 className="text-xl font-black tracking-tight text-[#FFFDF8]">Urban Water-logged AI</h1>
                <p className="text-xs uppercase tracking-[0.22em] text-[#DDD6C8] font-semibold">
                  {lang === 'bn' ? 'ঢাকা সিটি কর্পোরেশন • প্লাবন নিয়ন্ত্রণ ব্যবস্থা' : 'Dhaka Municipal Flood Defense System'}
                </p>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-[#1E4D43]/90 backdrop-blur border border-[#2D6659] rounded-lg p-1 text-xs">
              <button
                type="button"
                onClick={() => setLang('bn')}
                className={`px-2.5 py-1 rounded font-bold transition ${
                  lang === 'bn' ? 'bg-[#B68A35] text-white shadow' : 'text-[#DDD6C8] hover:text-white'
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded font-bold transition ${
                  lang === 'en' ? 'bg-[#B68A35] text-white shadow' : 'text-[#DDD6C8] hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div className="mt-8 max-w-xl bg-[#163E34]/85 backdrop-blur-md border border-[#3A7E6C]/60 rounded-2xl p-6 shadow-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#B68A35]/50 bg-[#B68A35]/25 px-3 py-1 text-xs font-semibold text-[#FFFDF8]">
              <Activity className="h-3.5 w-3.5 text-[#E5B555]" /> Simulation Benchmark &bull; Dhaka Municipal Pilot
            </span>
            <h2 className="mt-3.5 text-2xl xl:text-3xl font-black leading-tight text-[#FFFDF8]">
              {lang === 'bn'
                ? 'এআই সেন্সর সনাক্তকরণ, স্বয়ংক্রিয় পাম্পিং ও পরিচ্ছন্নতা কমান্ড'
                : 'End-to-End AI Sensing, Smart Dewatering & Debris Disposal'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#DDD6C8]">
              {lang === 'bn'
                ? 'ঢাকার ৫০টি প্রধান জলাবদ্ধ পয়েন্টে ডুয়াল আল্ট্রাসনিক সেন্সর ও সিসিটিভি ক্যামেরা দিয়ে পানি ও ময়লা শনাক্তকরণ। আঞ্চলিক বিশ্লেষক সরাসরি পাম্প চালু করেন এবং পানি নিষ্কাশনের পর জমে থাকা বর্জ্য সিটি কর্পোরেশনের মাধ্যমে অপসারণ নিশ্চিত করা হয়।'
                : 'Monitors 50 Dhaka hotspots via IoT dual-ultrasonic sensors and edge CCTV. Regional Analysts verify imagery and actuate high-capacity pumps with local deterministic safety gates. Post-dewatering debris is auto-flagged and dispatched to municipal crews.'}
            </p>
          </div>
        </div>

        {/* Slideshow Controls & Honest Illustrative Label */}
        <div className="relative z-10 space-y-4 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#163E34]/90 backdrop-blur-md border border-[#3A7E6C]/60 text-xs text-[#DDD6C8] shadow-lg">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#E5B555] shrink-0" />
              <span className="font-semibold text-[#FFFDF8]">
                {lang === 'bn' ? SLIDES[currentSlide].locationBn : SLIDES[currentSlide].locationEn}
              </span>
              <span className="text-[10px] text-[#DDD6C8] border-l border-[#3A7E6C]/60 pl-2">
                {lang === 'bn' ? 'ঢাকার বাস্তব লোকেশন ও ড্রেনেজ অববাহিকা' : 'Real Dhaka municipal location & drainage basin'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentSlide ? 'w-5 bg-[#E5B555]' : 'w-1.5 bg-[#3A7E6C] hover:bg-[#DDD6C8]'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className="p-1 rounded text-[#DDD6C8] hover:text-white transition"
                title={isPaused ? 'Play slideshow' : 'Pause slideshow'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)}
                className="p-1 rounded text-[#DDD6C8] hover:text-white transition"
                title="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => (prev + 1) % SLIDES.length)}
                className="p-1 rounded text-[#DDD6C8] hover:text-white transition"
                title="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Feature Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ['১. লাইভ এআই প্রেডিকশন', 'HistGradientBoosting (95.3% acc) বাংলা ও ইংরেজি ব্যাখ্যাসহ'],
              ['২. রিজিওনাল জিপিইউ স্টেশন', 'অ্যানালিস্টের সিসিটিভি যাচাই ও পাম্প অ্যাকচুয়েশন'],
              ['৩. ১২টি সেফটি ইন্টারলক', 'ড্রাই-রান ও পাওয়ার ফল্ট প্রতিরোধক অটোমেটিক গেট'],
              ['৪. পানি নামার পর বর্জ্য অপসারণ', 'সিসিটিভি দ্বারা ময়লা সনাক্তকরণ -> ডিএনসিসি টিম ডিসপ্যাচ'],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-xl border border-[#3A7E6C]/60 bg-[#163E34]/85 p-3 backdrop-blur-md shadow-md">
                <p className="text-xs font-bold text-[#FFFDF8] flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-[#E5B555] shrink-0" /> {title}
                </p>
                <p className="mt-1 text-[11px] text-[#DDD6C8] leading-snug">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right Login / Registration Form Section */}
      <section className="flex flex-col justify-center px-6 py-8 sm:px-12 xl:px-14 overflow-y-auto bg-[#F5F0E6]">
        <div className="w-full max-w-md mx-auto space-y-5 animate-fade-in">
          {/* Mobile Top Header */}
          <div className="flex items-center justify-between lg:hidden mb-1">
            <div className="flex items-center gap-2">
              <CivicWaterLogo compact />
              <div>
                <h1 className="font-bold text-sm text-[#263238]">Urban Water-logged AI</h1>
                <p className="text-[10px] text-[#66706B]">Dhaka Municipal Pilot</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-[#FFFDF8] border border-[#DDD6C8] rounded p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLang('bn')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${lang === 'bn' ? 'bg-[#173D35] text-white' : 'text-[#66706B]'}`}
              >
                বাং
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${lang === 'en' ? 'bg-[#173D35] text-white' : 'text-[#66706B]'}`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Quick Demo 1-Click Login Bar at TOP for instant convenience */}
          <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-3.5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wide text-[#173D35] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#B68A35]" />
                {lang === 'bn' ? '১-ক্লিকে সরাসরি ডেমো প্রবেশ:' : 'Quick 1-Click Demo Login:'}
              </span>
              <span className="text-[10px] text-[#66706B] font-mono">No password required</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemo('civic')}
                className="px-2 py-2 rounded-xl bg-[#173D35] hover:bg-[#1E4D43] text-xs font-bold text-white transition-all text-center shadow-sm hover:scale-105 active:scale-95"
                title="Citizen Public Portal"
              >
                👥 Citizen
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('analyst')}
                className="px-2 py-2 rounded-xl bg-[#5D7A4E] hover:bg-[#4D6640] text-xs font-bold text-white transition-all text-center shadow-sm hover:scale-105 active:scale-95"
                title="Hydrological & Vision Analyst"
              >
                🔬 Analyst
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('operator')}
                className="px-2 py-2 rounded-xl bg-[#B68A35] hover:bg-[#9E7528] text-xs font-bold text-white transition-all text-center shadow-sm hover:scale-105 active:scale-95"
                title="Pump Station Operator"
              >
                ⚙️ Operator
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="px-2 py-2 rounded-xl bg-[#263238] hover:bg-[#37474F] text-xs font-bold text-white transition-all text-center shadow-sm hover:scale-105 active:scale-95"
                title="DNCC Executive Admin"
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          {/* Portal Selector Tabs (only shown on Login mode) */}
          {!registering && (
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-[#DDD6C8] bg-[#DDD6C8]/40 p-1.5">
              {(['civic', 'operations', 'admin'] as AuthPortalName[]).map((item) => {
                const Icon = portalCopy[item].icon;
                const label =
                  item === 'civic'
                    ? lang === 'bn' ? 'নাগরিক' : 'Civic'
                    : item === 'operations'
                    ? lang === 'bn' ? 'অপারেশনস' : 'Operations'
                    : lang === 'bn' ? 'প্রশাসন' : 'Admin';
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => changePortal(item)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                      portal === item
                        ? 'bg-[#173D35] text-white shadow-sm'
                        : 'text-[#263238] hover:bg-[#FFFDF8]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Form Card */}
          <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-6 sm:p-7 shadow-md relative">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex rounded-xl bg-[#173D35]/10 p-2 text-[#173D35]">
                <CurrentIcon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-semibold text-[#66706B] uppercase tracking-wider">
                {registering ? (lang === 'bn' ? 'নতুন অ্যাকাউন্ট নিবন্ধন' : 'Simple Registration') : (lang === 'bn' ? 'নিরাপদ লগইন' : 'Secure Login')}
              </span>
            </div>

            <h2 className="text-xl font-bold text-[#263238]">
              {registering
                ? lang === 'bn'
                  ? 'সহজ অ্যাকাউন্ট নিবন্ধন'
                  : 'Easy Account Registration'
                : lang === 'bn'
                ? portalCopy[portal].titleBn
                : portalCopy[portal].title}
            </h2>
            <p className="mt-1 text-xs text-[#66706B]">
              {registering
                ? lang === 'bn'
                  ? 'শুধু নাম ও পাসওয়ার্ড দিয়ে যে কোনো রোলে অ্যাকাউন্ট তৈরি করুন।'
                  : 'Enter your name, password and select your role to get started.'
                : lang === 'bn'
                ? portalCopy[portal].subtitleBn
                : portalCopy[portal].subtitle}
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {/* Role Selection (WHEN REGISTERING) */}
              {registering && (
                <div>
                  <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#173D35]">
                    {lang === 'bn' ? 'আপনার ভূমিকা নির্বাচন করুন (Select Role)' : 'Select Your Role'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['civic', 'analyst', 'operator', 'admin'] as UserRole[]).map((r) => {
                      const item = roleInfo[r];
                      const Icon = item.icon;
                      const isSelected = selectedRole === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSelectedRole(r)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-[#173D35] bg-[#173D35]/10 shadow-sm ring-1 ring-[#173D35]'
                              : 'border-[#DDD6C8] bg-white hover:border-[#173D35]/60 text-[#263238]'
                          }`}
                        >
                          <span className={`p-1.5 rounded-lg bg-[#173D35] text-white shrink-0 mt-0.5`}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#263238] truncate">
                              {lang === 'bn' ? item.labelBn : item.label}
                            </p>
                            <p className="text-[10px] text-[#66706B] truncate">
                              {lang === 'bn' ? item.descBn : item.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Username Input */}
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#263238]">
                  {lang === 'bn' ? 'ব্যবহারকারীর নাম / পূর্ণ নাম (Username / Name)' : 'Username / Name'}
                </span>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-[#66706B]" />
                  <input
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-[#DDD6C8] bg-white py-2.5 pl-9 pr-3 text-xs text-[#263238] placeholder-[#66706B] outline-none focus:border-[#173D35] focus:ring-1 focus:ring-[#173D35] transition"
                    placeholder={
                      registering
                        ? (lang === 'bn' ? 'যেমন: Fahim Sadik বা fahim' : 'e.g. Fahim Sadik or fahim')
                        : (lang === 'bn' ? 'ব্যবহারকারীর নাম লিখুন' : 'Enter username')
                    }
                    required
                  />
                </div>
              </label>

              {/* Password Input */}
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#263238]">
                  {lang === 'bn' ? 'পাসওয়ার্ড (Password)' : 'Password'}
                </span>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-[#66706B]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={registering ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#DDD6C8] bg-white py-2.5 pl-9 pr-10 text-xs text-[#263238] placeholder-[#66706B] outline-none focus:border-[#173D35] focus:ring-1 focus:ring-[#173D35] transition"
                    placeholder={
                      registering
                        ? (lang === 'bn' ? 'পাসওয়ার্ড দিন (যেমন: 12345678)' : 'Enter password (e.g. 12345678)')
                        : (lang === 'bn' ? 'পাসওয়ার্ড প্রবেশ করান' : 'Enter password')
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-[#66706B] hover:text-[#263238]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {/* OPTIONAL EXTRA DETAILS TOGGLE (ONLY IN REGISTRATION) */}
              {registering && (
                <div className="border border-[#DDD6C8] rounded-xl bg-[#F5F0E6]/50 p-3 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowExtraDetails(!showExtraDetails)}
                    className="w-full flex items-center justify-between text-left text-xs font-medium text-[#66706B] hover:text-[#173D35] transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-[#173D35]" />
                      {lang === 'bn' ? 'অতিরিক্ত বিবরণ (ঐচ্ছিক / Optional)' : 'Additional Details (Optional)'}
                    </span>
                    {showExtraDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showExtraDetails && (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-[10px] text-[#66706B]">
                            {lang === 'bn' ? 'ফোন নম্বর' : 'Phone'}
                          </span>
                          <div className="relative">
                            <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#66706B]" />
                            <input
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full rounded-lg border border-[#DDD6C8] bg-white py-2 pl-8 pr-2 text-xs text-[#263238] outline-none focus:border-[#173D35]"
                              placeholder="01726682245"
                            />
                          </div>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] text-[#66706B]">
                            {lang === 'bn' ? 'এমপ্লয়ী আইডি' : 'Employee ID'}
                          </span>
                          <input
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full rounded-lg border border-[#DDD6C8] bg-white py-2 px-2.5 text-xs text-[#263238] outline-none focus:border-[#173D35]"
                            placeholder="DWASA-ANL-2026"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-[10px] text-[#66706B]">
                            {lang === 'bn' ? 'বিভাগ' : 'Department'}
                          </span>
                          <input
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full rounded-lg border border-[#DDD6C8] bg-white py-2 px-2.5 text-xs text-[#263238] outline-none focus:border-[#173D35]"
                            placeholder="DWASA Drainage"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] text-[#66706B]">
                            {lang === 'bn' ? 'জোন' : 'Assigned Zone'}
                          </span>
                          <div className="relative">
                            <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#66706B]" />
                            <input
                              value={assignedZone}
                              onChange={(e) => setAssignedZone(e.target.value)}
                              className="w-full rounded-lg border border-[#DDD6C8] bg-white py-2 pl-8 pr-2 text-xs text-[#263238] outline-none focus:border-[#173D35]"
                              placeholder="Mirpur zone"
                            />
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message Box */}
              {error && (
                <div role="alert" className="rounded-xl border border-[#B85042]/40 bg-[#B85042]/10 px-3.5 py-2.5 text-xs text-[#B85042] shadow-sm">
                  <p className="font-semibold">{lang === 'bn' ? '⚠️ ত্রুটি ঘটেছে:' : '⚠️ Error:'}</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173D35] hover:bg-[#1E4D43] px-4 py-3 text-xs font-bold text-[#FFFDF8] shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {registering
                  ? (lang === 'bn' ? 'নিবন্ধন সম্পন্ন করে প্রবেশ করুন' : 'Complete Registration & Enter')
                  : (lang === 'bn' ? 'নিরাপদে প্রবেশ করুন' : 'Sign in Securely')}
              </button>
            </form>

            {/* Toggle Between Login and Registration */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setRegistering(!registering);
                  setError(null);
                }}
                className="text-xs font-semibold text-[#173D35] hover:underline transition"
              >
                {registering
                  ? (lang === 'bn' ? '← ইতোমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : '← Already have an account? Sign in')
                  : (lang === 'bn' ? '+ নতুন অ্যাকাউন্ট খুলতে চান? সহজ নিবন্ধন করুন' : '+ Need an account? Easy Registration')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

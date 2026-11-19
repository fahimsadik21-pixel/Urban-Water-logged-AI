import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowRight, Waves } from 'lucide-react';

interface OverviewHeroViewProps {
  onNavigateToOperations: () => void;
  onNavigateToCitizen: () => void;
}

export function OverviewHeroView({ onNavigateToOperations, onNavigateToCitizen }: OverviewHeroViewProps) {
  const { lang, t } = useLanguage();
  const [activeCardTab, setActiveCardTab] = useState<'detection' | 'ai' | 'safety' | 'debris'>('detection');

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-black text-white relative">
      {/* 1. Hero Content Area */}
      <section className="relative pt-12 pb-8 px-4 sm:px-8 max-w-5xl mx-auto w-full text-center z-10">
        {/* Pilot Simulation Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-semibold text-cyan-300 backdrop-blur mb-6 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          {t('hero.badge')}
        </div>

        {/* Two-Line Display Headline */}
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-normal leading-[1.12] tracking-[-0.045em] text-white max-w-4xl mx-auto"
          style={{ whiteSpace: 'pre-line' }}
        >
          {t('hero.h1.line1') + '\n' + t('hero.h1.line2')}
        </h1>

        {/* Subcopy */}
        <p className="mt-5 text-sm sm:text-base md:text-[16px] text-slate-300 max-w-2xl mx-auto leading-[1.5] tracking-[-0.025em]">
          {t('hero.sub.line1')} <br className="hidden sm:inline" />
          <span className="text-cyan-300 font-medium">{t('hero.sub.line2')}</span>
        </p>

        {/* Hero CTA Button */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onNavigateToOperations}
            className="px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-slate-200 transition shadow-lg flex items-center gap-2 cursor-pointer"
          >
            {t('hero.cta.start')}
            <ArrowRight className="w-4 h-4 text-cyan-600" />
          </button>
          <button
            onClick={onNavigateToCitizen}
            className="px-5 py-3 rounded-full border border-slate-800 bg-slate-900/80 text-slate-300 font-medium text-sm hover:text-white hover:border-slate-700 transition"
          >
            {t('hero.cta.download')}
          </button>
        </div>
      </section>

      {/* 2. Full-Bleed Cyan Video Band with Mockup Card */}
      <section className="relative w-full min-h-[460px] md:min-h-[500px] mt-6 flex flex-col justify-end overflow-hidden">
        {/* The required Video Band */}
        <div className="absolute inset-0 bg-[#0db5ed] z-0 overflow-hidden">
          <video
            className="w-full h-full object-cover object-top opacity-90"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_125119_4963ddd4-c287-4044-b014-b68943cdd8bd.mp4"
            poster="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_125039_45a71f04-36dd-4620-99d8-7526316d439e.png"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none" />
        </div>

        {/* Fixed-Geometry Card Sitting On The Band */}
        <div className="relative z-10 max-w-[548px] w-[92%] mx-auto mb-8 bg-[#f2f2f2] text-slate-950 rounded-2xl shadow-2xl border border-white/60 p-5 sm:p-6 transition transform hover:-translate-y-1">
          {/* Eyebrow */}
          <div className="text-[12px] font-light tracking-tight text-slate-600 uppercase">
            {t('card.eyebrow')}
          </div>

          {/* Card Title */}
          <h3 className="mt-1 text-lg sm:text-xl font-medium tracking-tight text-slate-900">
            {t('card.title')}
          </h3>

          {/* Meta row: Avatars + Clock + Info */}
          <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500">
            {/* 3 Overlapping Avatars */}
            <div className="flex -space-x-2">
              <span className="w-6 h-6 rounded-full bg-amber-700 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">H</span>
              <span className="w-6 h-6 rounded-full bg-cyan-700 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">A</span>
              <span className="w-6 h-6 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">O</span>
            </div>

            {/* Clock SVG */}
            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="7" fill="#d9d9d9" />
              <path d="M7 3.6V7.2l2.3 1.4" stroke="#f2f2f2" strokeWidth="1.3" strokeLinecap="round" />
            </svg>

            {/* Meta Text */}
            <span className="font-light truncate">
              {t('card.meta.time')} &bull; <strong className="text-slate-700">{t('card.meta.depth')}</strong> &bull; <span className="text-rose-600 font-semibold">{t('card.meta.severity')}</span>
            </span>
          </div>

          {/* Card Tabs */}
          <div className="mt-4 flex items-center gap-2 border-b border-slate-200">
            {[
              { id: 'detection', label: t('card.tab.detection') },
              { id: 'ai', label: t('card.tab.ai') },
              { id: 'safety', label: t('card.tab.safety') },
              { id: 'debris', label: t('card.tab.debris') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCardTab(tab.id as any)}
                className={`pb-2 text-xs font-medium transition relative cursor-pointer ${
                  activeCardTab === tab.id
                    ? 'text-slate-900 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                {activeCardTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#38c6ec] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Card Panel */}
          <div className="mt-3 bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm space-y-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('card.panel.heading')}
            </div>

            {/* Row 1 */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="w-4 h-4 rounded-full bg-[#2a9a30] text-white flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-2.5 h-2.5" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 leading-snug">
                  {activeCardTab === 'detection' && t('card.row1.title')}
                  {activeCardTab === 'ai' && (lang === 'bn' ? 'মডেল কনফিডেন্স: ৮২% নিশ্চিত (বৃষ্টিপাত ও উচ্চতা সমন্বিত)' : 'Model Confidence: 82% corroborated with rainfall & terrain')}
                  {activeCardTab === 'safety' && (lang === 'bn' ? 'ড্রেনেজ ধারণক্ষমতা: ৬৮% স্বাভাবিক (পাম্পিংয়ের উপযোগী)' : 'Drainage Capacity: 68% available (suitable for discharge)')}
                  {activeCardTab === 'debris' && (lang === 'bn' ? 'বর্জ্য পর্যবেক্ষণ: ড্রেন জালে কঠিন প্লাস্টিক ও ডালপালা জমেছে' : 'Debris Observation: Solid plastic & branches blocking inlet')}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {t('card.row1.owner')}
                </p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="w-4 h-4 rounded-full bg-[#f6a825] text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                !
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 leading-snug">
                  {activeCardTab === 'detection' && t('card.row2.title')}
                  {activeCardTab === 'ai' && (lang === 'bn' ? 'XAI ব্যাখ্যা: পানির গভীরতা ৪২% প্রভাব, বৃষ্টিপাত ২৬% প্রভাব' : 'XAI Explanation: Depth 42% impact, Rainfall 26% impact')}
                  {activeCardTab === 'safety' && (lang === 'bn' ? 'স্বয়ংক্রিয় সুরক্ষা: মোটর তাপমাত্রা ৪২°C (সীমা ≤ ৮৫°C)' : 'Safety Gate: Motor temp 42°C (limit ≤ 85°C)')}
                  {activeCardTab === 'debris' && (lang === 'bn' ? 'অ্যাকশন: পানি নামার সাথে সাথে ডিএনসিসি টিম ডিসপ্যাচ অ্যালার্ট' : 'Action: Auto-flagged for DNCC clean-up dispatch post-drain')}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {t('card.row2.owner')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bottom Pilot Highlights Grid */}
      <section className="py-10 px-4 sm:px-8 max-w-5xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-4 text-left border-t border-slate-900">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur">
          <p className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
            <Waves className="w-4 h-4" />
            {lang === 'bn' ? '৫০টি ঢাকা হটস্পট' : '50 Dhaka Hotspots'}
          </p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            {lang === 'bn'
              ? 'মিরপুর, কাজীপাড়া, শেওড়াপাড়া, গ্রিন রোড ও শান্তিনগরসহ প্রধান পয়েন্টগুলোর লাইভ ডুয়াল সেন্সর ও সিসিটিভি সংযোগ।'
              : 'Continuous monitoring across Mirpur, Kazipara, Shewrapara, Green Road, and Shantinagar.'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur">
          <p className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            {lang === 'bn' ? '৮টি সেফটি ইন্টারলক' : '8 Safety Interlocks'}
          </p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            {lang === 'bn'
              ? 'কোনো এআই সরাসরি পাম্প চালায় না; স্থানীয় ডিটারমিনিস্টিক সেফটি গেট ড্রাই-রান ও পাওয়ার সার্জ প্রতিরোধ করে।'
              : 'Deterministic hardware gates prevent dry-run, power surges, and destination drain flooding.'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur">
          <p className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            {lang === 'bn' ? 'পানি নামার পর বর্জ্য অপসারণ' : 'Post-Drain Debris Dispatch'}
          </p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            {lang === 'bn'
              ? 'পানি নেমে যাওয়ার পর রাস্তায় আটকে থাকা ময়লা সিসিটিভি সনাক্ত করে এবং ডিএনসিসি ক্লিনিং টিম পাঠায়।'
              : 'CCTV flags street debris once water recedes, dispatching DNCC conservancy crews to unblock drains.'}
          </p>
        </div>
      </section>
    </div>
  );
}

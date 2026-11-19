import type { SVGProps } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface CivicWaterLogoProps extends SVGProps<SVGSVGElement> {
  compact?: boolean;
  showText?: boolean;
  lightHeader?: boolean;
}

/**
 * Professional Code-Native Municipal Civic-Tech Identity:
 * Combines water droplet resilience, Dhaka urban infrastructure (bridge & sluice arch),
 * gravity drainage channels, and subtle edge AI network nodes.
 *
 * Restrained, dignified animation respects prefers-reduced-motion.
 * Never claims official government endorsement.
 */
export function CivicWaterLogo({
  compact = false,
  showText = false,
  lightHeader = false,
  className = '',
  ...props
}: CivicWaterLogoProps) {
  const { lang } = useLanguage();
  const bn = lang === 'bn';

  const sizeClass = compact ? 'h-8 w-8' : 'h-10 w-10';

  const emblem = (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={bn ? 'ঢাকা নগর প্লাবন এআই লোগো' : 'Urban Water-logged AI Emblem'}
      className={`shrink-0 ${sizeClass} ${className}`}
      {...props}
    >
      <defs>
        {/* Warm Bangladesh Municipal Forest Green Gradient */}
        <linearGradient id="dhaka-civic-gradient" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E4D43" />
          <stop offset="60%" stopColor="#173D35" />
          <stop offset="100%" stopColor="#0F2923" />
        </linearGradient>

        {/* Drainage Flow & River Surge Wave Gradient */}
        <linearGradient id="drainage-flow" x1="18" y1="36" x2="46" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5D7A4E" />
          <stop offset="50%" stopColor="#8DAF77" />
          <stop offset="100%" stopColor="#B68A35" />
        </linearGradient>

        {/* Inner Shield Shadow */}
        <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#173D35" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Ripple background ring */}
      <circle cx="32" cy="38" r="23" fill="none" stroke="#5D7A4E" strokeWidth="1" strokeOpacity="0.3" className="animate-water-ripple" />

      {/* 1. Outer Hydro-Shield Droplet Geometry (Water Defense Emblem) */}
      <path
        d="M32 4C22.5 16 10 26.5 10 39.5C10 51.5 19.8 60 32 60C44.2 60 54 51.5 54 39.5C54 26.5 41.5 16 32 4Z"
        fill="url(#dhaka-civic-gradient)"
        stroke="#DDD6C8"
        strokeWidth="1.2"
        filter="url(#soft-glow)"
      />

      {/* 2. Dhaka Urban Infrastructure & Sluice Gate Arch (Hatirjheel / Panthapath Culvert reference) */}
      <path
        d="M20 38V31C20 25.5 24.5 21 30 21H34C39.5 21 44 25.5 44 31V38"
        stroke="#FFFDF8"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Central Sluice Pillars & Flood Barrier Crest */}
      <path
        d="M27 38V28.5M37 38V28.5"
        stroke="#DDD6C8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* 4. Managed Drainage Flow Channels (Dual Gravity Discharge Waves) */}
      <path
        d="M17 44C22 41 27 41 32 44C37 47 42 47 47 44"
        stroke="url(#drainage-flow)"
        strokeWidth="2.8"
        strokeLinecap="round"
        className="motion-safe:animate-[pulse_3s_ease-in-out_infinite] motion-reduce:animate-none"
      />
      <path
        d="M20 51C24 49 28 49 32 51C36 53 40 53 44 51"
        stroke="#B68A35"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />

      {/* 5. Subtle Edge AI Network Nodes (Corroborated Telemetry Triangle) */}
      <circle cx="32" cy="14" r="2.2" fill="#B68A35" />
      <circle cx="23" cy="20" r="1.8" fill="#FFFDF8" />
      <circle cx="41" cy="20" r="1.8" fill="#FFFDF8" />
      <line x1="23" y1="20" x2="32" y2="14" stroke="#B68A35" strokeWidth="1.2" strokeOpacity="0.85" />
      <line x1="41" y1="20" x2="32" y2="14" stroke="#B68A35" strokeWidth="1.2" strokeOpacity="0.85" />
    </svg>
  );

  if (!showText) {
    return emblem;
  }

  const primaryTextColor = lightHeader ? 'text-[#263238]' : 'text-[#FFFDF8]';
  const secondaryTextColor = lightHeader ? 'text-[#66706B]' : 'text-[#DDD6C8]';

  return (
    <div className="flex items-center gap-3 select-none">
      {emblem}
      <div className="flex flex-col">
        <span className={`text-sm sm:text-base font-extrabold tracking-tight ${primaryTextColor}`}>
          {bn ? 'ঢাকা নগর প্লাবন এআই' : 'Urban Water-logged AI'}
        </span>
        <span className={`text-[10px] sm:text-[11px] font-semibold tracking-wide ${secondaryTextColor}`}>
          {bn ? 'ঢাকা সিটি কর্পোরেশন • স্মার্ট প্লাবন নিয়ন্ত্রণ' : 'Dhaka Municipal Waterlogging Response'}
        </span>
      </div>
    </div>
  );
}

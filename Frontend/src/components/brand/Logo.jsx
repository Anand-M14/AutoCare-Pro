import { useId } from "react";
import { brand } from "../../config/brand";
import "./Logo.css";

/**
 * AutoCare Pro mark: a wheel (rim + hub) wrapped by a speed arc, with the letter "A"
 * built from two strokes whose crossbar is a wrench/handlebar. Palette only: cream, grey, burgundy.
 */
export function LogoMark({ size = 44, title = brand.name }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg className="ac-mark" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title}>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7a1210" />
          <stop offset="1" stopColor="#3a0504" />
        </linearGradient>
        <linearGradient id={`${uid}-ring`} x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F3E4CC" />
          <stop offset="0.55" stopColor="#E8D2B5" />
          <stop offset="1" stopColor="#A5A79B" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#590907" />
      
      {/* speed arc */}
      <path d="M11 41a21 21 0 0 1 42 0" fill="none" stroke={`url(#${uid}-ring)`} strokeWidth="3.2" strokeLinecap="round" strokeDasharray="1 5.2" />
      {/* "A" */}
      <path d="M20 47 32 15l12 32" fill="none" stroke={`url(#${uid}-ring)`} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* crossbar / hub */}
      <circle cx="32" cy="38" r="5.4" fill="#2a0403" stroke={`url(#${uid}-ring)`} strokeWidth="2.6" />
      <circle cx="32" cy="38" r="1.7" fill="#E8D2B5" />
      <path d="M26.6 38h-3.2M40.6 38h-3.2" stroke="#E8D2B5" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ size = 44, compact = false, stacked = false, tagline = true }) {
  return (
    <span className={`ac-logo${stacked ? " is-stacked" : ""}`}>
      <LogoMark size={size} />
      {!compact && (
        <span className="ac-logo-text">
          <span className="ac-logo-name">
            {brand.nameUpper}
            <b>{brand.suffix}</b>
          </span>
          {tagline && <span className="ac-logo-tag">{brand.tagline}</span>}
        </span>
      )}
    </span>
  );
}

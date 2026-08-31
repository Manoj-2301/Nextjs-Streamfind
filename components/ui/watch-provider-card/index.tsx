'use client';

import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Platform } from '@/types';
import React, { useState, useEffect } from 'react';
import { getAffiliateLinks, resolveWatchUrl, AffiliateLinks } from '@/services/affiliateService';
import Image from 'next/image';

interface WatchProviderCardProps {
  platform: Platform;
  key?: React.Key;
}

const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  SG: 'Singapore',
  PH: 'Philippines',
  HK: 'Hong Kong',
  MY: 'Malaysia',
  ID: 'Indonesia',
  TH: 'Thailand',
  AU: 'Australia',
  NZ: 'New Zealand',
  VN: 'Vietnam',
  JP: 'Japan',
  KR: 'South Korea'
};

const getCountryFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '';
  }
};

const localizeTmdbUrl = (url: string, countryCode: string): string => {
  if (!url || !url.includes('themoviedb.org')) return url;
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set('locale', countryCode);
    return parsedUrl.toString();
  } catch (e) {
    return url;
  }
};

export default function WatchProviderCard({ platform }: WatchProviderCardProps) {
  const isPartner = platform.isSponsored || (platform as any).isPartner;
  const [userCountryCode, setUserCountryCode] = useState<string>('IN');
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLinks>({});

  useEffect(() => {
    getAffiliateLinks()
      .then(links => {
        setAffiliateLinks(links);
      })
      .catch(err => console.error('Error loading affiliate links in card:', err));

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      let detectedCode = '';

      if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('Asia/Kolkata') || tz.includes('Asia/Calcutta')) {
        detectedCode = 'IN';
      } else if (tz.includes('London')) {
        detectedCode = 'GB';
      } else if (tz.includes('Singapore')) {
        detectedCode = 'SG';
      } else if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal')) {
        detectedCode = 'CA';
      } else if (tz.includes('America/')) {
        detectedCode = 'US';
      } else if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Australia')) {
        detectedCode = 'AU';
      } else if (tz.includes('Auckland')) {
        detectedCode = 'NZ';
      } else if (tz.includes('Tokyo')) {
        detectedCode = 'JP';
      } else if (tz.includes('Seoul')) {
        detectedCode = 'KR';
      } else if (tz.includes('Hong_Kong')) {
        detectedCode = 'HK';
      } else if (tz.includes('Manila')) {
        detectedCode = 'PH';
      }

      if (!detectedCode) {
        const lang = navigator.language || '';
        if (lang.includes('-IN')) detectedCode = 'IN';
        else if (lang.includes('-US')) detectedCode = 'US';
        else if (lang.includes('-GB')) detectedCode = 'GB';
        else if (lang.includes('-SG')) detectedCode = 'SG';
        else if (lang.includes('-CA')) detectedCode = 'CA';
        else if (lang.includes('-AU')) detectedCode = 'AU';
      }

      if (detectedCode) {
        setUserCountryCode(detectedCode);
      }
    } catch (e) {
      console.error('Error detecting country locally:', e);
    }

    // Server-side IP-based GeoIP lookup to override local detection with absolute accuracy
    fetch('/api/country')
      .then(res => res.json())
      .then(data => {
        if (data && data.country) {
          setUserCountryCode(data.country.toUpperCase());
        }
      })
      .catch(err => console.error('Error fetching country from API:', err));
  }, []);

  const isAvailableInIndia = platform.countries?.includes('IN');
  const userCountryAvailable = platform.countries?.includes(userCountryCode);
  const rawWatchUrl = platform.watchUrls?.[userCountryCode] || platform.watchUrls?.['IN'] || platform.watchUrl;
  const standardWatchUrl = localizeTmdbUrl(rawWatchUrl, userCountryCode);
  const watchUrl = resolveWatchUrl(platform.name, standardWatchUrl, affiliateLinks);

  return (
    <div
      className={`relative p-6 rounded-2xl flex flex-col items-center gap-4 transition-all hover:scale-[1.02] duration-300 group overflow-hidden ${
        isPartner 
          ? 'bg-brand/10 border border-brand/30 shadow-[0_0_25px_rgba(229,9,20,0.15)] hover:border-brand/60' 
          : isAvailableInIndia
            ? 'bg-amber-500/5 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)] hover:border-amber-500/50'
            : 'glass border-white/5 hover:border-brand/40'
      }`}
    >
      {/* Beautiful Region Badges */}
      <div className="absolute top-2.5 right-2.5 flex flex-row flex-wrap justify-end gap-1.5 w-[70%] z-10">
        {platform.countries?.map(code => (
          <div 
            key={code}
            title={`Available in ${COUNTRY_NAMES[code] || code}`}
            className="group/badge relative flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-2 py-1 shadow-lg hover:bg-white/10 hover:border-white/30 transition-all duration-300 cursor-help"
          >
            <span className="text-xs leading-none drop-shadow-md">{getCountryFlagEmoji(code)}</span>
            <span className="max-w-0 overflow-hidden group-hover/badge:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap opacity-0 group-hover/badge:opacity-100 text-[9px] font-black tracking-wider text-white ml-0 group-hover/badge:ml-1.5">
              {code}
            </span>
          </div>
        ))}
      </div>

      {isPartner && (
        <span className="absolute top-3 left-3 bg-brand text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-brand/20 animate-pulse">
          <ShieldCheck className="w-2.5 h-2.5" /> Partner
        </span>
      )}

      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-110 transition-transform p-4 mt-2">
        <Image 
          src={platform.logo} 
          alt={platform.name} 
          width={80}
          height={80}
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
          unoptimized={true}
        />
      </div>
      
      <div className="text-center w-full">
        <h4 className="text-white font-bold text-lg">{platform.name}</h4>
        <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] mt-1">Available in HD/4K</p>
      </div>

      <a 
        href={watchUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`w-full py-2.5 rounded-lg font-black text-[11px] tracking-widest flex items-center justify-center gap-2 transition-all uppercase ${
          isPartner
            ? 'bg-brand text-white hover:bg-red-700 shadow-[0_0_15px_rgba(229,9,20,0.3)]'
            : isAvailableInIndia
              ? 'bg-amber-500 text-black hover:bg-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.2)] font-black'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
        }`}
      >
        Watch Now <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

import React from 'react';
import { PremiumBadges, BadgeUltra, Badge4K, BadgeHDR } from '@/components/Badges';

export default function BadgesDemoPage() {
  return (
    <div className="min-h-screen bg-black text-white p-10 flex flex-col items-center justify-center font-sans">
      <div className="max-w-2xl w-full space-y-12 bg-gray-900/50 p-10 rounded-2xl border border-gray-800">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            Premium Features Demo
          </h1>
          <p className="text-gray-400">Hover over the badges to see the metallic shine effect.</p>
        </div>

        {/* Example Profile Card 1 */}
        <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-yellow-600 p-[2px]">
              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                 <span className="text-2xl">😎</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold">Manoj (Solo Dev)</h2>
                <PremiumBadges />
              </div>
              <p className="text-sm text-gray-400">Owner & Ultimate Ultra Member</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-white text-black text-sm font-semibold rounded hover:bg-gray-200 transition-colors">
            Follow
          </button>
        </div>

        {/* Individual Badges Showcase */}
        <div className="pt-8 border-t border-gray-800">
          <h3 className="text-sm font-semibold text-gray-500 mb-6 uppercase tracking-widest">Individual Badges</h3>
          <div className="flex flex-wrap gap-6 justify-center items-center p-6 bg-gray-950/50 rounded-lg border border-gray-800/50">
            <div className="flex flex-col items-center gap-3">
               <BadgeUltra />
               <span className="text-xs text-gray-500">Tier Indicator</span>
            </div>
            <div className="w-px h-10 bg-gray-800"></div>
            <div className="flex flex-col items-center gap-3">
               <Badge4K />
               <span className="text-xs text-gray-500">Feature Indicator</span>
            </div>
            <div className="w-px h-10 bg-gray-800"></div>
            <div className="flex flex-col items-center gap-3">
               <BadgeHDR />
               <span className="text-xs text-gray-500">Feature Indicator</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

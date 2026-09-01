/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import { motion } from 'motion/react';
import { Globe, Users, Award, Shield } from 'lucide-react';


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function AboutUs() {

  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <span className="text-brand font-black tracking-widest text-[10px] uppercase bg-brand/10 px-3 py-1 rounded-full mb-6 inline-block">
            Our Story
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-8 italic uppercase">
            The Quest for the <br /> <span className="text-brand">Perfect Stream</span>
          </h1>
          <p className="text-white/40 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
            We built StreamFind for the cinephiles, the binge-watchers, and the late-night searchers. 
            No more jumping between 10 apps just to see where that one indie movie is hidden.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
          {[
            {
              icon: Globe,
              title: "Global Reach",
              desc: "Aggregating data from over 50+ streaming platforms worldwide to give you total visibility."
            },
            {
              icon: Users,
              title: "Community First",
              desc: "Built by fans, for fans. We prioritize user experience and lightning-fast discovery."
            },
            {
              icon: Shield,
              title: "Data Integrity",
              desc: "Real-time updates ensure you never click on 'Expired' or 'Unavailable' content again."
            },
            {
              icon: Award,
              title: "AI Powered",
              desc: "Leveraging cutting-edge models to predict where the next cinematic masterpiece will land."
            }
          ].map((item, index) => (
            <motion.div 
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-8 rounded-3xl bg-surface/30 border border-white/5 hover:border-brand/20 transition-all group"
            >
              <item.icon className="w-10 h-10 text-brand mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-3 uppercase tracking-tight">{item.title}</h3>
              <p className="text-white/40 leading-relaxed text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="bg-brand/5 border border-brand/20 rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand/10 to-transparent opacity-50"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-8 uppercase italic">Join the evolution of cinema discovery.</h2>
            <p className="text-white/60 mb-10 max-w-xl mx-auto">
              We&apos;re just getting started. Join our thousands of users who have found their next favorite movie through StreamFind.
            </p>
            <button className="bg-white text-black px-8 py-3 rounded-full font-black text-xs tracking-widest uppercase hover:bg-brand transition-all hover:scale-105">
              Explore Now
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { AlertCircle, Cpu, Trophy, Zap, Award, Globe, History, Plus, Trash2, Edit2, X, Save, Coffee, Clock } from 'lucide-react';
import { doc, onSnapshot, updateDoc, getFirestore, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function SystemView() {
  const [maintenance, setMaintenance] = useState(false);
  const [flags, setFlags] = useState({ share: true, analytics: true, realTime: false });
  const [achievements, setAchievements] = useState<{ id: string; label: string; val: string; icon: string }[]>([]);
  const [customIcons, setCustomIcons] = useState<{ id: string; name: string; url: string }[]>([]);
  
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingAch, setEditingAch] = useState<{ id?: string; label: string; val: string; icon: string } | null>(null);

  const iconInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const db = getFirestore(app);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'system', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.maintenanceMode !== undefined) setMaintenance(data.maintenanceMode);
        if (data.flags) setFlags(data.flags);
        if (data.achievements) setAchievements(data.achievements);
        if (data.customIcons) setCustomIcons(data.customIcons);
      } else {
        // Initialize default if doesn't exist
        setDoc(doc(db, 'system', 'config'), {
          maintenanceMode: false,
          flags: { share: true, analytics: true, realTime: false },
          achievements: [
            { id: '1', label: "Early Bird Req.", val: "5 Movies", icon: 'Trophy' },
            { id: '2', label: "Streak Multiplier", val: "1.5x", icon: 'Zap' },
            { id: '3', label: "Elite Frame Unlock", val: "Lvl 50", icon: 'Award' }
          ],
          customIcons: []
        });
      }
    });
    return () => unsubscribe();
  }, [db]);

  const toggleMaintenance = async () => {
    try {
      await updateDoc(doc(db, 'system', 'config'), { maintenanceMode: !maintenance });
      toast.success(`Maintenance mode ${!maintenance ? 'Enabled' : 'Disabled'}`, { duration: 2000 });
    } catch (e) {
      toast.error('Failed to toggle maintenance mode', { duration: 2000 });
    }
  };

  const toggleFlag = async (flagId: keyof typeof flags) => {
    try {
      const newFlags = { ...flags, [flagId]: !flags[flagId] };
      await updateDoc(doc(db, 'system', 'config'), { flags: newFlags });
      toast.success(`${flagId} ${newFlags[flagId] ? 'enabled' : 'disabled'}`, { duration: 2000 });
    } catch (e) {
      toast.error('Failed to toggle flag', { duration: 2000 });
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image too large (Max 2MB)"); return; }
    
    setIsUploadingIcon(true);
    try {
      const formData = new FormData(); formData.append('image', file);
      const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
      if (!IMGBB_API_KEY) throw new Error("Missing API Key");
      
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      
      const newIcon = { id: Date.now().toString(), name: "New Icon", url: data.data.url };
      const newIcons = [...customIcons, newIcon];
      await updateDoc(doc(db, 'system', 'config'), { customIcons: newIcons });

      if (editingAch) {
        setEditingAch({ ...editingAch, icon: newIcon.url });
      }

      toast.success("Icon uploaded!", { duration: 2000 });
    } catch (err: any) {
      toast.error("Upload failed: " + err.message, { duration: 2000 });
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const renameCustomIcon = async (id: string, currentName: string) => {
    const newName = window.prompt("Rename custom icon:", currentName);
    if (!newName || newName === currentName) return;
    const newIcons = customIcons.map(icon => icon.id === id ? { ...icon, name: newName } : icon);
    await updateDoc(doc(db, 'system', 'config'), { customIcons: newIcons });
  };

  const deleteCustomIcon = async (id: string) => {
    if (!window.confirm("Delete this custom icon?")) return;
    const newIcons = customIcons.filter(icon => icon.id !== id);
    await updateDoc(doc(db, 'system', 'config'), { customIcons: newIcons });
  };

  const saveAchievement = async () => {
    if (!editingAch || !editingAch.label || !editingAch.val) return;
    try {
      let newArray = [...achievements];
      if (editingAch.id) {
        newArray = newArray.map(a => a.id === editingAch.id ? editingAch as any : a);
      } else {
        newArray.push({ ...editingAch, id: Date.now().toString() } as any);
      }
      await updateDoc(doc(db, 'system', 'config'), { achievements: newArray });
      setEditingAch(null);
      toast.success('Achievement saved!', { duration: 2000 });
    } catch (e) {
      toast.error('Failed to save achievement', { duration: 2000 });
    }
  };

  const deleteAchievement = async (id: string) => {
    try {
      const newArray = achievements.filter(a => a.id !== id);
      await updateDoc(doc(db, 'system', 'config'), { achievements: newArray });
      toast.success('Achievement deleted!', { duration: 2000 });
    } catch (e) {
      toast.error('Failed to delete achievement', { duration: 2000 });
    }
  };

  const getIcon = (name: string) => {
    if (name.startsWith('http')) {
      return <Image src={name} alt="Icon" width={16} height={16} className="w-4 h-4 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />;
    }
    switch(name) {
      case 'Zap': return <Zap className="w-4 h-4 text-white/20 group-hover:text-brand transition-colors" />;
      case 'Award': return <Award className="w-4 h-4 text-white/20 group-hover:text-brand transition-colors" />;
      case 'Coffee': return <Coffee className="w-4 h-4 text-white/20 group-hover:text-brand transition-colors" />;
      case 'Clock': return <Clock className="w-4 h-4 text-white/20 group-hover:text-brand transition-colors" />;
      default: return <Trophy className="w-4 h-4 text-white/20 group-hover:text-brand transition-colors" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-4xl mx-auto space-y-12 pb-20"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Maintenance Toggle */}
        <div className="p-10 bg-surface/30 border border-white/5 rounded-[40px] space-y-8">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${maintenance ? 'bg-brand/20 text-brand' : 'bg-green-500/20 text-green-500'}`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase italic text-white/80 font-display">Maintenance Mode</h3>
          </div>

          <p className="text-xs font-medium text-white/40 leading-relaxed">
            Enable this to show a landing page for all users except admins. Useful for database migrations or large updates.
          </p>

          <div className="flex items-center justify-between p-6 bg-black/20 rounded-3xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Status: {maintenance ? 'ACTIVE' : 'OFFLINE'}</span>
            <button
              onClick={toggleMaintenance}
              className={`w-14 h-8 rounded-full relative transition-all ${maintenance ? 'bg-brand' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${maintenance ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* API Health Monitor / Achievement Logic */}
        <div className="p-10 bg-surface/30 border border-white/5 rounded-[40px] space-y-8 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/20 text-brand flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase italic text-white/80 font-display">Achievement Logic</h3>
          </div>

          {!isManageOpen ? (
            <>
              <div className="space-y-4 max-h-[160px] overflow-y-auto pr-2 scrollbar-none">
                {achievements.map((item) => (
                  <div key={item.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      {getIcon(item.icon)}
                      <span className="text-xs font-bold text-white/60">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-white/40 px-3 py-1 bg-white/5 rounded-lg border border-white/5">{item.val}</span>
                  </div>
                ))}
                {achievements.length === 0 && <p className="text-xs text-white/30 text-center py-4">No rule sets found.</p>}
              </div>

              <button 
                onClick={() => setIsManageOpen(true)}
                className="w-full py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
              >
                Manage Rule Sets
              </button>
            </>
          ) : (
            <div className="absolute inset-0 bg-[#151515] p-6 z-10 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-sm uppercase tracking-widest text-white">Rule Sets</h4>
                <button onClick={() => { setIsManageOpen(false); setEditingAch(null); }} className="text-white/40 hover:text-white"><X className="w-5 h-5"/></button>
              </div>

              {editingAch ? (
                <div className="space-y-4 flex-1">
                  <input 
                    type="text" placeholder="Label (e.g. Early Bird)" 
                    value={editingAch.label} onChange={e => setEditingAch({...editingAch, label: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand/50"
                  />
                  <input 
                    type="text" placeholder="Value (e.g. 5 Movies)" 
                    value={editingAch.val} onChange={e => setEditingAch({...editingAch, val: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand/50"
                  />
                  <div className="flex gap-2">
                    <select 
                      value={editingAch.icon.startsWith('http') ? 'Custom' : editingAch.icon} 
                      onChange={e => { if (e.target.value !== 'Custom') setEditingAch({...editingAch, icon: e.target.value}) }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand/50 appearance-none"
                    >
                      <option value="Trophy" className="bg-[#1a1a1a]">Trophy</option>
                      <option value="Zap" className="bg-[#1a1a1a]">Lightning (Zap)</option>
                      <option value="Award" className="bg-[#1a1a1a]">Award</option>
                      <option value="Coffee" className="bg-[#1a1a1a]">Coffee</option>
                      <option value="Clock" className="bg-[#1a1a1a]">Clock</option>
                      {customIcons.map(icon => (
                        <option key={icon.id} value={icon.url} className="bg-[#1a1a1a]">{icon.name}</option>
                      ))}
                      {editingAch.icon.startsWith('http') && !customIcons.find(i => i.url === editingAch.icon) && <option value="Custom" className="bg-[#1a1a1a]">Custom Upload</option>}
                    </select>
                    <input type="file" ref={iconInputRef} onChange={handleIconUpload} accept="image/*" className="hidden" />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setEditingAch(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-xs font-bold text-white/50 hover:bg-white/5 transition-colors">Cancel</button>
                    <button onClick={saveAchievement} className="flex-1 py-3 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand/90 transition-colors flex items-center justify-center gap-2"><Save className="w-4 h-4"/> Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-2 custom-scrollbar space-y-4" data-lenis-prevent>
                    <div className="space-y-2">
                      {achievements.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                          <div className="flex items-center gap-3">
                            {getIcon(item.icon)}
                            <div>
                              <p className="text-xs font-bold text-white/90">{item.label}</p>
                              <p className="text-[10px] text-white/40">{item.val}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditingAch(item)} className="p-2 text-white/40 hover:text-white transition-colors"><Edit2 className="w-3 h-3"/></button>
                            <button onClick={() => deleteAchievement(item.id)} className="p-2 text-white/40 hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3"/></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Custom Icons Library */}
                    <div className="pt-4 border-t border-white/10">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Custom Icons Library</h5>
                      <div className="flex flex-wrap gap-2">
                        {customIcons.map(icon => (
                          <div 
                            key={icon.id} 
                            onClick={() => renameCustomIcon(icon.id, icon.name)}
                            className="group relative w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                            title={`Rename: ${icon.name}`}
                          >
                            <Image src={icon.url} width={24} height={24} className="w-6 h-6 object-contain opacity-70 group-hover:opacity-100 transition-opacity" alt={icon.name} />
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteCustomIcon(icon.id); }} 
                              className="absolute -top-2 -right-2 bg-red-500/90 hover:bg-red-500 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-white"/>
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => iconInputRef.current?.click()} 
                          className="w-12 h-12 bg-white/5 border border-white/10 border-dashed rounded-xl flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all text-white/40 hover:text-white"
                          title="Upload new custom icon"
                        >
                          {isUploadingIcon ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/> : <Plus className="w-5 h-5"/>}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <input type="file" ref={iconInputRef} onChange={handleIconUpload} accept="image/*" className="hidden" />

                  <button 
                    onClick={() => setEditingAch({ label: '', val: '', icon: 'Trophy' })}
                    className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4"/> Add Rule Set
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feature Flags */}
      <div className="p-10 bg-surface/30 border border-white/5 rounded-[40px] space-y-10">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black uppercase italic tracking-tighter font-display">Feature <span className="text-brand">Flags</span></h3>
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Global Configuration</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'share', label: "Public Sharing", desc: "Allows profile URL sharing", icon: Globe },
            { id: 'analytics', label: "Smart Analytics", desc: "Advanced usage tracking", icon: History },
            { id: 'realTime', label: "Real-time Hub", desc: "Multiplayer watch hooks", icon: Zap }
          ].map((f) => (
            <div key={f.id} className="p-8 rounded-[32px] bg-black/20 border border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <f.icon className="w-6 h-6 text-brand" />
                <button
                  onClick={() => toggleFlag(f.id as keyof typeof flags)}
                  className={`w-10 h-5 rounded-full relative transition-all ${flags[f.id as keyof typeof flags] ? 'bg-brand' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${flags[f.id as keyof typeof flags] ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-white/80">{f.label}</p>
                <p className="text-[10px] text-white/40 font-medium mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

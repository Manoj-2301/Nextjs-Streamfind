import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ExternalLink, Plus, Trash2, Edit3, Save, CheckCircle2, RefreshCw } from 'lucide-react';
import { getAffiliateLinks, saveAffiliateLinks, AffiliateLinks } from '@/services/affiliateService';

export default function AffiliatesView() {
  const [links, setLinks] = useState<AffiliateLinks>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [platformKey, setPlatformKey] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const data = await getAffiliateLinks();
      setLinks(data);
    } catch (e) {
      console.error(e);
      setMessage({ text: 'Failed to load affiliate links.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedLinks: AffiliateLinks) => {
    setIsSaving(true);
    setMessage(null);
    try {
      await saveAffiliateLinks(updatedLinks);
      setLinks(updatedLinks);
      setMessage({ text: 'Affiliate links updated successfully!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
      setMessage({ text: e.message || 'Failed to save affiliate links.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformKey.trim() || !affiliateUrl.trim()) return;

    const key = platformKey.trim().toLowerCase();
    const updated = {
      ...links,
      [key]: affiliateUrl.trim()
    };

    handleSave(updated);
    setPlatformKey('');
    setAffiliateUrl('');
  };

  const handleDeleteLink = (keyToDelete: string) => {
    if (!confirm(`Are you sure you want to delete the affiliate link for "${keyToDelete}"?`)) return;
    
    const updated = { ...links };
    delete updated[keyToDelete];
    handleSave(updated);
  };

  const handleStartEdit = (key: string) => {
    setEditingKey(key);
    setAffiliateUrl(links[key]);
    setPlatformKey(key);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey || !affiliateUrl.trim()) return;

    const updated = { ...links };
    // If the platform key changed, delete the old one
    const newKey = platformKey.trim().toLowerCase();
    if (newKey !== editingKey) {
      delete updated[editingKey];
    }
    
    updated[newKey] = affiliateUrl.trim();
    
    handleSave(updated);
    setEditingKey(null);
    setPlatformKey('');
    setAffiliateUrl('');
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setPlatformKey('');
    setAffiliateUrl('');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-10 h-10 text-brand animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-white/40">Loading Affiliate Database...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Alert Banner */}
      <div className="p-6 bg-brand/10 border border-brand/20 rounded-[32px] flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-brand flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-widest text-brand">Affiliate Linking Engine</h4>
          <p className="text-xs text-white/70 leading-relaxed font-medium">
            Add platform affiliate links here. When a user clicks a watch button on a platform (e.g. Amazon Prime, Apple TV, Netflix), the engine matches the platform name against the keys defined below. If a match is found, they are routed to your affiliate URL. Otherwise, they fallback to TMDB as usual.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Column */}
        <div className="p-8 bg-surface/30 border border-white/5 rounded-[40px] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/20 text-brand rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black uppercase italic text-white/80 font-display">
              {editingKey ? 'Edit Affiliate Link' : 'Add Affiliate Link'}
            </h3>
          </div>

          <form onSubmit={editingKey ? handleSaveEdit : handleAddLink} className="space-y-4">
            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-2">
                Platform Key / Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. amazon, apple, netflix, hotstar"
                value={platformKey}
                onChange={(e) => setPlatformKey(e.target.value)}
                disabled={editingKey !== null && editingKey === platformKey} // Disable name change if editing
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand/50 transition-colors font-bold uppercase"
              />
              <p className="text-[9px] text-white/30 mt-1 font-medium">
                Tip: Matching is case-insensitive. Defining &quot;amazon&quot; matches both &quot;Amazon Prime Video&quot; and &quot;Amazon Video&quot;.
              </p>
            </div>

            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-2">
                Affiliate / Redirect URL
              </label>
              <input
                type="url"
                required
                placeholder="https://..."
                value={affiliateUrl}
                onChange={(e) => setAffiliateUrl(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand/50 transition-colors font-mono"
              />
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-xl flex items-center gap-2 text-xs font-bold ${
                    message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/10' : 'bg-red-500/10 text-red-400 border border-red-500/10'
                  }`}
                >
                  {message.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                  <span>{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3 pt-2">
              {editingKey && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-3 bg-white/5 text-white/60 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 bg-brand hover:bg-brand/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand/20"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : editingKey ? (
                  <>
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Add Link
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* List Column */}
        <div className="p-8 bg-surface/30 border border-white/5 rounded-[40px] space-y-6 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black uppercase italic text-white/80 font-display">
              Active Affiliate Rules
            </h3>
            <span className="text-[9px] font-black text-white/30 uppercase px-2 py-0.5 bg-white/5 border border-white/5 rounded-md">
              {Object.keys(links).length} platforms
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[320px] pr-2 space-y-3 scrollbar-none">
            {Object.keys(links).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-2 border border-dashed border-white/5 rounded-2xl">
                <ExternalLink className="w-8 h-8 text-white/10" />
                <p className="text-[10px] font-black uppercase text-white/30 tracking-wider">No Custom Affiliates Found</p>
                <p className="text-[9px] text-white/20 max-w-[200px] font-medium">All streaming platforms are routing to TMDB directly.</p>
              </div>
            ) : (
              Object.keys(links).map((key) => (
                <div
                  key={key}
                  className="p-4 bg-black/20 border border-white/5 hover:border-white/10 rounded-2xl flex items-center justify-between gap-4 transition-all group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white group-hover:text-brand transition-colors block">
                      {key}
                    </span>
                    <a
                      href={links[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-white/40 hover:text-white/60 font-mono block truncate hover:underline"
                    >
                      {links[key]}
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(key)}
                      className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                      title="Edit link"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLink(key)}
                      className="p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                      title="Delete link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

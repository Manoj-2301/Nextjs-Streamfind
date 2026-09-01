/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Search, Trash2, CheckCircle, Clock, X, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */
export interface ContactQuery {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  message: string;
  status: 'Unread' | 'Read';
  createdAt?: any;
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function ContactQueriesView({
  queries,
  isLoading,
  onDeleteQuery,
  onMarkAsRead
}: {
  queries: ContactQuery[];
  isLoading: boolean;
  onDeleteQuery: (id: string) => void;
  onMarkAsRead: (id: string) => void;
}) {

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuery, setSelectedQuery] = useState<ContactQuery | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);


  /*
   * ============================================================
   * EVENT HANDLERS
   * ============================================================
   */
  const handleReply = async () => {
    if (!selectedQuery || !replyMessage.trim()) return;
    
    setIsReplying(true);
    try {
      const res = await fetch('/api/contact/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedQuery.email,
          name: selectedQuery.firstName,
          originalMessage: selectedQuery.message,
          replyMessage: replyMessage.trim()
        })
      });

      if (!res.ok) throw new Error('Failed to send reply');

      toast.success('Reply sent successfully!');
      setReplyMessage('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  const filteredQueries = useMemo(() => {
    return queries
      .filter(q => 
        q.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.message?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });
  }, [queries, searchQuery]);

  const handleOpenQuery = (query: ContactQuery) => {
    setSelectedQuery(query);
    if (query.status === 'Unread') {
      onMarkAsRead(query.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="bg-surface/30 border border-white/5 rounded-[40px] p-8 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter font-display">User <span className="text-brand">Queries</span></h2>
        <div className="flex-1 max-w-xl relative w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          <input
            type="text"
            placeholder="Search queries by name, email, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface/50 border border-white/10 rounded-[32px] pl-16 pr-8 py-5 outline-none focus:border-brand transition-all font-bold text-sm text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredQueries.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-surface/30 border border-white/5 rounded-[40px] text-white/40 font-bold uppercase tracking-widest text-xs">
            No queries found in the mainframe
          </div>
        ) : (
          filteredQueries.map((q) => (
            <div 
              key={q.id} 
              onClick={() => handleOpenQuery(q)}
              className={`bg-surface/30 border ${q.status === 'Unread' ? 'border-brand/50' : 'border-white/5'} rounded-[32px] p-6 space-y-4 flex flex-col cursor-pointer hover:bg-white/5 transition-all group`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl ${q.status === 'Unread' ? 'bg-brand/20 text-brand border border-brand/30' : 'bg-white/5 text-white/40'} flex items-center justify-center shrink-0`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                      {q.firstName} {q.lastName}
                    </p>
                    <p className="text-[10px] font-medium text-white/40 truncate">{q.email}</p>
                  </div>
                </div>
                {q.status === 'Unread' && (
                  <div className="w-2 h-2 rounded-full bg-brand animate-pulse shrink-0 mt-2" />
                )}
              </div>

              <div className="flex-1">
                <p className="text-xs text-white/60 line-clamp-3 leading-relaxed">
                  {q.message}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/30 tracking-widest">
                  <Clock className="w-3 h-3" />
                  {q.createdAt?.toDate ? q.createdAt.toDate().toLocaleDateString() : 'Unknown Date'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteQuery(q.id);
                  }}
                  className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                  title="Delete Query"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-white/10 p-6 md:p-8 rounded-[32px] max-w-xl w-full relative shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={() => {
                  setSelectedQuery(null);
                  setReplyMessage('');
                }}
                className="absolute top-6 right-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6 flex justify-between items-start pr-10">
                <div>
                  <div className="flex items-center gap-4 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand shadow-[0_0_15px_rgba(255,40,78,0.2)]">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">
                        {selectedQuery.firstName} {selectedQuery.lastName}
                      </h3>
                      <p className="text-xs font-medium text-white/40">{selectedQuery.email}</p>
                    </div>
                  </div>
                  <p className="text-[9px] font-black uppercase text-white/30 tracking-widest pl-14">
                    Received: {selectedQuery.createdAt?.toDate ? selectedQuery.createdAt.toDate().toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <p className="text-[9px] font-black uppercase text-brand tracking-widest flex items-center gap-2 mb-2">
                  User Message
                </p>
                <div className="pl-3 border-l-2 border-brand py-0.5">
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedQuery.message}
                  </p>
                </div>
              </div>

              <div className="mb-2">
                <h4 className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-2 flex items-center gap-2">
                  Admin Reply
                </h4>
                <div className="group">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Draft your reply here..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl rounded-tr-sm p-4 text-sm text-white focus:border-brand/50 focus:ring-1 focus:ring-brand/50 outline-none transition-all resize-none h-32 placeholder:text-white/20 group-hover:border-white/20 mb-3"
                  />
                  <div className="flex justify-end items-center gap-3">
                    <button
                      onClick={() => {
                        onDeleteQuery(selectedQuery.id);
                        setSelectedQuery(null);
                        setReplyMessage('');
                      }}
                      className="px-5 py-2.5 bg-red-500/10 text-red-500/80 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-red-500 hover:bg-red-500/20 transition-all flex items-center gap-2 border border-red-500/10 hover:border-red-500/30"
                      title="Delete Query"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Query
                    </button>
                    <button
                      onClick={handleReply}
                      disabled={isReplying || !replyMessage.trim()}
                      className="px-6 py-2.5 bg-brand text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,40,78,0.4)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isReplying ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

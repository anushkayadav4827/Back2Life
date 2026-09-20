import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ArrowLeft, Loader2, ChevronRight, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

export default function RepairHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    api.getRepairHistory()
      .then(res => {
        setHistory(res.history || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load history');
        setLoading(false);
      });
  }, []);

  const categories = ['all', ...Array.from(new Set(history.map(h => h.deviceId)))];

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter(h => h.deviceId === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-400" />
            Your Repair History
          </h2>
          <p className="text-slate-400">Past diagnoses across all your devices.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 rounded-3xl border border-white/10 bg-white/5">
          <History className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">No history yet</h3>
          <p className="text-slate-400 mb-6">Run a diagnosis on a broken device to see it here.</p>
          <button 
            onClick={() => navigate('/device')}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors"
          >
            Start Diagnosis
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.length > 2 && (
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filter === cat 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {cat === 'all' ? 'All Devices' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-4">
            {filteredHistory.map((item) => (
              <div 
                key={item.sessionId}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {item.deviceId.toUpperCase()}
                    </span>
                    <span className="text-sm text-slate-400">
                      {new Date(item.savedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-medium text-lg">{item.issueId}</h3>
                  {item.problemText && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-1 italic">"{item.problemText}"</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    {item.score !== undefined && (
                      <span className="text-emerald-400 font-medium">Repairability: {item.score}/100</span>
                    )}
                    {item.decision && (
                      <span className="text-cyan-400 capitalize">Verdict: {item.decision.replace('_', ' ')}</span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/result?session=${item.sessionId}`)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

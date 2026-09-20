import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Wrench, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export default function RepairVsReplace() {
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('diagnosisResult');
    if (!stored) {
      navigate('/');
    } else {
      const data = JSON.parse(stored);
      if (!data.comparison) {
        navigate('/result');
      } else {
        setResult(data);
      }
    }
  }, [navigate]);

  if (!result) return null;

  const isRepairFavored = result.comparison === 'repair_recommended';
  const isReplaceFavored = result.comparison === 'replacement_recommended';
  
  const title = isRepairFavored ? 'Repair Recommended' : isReplaceFavored ? 'Replacement Recommended' : 'It\'s a Close Call';
  const titleColor = isRepairFavored ? 'text-emerald-400' : isReplaceFavored ? 'text-amber-400' : 'text-blue-400';
  const boxBg = isRepairFavored ? 'bg-emerald-500/10 border-emerald-500/20' : isReplaceFavored ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20';

  const repairMin = result.repairCostRange?.minINR || 0;
  const repairMax = result.repairCostRange?.maxINR || 0;
  const replaceMin = result.replacementCostRange?.minINR || 0;

  const maxVal = Math.max(repairMax, replaceMin);
  const _repairPct = maxVal > 0 ? (repairMax / maxVal) * 100 : 0;
  const _replacePct = maxVal > 0 ? (replaceMin / maxVal) * 100 : 0;
  void _repairPct; void _replacePct;

  const renderArgument = (arg: any, isRepair: boolean) => {
    if (typeof arg === 'object' && arg) {
      return (
        <div className="space-y-3">
          <p className="text-white font-medium">{arg.summary}</p>
          {Array.isArray(arg.keyPoints) && arg.keyPoints.length > 0 && (
            <ul className="list-disc pl-4 space-y-1">
              {arg.keyPoints.map((pt: string, i: number) => <li key={i}>{pt}</li>)}
            </ul>
          )}
          {((Array.isArray(arg.pros) && arg.pros.length > 0) || (Array.isArray(arg.cons) && arg.cons.length > 0)) && (
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10">
              {Array.isArray(arg.pros) && arg.pros.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Pros</span>
                  <ul className="list-disc pl-4 space-y-1 mt-1 text-xs">
                    {arg.pros.map((p: string, i: number) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(arg.cons) && arg.cons.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Cons</span>
                  <ul className="list-disc pl-4 space-y-1 mt-1 text-xs">
                    {arg.cons.map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          {arg.bottomLine && (
            <p className={cn("font-medium italic mt-2", isRepair ? "text-emerald-400" : "text-amber-400")}>{arg.bottomLine}</p>
          )}
        </div>
      );
    }
    return <p>{arg}</p>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold">The Verdict</h2>
        <p className="text-slate-400">Here's how the costs compare</p>
      </div>

      <div className={cn("p-6 rounded-3xl border text-center space-y-3", boxBg)}>
        <h3 className={cn("text-2xl font-bold", titleColor)}>{title}</h3>
        <p className="text-slate-300 text-sm">
          {result.confidence === 'demo_estimate' ? 
            "Based on average market rates, this is our recommendation." : 
            "Based on deterministic cost-per-year math, this is our recommendation."}
        </p>
        
        {result.repairCostPerYear !== undefined && result.replaceCostPerYear !== undefined && (
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Repair Math</p>
              <p className="font-bold text-lg text-emerald-400">₹{result.repairCostPerYear}/yr</p>
            </div>
            <div className="text-slate-500 font-medium">vs</div>
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Replace Math</p>
              <p className="font-bold text-lg text-amber-400">₹{result.replaceCostPerYear}/yr</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 pt-4">
        {/* Repair Column */}
        <div className={cn("p-6 rounded-3xl border space-y-4 text-center transition-all", isRepairFavored ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20" : "bg-white/5 border-white/10")}>
          <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
            <Wrench className="w-6 h-6" />
            <h3 className="font-bold text-lg">Repair Cost</h3>
          </div>
          <p className="text-3xl font-extrabold text-white">₹{repairMin.toLocaleString()}{repairMax > repairMin ? ` - ₹${repairMax.toLocaleString()}` : ''}</p>
          <div className="h-px w-full bg-white/10"></div>
          {result.repairCostPerYear !== undefined && (
            <p className="text-slate-300 text-sm">
              Repairing costs about <strong className="text-emerald-400">₹{result.repairCostPerYear}</strong> per year you'll keep using it.
            </p>
          )}
          {isRepairFavored && (
            <div className="mt-4 inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-full border border-emerald-500/20">
              Better Value
            </div>
          )}
        </div>

        {/* Replace Column */}
        <div className={cn("p-6 rounded-3xl border space-y-4 text-center transition-all", isReplaceFavored ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20" : "bg-white/5 border-white/10")}>
          <div className="flex items-center justify-center gap-2 text-amber-400 mb-2">
            <RefreshCw className="w-6 h-6" />
            <h3 className="font-bold text-lg">Replacement Cost</h3>
          </div>
          <p className="text-3xl font-extrabold text-white">₹{replaceMin.toLocaleString()}+</p>
          <div className="h-px w-full bg-white/10"></div>
          {result.replaceCostPerYear !== undefined && (
            <p className="text-slate-300 text-sm">
              Replacing costs about <strong className="text-amber-400">₹{result.replaceCostPerYear}</strong> per year over its typical lifespan.
            </p>
          )}
          {isReplaceFavored && (
            <div className="mt-4 inline-block px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-full border border-amber-500/20">
              Better Value
            </div>
          )}
        </div>
      </div>

      {result.debate && (
        <div className="pt-6 space-y-4 animate-in fade-in duration-700">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold">Repair Vs Replace Debate</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className={cn("p-5 rounded-2xl border space-y-3 transition-colors", 
              result.debate.winner === 'REPAIR' ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/10 opacity-75'
            )}>
              <div className="flex items-center justify-between">
                <h4 className={cn("font-bold text-lg", result.debate.winner === 'REPAIR' ? 'text-emerald-400' : 'text-slate-300')}>Repair Agent</h4>
                {result.debate.winner === 'REPAIR' && <span className="text-xs font-bold text-emerald-500 px-2 py-1 bg-emerald-500/10 rounded-md">WINNER</span>}
              </div>
              <div className="text-sm text-slate-300 leading-relaxed space-y-3">
                {renderArgument(result.debate.repairArgument, true)}
              </div>
            </div>
            
            <div className={cn("p-5 rounded-2xl border space-y-3 transition-colors", 
              result.debate.winner === 'REPLACE' ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/10 opacity-75'
            )}>
              <div className="flex items-center justify-between">
                <h4 className={cn("font-bold text-lg", result.debate.winner === 'REPLACE' ? 'text-amber-400' : 'text-slate-300')}>Replace Agent</h4>
                {result.debate.winner === 'REPLACE' && <span className="text-xs font-bold text-amber-500 px-2 py-1 bg-amber-500/10 rounded-md">WINNER</span>}
              </div>
              <div className="text-sm text-slate-300 leading-relaxed space-y-3">
                {renderArgument(result.debate.replaceArgument, false)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-8">
        <Link 
          to="/providers"
          className="flex items-center justify-between w-full min-h-[44px] p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          <span>Find Repair Shops</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

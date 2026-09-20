import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Settings, Battery, Banknote, PenTool, RefreshCw, Info } from 'lucide-react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  score: number;
  color: string;
  bgColor: string;
  barColor: string;
  description: string;
  tooltip: string;
}


function MetricCard({ icon, label, score, color, bgColor, barColor, description, tooltip }: MetricCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${bgColor} ${expanded ? 'border-white/20 ring-1 ring-white/10' : 'border-white/10 hover:border-white/20'}`}
      onClick={() => setExpanded(e => !e)}
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setExpanded(x => !x)}
      role="button"
      aria-expanded={expanded}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-1.5 rounded-lg ${bgColor}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className={`text-xl font-bold ${color}`}>{Math.round(score)}<span className="text-sm font-normal text-slate-500">/100</span></div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</div>
        </div>
        <Info className={`w-3.5 h-3.5 shrink-0 transition-opacity ${expanded ? 'opacity-80' : 'opacity-30 group-hover:opacity-60'} text-slate-400`} />
      </div>

      {/* Mini bar */}
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${Math.max(4, Math.round(score))}%` }}
        />
      </div>

      {/* Static description */}
      <p className="text-xs text-slate-500 leading-snug">{description}</p>

      {/* Expanded tooltip */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-300 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
          {tooltip}
        </div>
      )}
    </div>
  );
}

function getSummaryLine(score: number): string {
  if (score >= 75) {
    return 'This device is a strong repair candidate — parts are available, the fix is straightforward, and it\'s far cheaper than buying new.';
  }
  if (score >= 55) {
    return 'Repair is likely worthwhile here — cost and complexity are manageable, though it may not extend the device\'s life significantly.';
  }
  if (score >= 40) {
    return 'This is a borderline case — repair is possible, but replacement might offer better long-term value depending on your budget.';
  }
  return 'Repair is not strongly recommended here — high costs or part scarcity make replacement the more practical option.';
}

function getGaugeRotation(score: number): number {
  // Maps 0-100 → -135° to +135° (270° arc)
  return -135 + (score / 100) * 270;
}

export default function RepairabilityScore() {
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('diagnosisResult');
    if (!stored) {
      navigate('/');
    } else {
      const data = JSON.parse(stored);
      if (!data.score) {
        navigate('/result');
      } else {
        setResult(data);
      }
    }
  }, [navigate]);

  if (!result) return null;

  const sb = result.scoreBreakdown || {};
  const parts = Math.round(sb.partsAvailabilityScore ?? 0);
  const complexity = Math.round(sb.complexityScore ?? 0);
  const costRatio = Math.round(sb.costRatioScore ?? 0);
  const age = Math.round(sb.ageFactorScore ?? 0);
  const usability = Math.round(sb.usabilityScore ?? 0);

  const repairMin = result.repairCostRange?.minINR;
  const repairMax = result.repairCostRange?.maxINR;
  const replaceMin = result.replacementCostRange?.minINR;
  const replaceMax = result.replacementCostRange?.maxINR;

  const repairStr = repairMin != null ? `₹${repairMin.toLocaleString('en-IN')}–₹${repairMax?.toLocaleString('en-IN')}` : 'N/A';
  const replaceStr = replaceMin != null ? `₹${replaceMin.toLocaleString('en-IN')}–₹${replaceMax?.toLocaleString('en-IN')}` : 'N/A';
  const costPct = (repairMin != null && replaceMin != null && replaceMin > 0)
    ? Math.round((repairMin / replaceMin) * 100)
    : null;

  const scoreColor =
    result.score >= 75 ? 'text-emerald-400' :
    result.score >= 55 ? 'text-yellow-400' :
    result.score >= 40 ? 'text-orange-400' : 'text-red-400';

  const gaugeBorderColor =
    result.score >= 75 ? 'border-emerald-500' :
    result.score >= 55 ? 'border-yellow-500' :
    result.score >= 40 ? 'border-orange-500' : 'border-red-500';

  const summaryLine = getSummaryLine(result.score);

  const metrics: MetricCardProps[] = [
    {
      icon: <Settings className="w-4 h-4 text-blue-400" />,
      label: 'Parts Score',
      score: parts,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/5',
      barColor: 'bg-blue-400',
      description: parts >= 80 ? 'Parts are widely available' : parts >= 50 ? 'Parts are moderately available' : 'Parts are scarce or expensive',
      tooltip: `A score of ${parts}/100 means ${parts >= 80 ? 'replacement parts for this device are easy to source — repairs can proceed quickly without sourcing delays.' : parts >= 50 ? 'parts exist but may need to be ordered in — expect some lead time for the repair.' : 'parts are hard to find or costly, which significantly limits repair options.'}`,
    },
    {
      icon: <PenTool className="w-4 h-4 text-purple-400" />,
      label: 'Complexity',
      score: complexity,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/5',
      barColor: 'bg-purple-400',
      description: complexity >= 80 ? 'Easy repair, DIY possible' : complexity >= 50 ? 'Moderate — technician recommended' : 'Highly complex, specialist required',
      tooltip: `A score of ${complexity}/100 reflects repair difficulty. ${complexity >= 80 ? 'This is a simple procedure most technicians can do quickly.' : complexity >= 50 ? 'The repair requires skill and proper tools — seek a qualified technician.' : 'This is a high-risk, technically demanding repair. Only specialist shops should attempt it.'}`,
    },
    {
      icon: <Banknote className="w-4 h-4 text-emerald-400" />,
      label: 'Cost Ratio',
      score: costRatio,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/5',
      barColor: 'bg-emerald-400',
      description: costRatio >= 80 ? 'Very cheap vs replacement' : costRatio >= 50 ? 'Moderate cost relative to new' : 'Repair nears replacement cost',
      tooltip: costPct != null
        ? `Repair costs ${repairStr} vs replacement at ${replaceStr}. Repair is about ${costPct}% of the cost of buying new — ${costPct <= 30 ? 'an excellent deal.' : costPct <= 60 ? 'a reasonable trade-off.' : 'getting close to buying new, worth considering carefully.'}`
        : `Repair costs ${repairStr} versus replacement at ${replaceStr}.`,
    },
    {
      icon: <Battery className="w-4 h-4 text-orange-400" />,
      label: 'Age Factor',
      score: age,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/5',
      barColor: 'bg-orange-400',
      description: age >= 80 ? 'Device is relatively new' : age >= 40 ? 'Mid-life device' : 'Approaching end-of-life',
      tooltip: `An age score of ${age}/100. ${age >= 80 ? 'Your device is still relatively young — repairing it will give you many more years of productive use.' : age >= 40 ? 'Your device is in its middle years. Repairing is still sensible, but plan for eventual replacement.' : 'Your device is old relative to its expected lifespan. Repair costs may only buy a short extension.'}`,
    },
    {
      icon: <RefreshCw className="w-4 h-4 text-cyan-400" />,
      label: 'Expected Usability',
      score: usability,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/5',
      barColor: 'bg-cyan-400',
      description: usability >= 80 ? 'Many years of use remaining' : usability >= 40 ? 'A few years of life left' : 'Very short remaining lifespan',
      tooltip: `An usability score of ${usability}/100. ${usability >= 80 ? 'After this repair, the device is expected to serve you reliably for many more years.' : usability >= 40 ? 'You can expect a couple more years of use post-repair, making it worthwhile.' : 'Even after repair, the device may not last long before the next failure occurs.'}`,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold">Repairability Score</h2>
        <p className="text-emerald-400 font-semibold">{result.scoreBand}</p>
      </div>

      {/* Gauge + Summary */}
      <div className="flex flex-col items-center gap-6">
        {/* Circular gauge */}
        <div className="relative w-44 h-44">
          {/* Background track */}
          <div className={`absolute inset-0 rounded-full border-8 border-white/5`} />
          {/* Score arc (CSS trick using clip/rotate) */}
          <div
            className={`absolute inset-0 rounded-full border-8 ${gaugeBorderColor} border-r-transparent border-b-transparent transition-all duration-1000`}
            style={{ transform: `rotate(${getGaugeRotation(result.score)}deg)` }}
          />
          {/* Average marker at 50 */}
          <div
            className="absolute inset-0 rounded-full border-8 border-transparent"
            style={{ transform: 'rotate(0deg)' }}
          >
            <div
              className="absolute w-1.5 h-4 bg-slate-400/60 rounded-sm"
              style={{ top: '-8px', left: '50%', transform: 'translateX(-50%)' }}
              title="Typical score for this device category: 50"
            />
          </div>
          {/* Score number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-extrabold ${scoreColor}`}>{result.score}</span>
            <span className="text-xs text-slate-500 mt-0.5">out of 100</span>
          </div>
        </div>

        {/* Legend for average marker */}
        <p className="text-xs text-slate-500 text-center">
          <span className="inline-block w-2.5 h-2.5 bg-slate-400/60 rounded-sm align-middle mr-1.5" />
          Typical score for this device category: 50
        </p>

        {/* Plain-English summary */}
        <div className="w-full max-w-2xl px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-sm text-slate-300 leading-relaxed">{summaryLine}</p>
        </div>
      </div>

      {/* Metric cards — 2 col on mobile, 3 on md, 5 across on xl but balanced */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      {result.priorRepairsPenalty && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
          <div className="text-xs text-rose-400 font-bold uppercase tracking-wider">Prior Repairs Impact</div>
          <div className="text-sm text-rose-300 font-medium">{result.priorRepairsPenalty}</div>
          <div className="text-xs text-rose-400/80">Multiple previous repairs reduce the overall reliability score.</div>
        </div>
      )}

      <p className="text-center text-xs text-slate-500">
        Tap any metric card above to see a personalised explanation.
      </p>

      <div className="pt-2">
        <Link
          to="/compare"
          className="flex items-center justify-center gap-2 w-full min-h-[44px] p-4 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors"
        >
          <span>See Repair vs Replace</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

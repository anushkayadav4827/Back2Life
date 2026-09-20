import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Wrench, CheckCircle2 } from 'lucide-react';

export default function DiagnosisResult() {
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('diagnosisResult');
    if (!stored) {
      navigate('/');
    } else {
      setResult(JSON.parse(stored));
    }
  }, [navigate]);

  if (!result) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold">Diagnosis Complete</h2>
        <p className="text-slate-400">Based on our AI analysis</p>
      </div>

      <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
        <div className="flex items-center gap-3 text-emerald-400">
          <Wrench className="w-6 h-6 shrink-0" />
          <h3 className="text-xl font-bold">Likely Issue: {result.likelyIssueLabel || result.likelyIssue}</h3>
        </div>
        <div className="text-slate-300 text-sm md:text-base leading-relaxed space-y-4">
          {typeof result.likelyIssueReason === 'object' && result.likelyIssueReason ? (
            <div className="space-y-4">
              {/* New 4-field shape */}
              {result.likelyIssueReason.observed && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Observed</h4>
                  <p className="text-slate-300">{result.likelyIssueReason.observed}</p>
                </div>
              )}
              {result.likelyIssueReason.likelyCause && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Likely Cause</h4>
                  <p className="text-slate-300">{result.likelyIssueReason.likelyCause}</p>
                </div>
              )}
              {result.likelyIssueReason.recommendedFix && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Recommended Fix</h4>
                  <p className="text-slate-300">{result.likelyIssueReason.recommendedFix}</p>
                </div>
              )}
              {result.likelyIssueReason.outlook && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Outlook</h4>
                  <p className="text-slate-300">{result.likelyIssueReason.outlook}</p>
                </div>
              )}
              {/* Old shape fallback: summary + keyPoints */}
              {!result.likelyIssueReason.observed && result.likelyIssueReason.summary && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Analysis</h4>
                  <p className="text-slate-300">{result.likelyIssueReason.summary}</p>
                </div>
              )}
              {!result.likelyIssueReason.observed && Array.isArray(result.likelyIssueReason.keyPoints) && result.likelyIssueReason.keyPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Key Points</h4>
                  <ul className="space-y-1">
                    {result.likelyIssueReason.keyPoints.map((pt: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!result.likelyIssueReason.observed && result.likelyIssueReason.bottomLine && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Bottom Line</h4>
                  <p className="text-slate-300">{result.likelyIssueReason.bottomLine}</p>
                </div>
              )}
            </div>
          ) : (
            <p>{result.likelyIssueReason || 'Based on the symptoms provided, this is the most probable cause.'}</p>
          )}
        </div>
      </div>

      {Array.isArray(result.otherPossibleCauses) && result.otherPossibleCauses.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Other Possibilities</h4>
          <ul className="space-y-2">
            {result.otherPossibleCauses.map((cause: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 opacity-50" />
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.score && (
        <div className="pt-6">
          <Link 
            to="/score"
            className="flex items-center justify-between w-full min-h-[44px] p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <span>View Repairability Score</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      )}
    </div>
  );
}

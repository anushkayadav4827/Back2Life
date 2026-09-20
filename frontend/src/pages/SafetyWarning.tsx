import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SafetyWarning() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
      <div className="flex flex-col items-center text-center p-8 bg-red-500/10 border border-red-500/20 rounded-3xl">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-red-400">Stop Use Immediately</h2>
          <p className="text-slate-300 max-w-sm">
            Based on your answers (e.g. burning smell), this device poses a severe fire or safety hazard. Do not attempt to charge or use it.
          </p>
        </div>
      </div>

      <div className="pt-4">
        <Link 
          to="/"
          className="flex items-center justify-center w-full min-h-[44px] p-4 rounded-2xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

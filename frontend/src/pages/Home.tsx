import { Link } from 'react-router-dom';
import { ArrowRight, History, Laptop, Smartphone, Headphones, Wrench, ShieldCheck, Activity } from 'lucide-react';

export default function Home() {
  return (
    <div className="w-full flex flex-col md:flex-row md:items-center justify-between min-h-[calc(100vh-8rem)] gap-8 lg:gap-12 py-4 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Left Column: Content */}
      <div className="flex-1 space-y-8 text-left">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-semibold border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Smart Repair Assistant</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-7xl leading-[1.1] font-extrabold tracking-tight break-words">
            Repair, don't <br className="hidden md:block" />
            <span className="text-slate-500 line-through decoration-slate-600">replace</span>
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl max-w-lg leading-relaxed">
            AI-powered diagnosis and repairability scoring for your electronics. Save money and reduce e-waste in under two minutes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4 max-w-md">
          <Link 
            to="/device"
            className="flex items-center justify-center gap-2 w-full sm:w-auto flex-1 min-h-[56px] px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
          >
            <span>Start Diagnosis</span>
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link to="/history" className="flex items-center justify-center gap-2 w-full sm:w-auto flex-1 min-h-[56px] px-6 rounded-2xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition-colors">
            <History className="w-5 h-5 text-slate-400" />
            <span>History</span>
          </Link>
        </div>
      </div>

      {/* Right Column: Visual Showcase */}
      <div className="hidden md:flex flex-1 relative items-center justify-center min-h-[400px] w-full max-w-lg">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 blur-[120px] rounded-full" />
        
        {/* Floating Elements Grid */}
        <div className="relative w-full aspect-square max-w-[400px]">
          {/* Center piece */}
          <div className="absolute inset-0 m-auto w-32 h-32 rounded-3xl bg-slate-800/80 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl shadow-emerald-500/20 z-20">
            <Activity className="w-16 h-16 text-emerald-400 animate-pulse" />
          </div>
          
          {/* Orbiting elements */}
          <div className="absolute top-4 left-4 w-24 h-24 rounded-2xl bg-slate-800/60 backdrop-blur-md border border-white/5 flex items-center justify-center -translate-y-4 -translate-x-4 shadow-xl">
            <Laptop className="w-10 h-10 text-blue-400" />
          </div>
          <div className="absolute top-12 right-0 w-20 h-20 rounded-2xl bg-slate-800/60 backdrop-blur-md border border-white/5 flex items-center justify-center translate-x-4 shadow-xl">
            <Smartphone className="w-8 h-8 text-purple-400" />
          </div>
          <div className="absolute bottom-16 left-0 w-20 h-20 rounded-2xl bg-slate-800/60 backdrop-blur-md border border-white/5 flex items-center justify-center -translate-x-4 shadow-xl">
            <Headphones className="w-8 h-8 text-amber-400" />
          </div>
          <div className="absolute bottom-4 right-8 w-24 h-24 rounded-2xl bg-slate-800/60 backdrop-blur-md border border-white/5 flex items-center justify-center translate-y-4 shadow-xl">
            <Wrench className="w-10 h-10 text-cyan-400" />
          </div>
        </div>
      </div>
      
    </div>
  );
}

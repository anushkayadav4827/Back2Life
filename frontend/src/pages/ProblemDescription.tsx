import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, ArrowRight, Loader2 } from 'lucide-react';
import { api, sessionStore } from '../lib/api';

const DEVICE_SYMPTOMS: Record<string, string[]> = {
  laptop: ['Not charging', 'Won\'t turn on', 'Screen cracked', 'Overheating', 'Keys not working', 'Running slow', 'Random shutdowns', 'WiFi issues', 'Trackpad jumping', 'Fan noise'],
  phone: ['Screen cracked', 'Battery draining fast', 'Won\'t turn on', 'Camera broken', 'Water damage', 'Buttons unresponsive', 'Storage full', 'Network issues'],
  headphones: ['One side not working', 'Won\'t connect to Bluetooth', 'Battery not holding charge', 'Broken headband', 'Static noise', 'Case not charging', 'Mic not working'],
  tablet: ['Screen cracked', 'Not charging', 'Touch screen unresponsive', 'Won\'t turn on'],
  smartwatch: ['Screen cracked', 'Not tracking steps', 'Won\'t turn on', 'Battery drains fast']
};
const DEFAULT_SYMPTOMS = ['Not charging', 'Won\'t turn on', 'Screen cracked', 'Overheating'];

export default function ProblemDescription() {
  const [searchParams] = useSearchParams();
  const deviceId = searchParams.get('device') || 'laptop';
  const navigate = useNavigate();
  
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError('');

    try {
      const storedIntake = sessionStorage.getItem('intakeData');
      const intakeData = storedIntake ? JSON.parse(storedIntake) : undefined;
      
      const res = await api.startDiagnosis(deviceId, text, intakeData);
      sessionStore.setSessionId(res.data.sessionId);
      sessionStore.setQuestions(res.data.questions);
      sessionStorage.setItem('deviceId', deviceId);
      sessionStorage.removeItem('answers');
      navigate('/interview');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold">What's the issue?</h2>
        <p className="text-slate-400">Describe the problem or select a common symptom.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[120px] focus:outline-none focus:border-emerald-500/50 resize-none placeholder:text-slate-500"
            placeholder="e.g., My laptop won't charge when plugged in..."
            required
          />
          <button type="button" className="absolute bottom-3 right-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-slate-300">
            <Camera className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button 
          type="submit"
          disabled={loading || !text.trim()}
          className="flex items-center justify-center gap-2 w-full min-h-[44px] p-4 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="pt-6">
        <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Common Symptoms</h3>
        <div className="flex flex-wrap gap-2">
          {(DEVICE_SYMPTOMS[deviceId.toLowerCase()] || DEFAULT_SYMPTOMS).map((symptom) => (
            <button 
              key={symptom} 
              type="button"
              onClick={() => setText(symptom)}
              className="px-4 py-2 min-h-[44px] rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors"
            >
              {symptom}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

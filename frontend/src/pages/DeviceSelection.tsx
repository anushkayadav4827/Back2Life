import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Laptop, Smartphone, Headphones, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

const ICONS: Record<string, any> = {
  laptop: { icon: Laptop, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  smartphone: { icon: Smartphone, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  headphones: { icon: Headphones, color: 'text-purple-400', bg: 'bg-purple-400/10' },
};

export default function DeviceSelection() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDevices().then((res) => {
      setDevices(res.data?.devices || []);
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to fetch devices', err);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold">What device needs fixing?</h2>
        <p className="text-slate-400">Select a category to begin diagnosis.</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
        ) : (
          devices.map((device) => {
            const style = ICONS[device.deviceId] || ICONS.laptop;
            const Icon = style.icon;
            return (
              <Link 
                key={device.deviceId}
                to={`/intake?device=${device.deviceId}`}
                className="flex items-center gap-4 min-h-[44px] p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className={`p-3 rounded-xl ${style.bg}`}>
                  <Icon className={`w-6 h-6 ${style.color}`} />
                </div>
                <span className="font-semibold text-lg">{device.name}</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

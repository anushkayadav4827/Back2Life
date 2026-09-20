import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Phone, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

export default function ProviderNetwork() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const deviceId = sessionStorage.getItem('deviceId') || 'smartphone'; // fallback
    api.getProviders(deviceId).then((res) => {
      setProviders(res.data?.providers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold">Provider Network</h2>
        <p className="text-slate-400">Local repair shops for your device</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
        ) : providers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white/5 rounded-3xl border border-white/10">
            No demo providers found for this category.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
            {providers.map((provider) => (
              <div key={provider.providerId} className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{provider.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{provider.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg text-sm font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{provider.rating}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 min-h-[44px] bg-white/10 hover:bg-white/20 transition-colors py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact
                  </button>
                  <button className="flex-1 min-h-[44px] bg-emerald-500 hover:bg-emerald-400 transition-colors py-2 rounded-xl text-sm font-semibold text-white">
                    Book Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 text-center">
        <Link to="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
          Return Home
        </Link>
      </div>
    </div>
  );
}

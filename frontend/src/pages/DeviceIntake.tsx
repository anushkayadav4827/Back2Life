import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ClipboardList } from 'lucide-react';

export default function DeviceIntake() {
  const [searchParams] = useSearchParams();
  const deviceId = searchParams.get('device') || 'laptop';
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    purchaseDate: '',
    purchasePriceINR: '',
    warrantyStatus: 'UNSURE',
    warrantyExpiry: '',
    priorRepairs: 'NONE',
    usageIntensity: 'MODERATE',
    budgetINR: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate dynamic ageYears from purchaseDate
    let computedAgeYears = 0;
    if (formData.purchaseDate) {
      const pDate = new Date(formData.purchaseDate);
      const diffMs = Date.now() - pDate.getTime();
      computedAgeYears = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365.25));
    }
    
    // Save to sessionStorage to pass to next screen
    sessionStorage.setItem('intakeData', JSON.stringify({
      ...formData,
      ageYears: computedAgeYears,
      purchasePriceINR: Number(formData.purchasePriceINR) || 0,
      budgetINR: formData.budgetINR ? Number(formData.budgetINR) : undefined
    }));

    navigate(`/problem?device=${deviceId}`);
  };

  const isFormValid = formData.brand.trim() !== '' && formData.model.trim() !== '' && formData.purchaseDate !== '' && formData.purchasePriceINR !== '';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/device')}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-400" />
            Device Details
          </h2>
          <p className="text-slate-400">Tell us a bit about your {deviceId} so we can better assist you.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Brand *</label>
            <input 
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-500"
              placeholder="e.g., Apple, Samsung, Dell"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Model *</label>
            <input 
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-500"
              placeholder="e.g., iPhone 13, XPS 15"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Purchase Date (Month & Year) *</label>
            <input 
              type="month"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleChange}
              min={new Date(new Date().setFullYear(new Date().getFullYear() - 20)).toISOString().slice(0, 7)}
              max={new Date().toISOString().slice(0, 7)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500/50 text-slate-200"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Purchase Price (INR) *</label>
            <input 
              type="number"
              name="purchasePriceINR"
              value={formData.purchasePriceINR}
              onChange={handleChange}
              min="0"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-500"
              placeholder="e.g., 85000"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Warranty Status</label>
            <select 
              name="warrantyStatus"
              value={formData.warrantyStatus}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500/50 text-slate-200"
            >
              <option value="UNSURE">Unsure</option>
              <option value="IN_WARRANTY">In Warranty</option>
              <option value="OUT_OF_WARRANTY">Out of Warranty</option>
            </select>
          </div>
          {formData.warrantyStatus === 'IN_WARRANTY' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Warranty Expiry Date</label>
              <input 
                type="date"
                name="warrantyExpiry"
                value={formData.warrantyExpiry}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500/50 text-slate-200"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Prior Repairs</label>
            <select 
              name="priorRepairs"
              value={formData.priorRepairs}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500/50 text-slate-200"
            >
              <option value="NONE">None</option>
              <option value="1">1 Repair</option>
              <option value="2+">2 or more Repairs</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Daily Usage Intensity</label>
            <select 
              name="usageIntensity"
              value={formData.usageIntensity}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500/50 text-slate-200"
            >
              <option value="LIGHT">Light (1-2 hours)</option>
              <option value="MODERATE">Moderate (3-5 hours)</option>
              <option value="HEAVY">Heavy (6+ hours)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Maximum amount you're willing to spend (Budget in INR) - Optional</label>
          <input 
            type="number"
            name="budgetINR"
            value={formData.budgetINR}
            onChange={handleChange}
            min="0"
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-500"
            placeholder="e.g., 5000"
          />
        </div>

        <button 
          type="submit"
          disabled={!isFormValid}
          className="flex items-center justify-center gap-2 w-full min-h-[56px] p-4 mt-8 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
        >
          <span>Continue to Diagnosis</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn, signUp, confirmSignUp } from 'aws-amplify/auth';
import { ShieldCheck, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const location = useLocation();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let signInResult;
      if (needsConfirmation) {
        await confirmSignUp({ username: email, confirmationCode: code });
        signInResult = await signIn({ username: email, password });
      } else if (isLogin) {
        signInResult = await signIn({ username: email, password });
      } else {
        await signUp({
          username: email,
          password,
          options: { userAttributes: { email } },
        });
        setNeedsConfirmation(true);
        setLoading(false);
        return;
      }

      if (signInResult && signInResult.isSignedIn) {
        const state = location.state as any;
        const from = state?.from ? `${state.from.pathname}${state.from.search}` : '/';
        navigate(from, { replace: true });
      } else {
        // If signIn requires further steps (e.g., reset password), just log it for now
        console.warn('Sign in requires further steps', signInResult);
        setError('Please complete the authentication steps.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold">
          {needsConfirmation ? 'Verify Email' : isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-400 text-sm">
          {needsConfirmation 
            ? 'We sent a verification code to your email.' 
            : isLogin 
              ? 'Sign in to access your repair history.' 
              : 'Join to save your devices and diagnoses.'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/10">
        {!needsConfirmation ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-12 py-3 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-white placeholder:text-slate-600"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-12 py-3 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-white placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Verification Code</label>
            <input 
              type="text" 
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-white placeholder:text-slate-600 text-center tracking-widest font-mono text-lg"
              placeholder="123456"
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold py-3.5 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {needsConfirmation ? 'Verify & Sign In' : isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {!needsConfirmation && (
          <div className="text-center pt-2">
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

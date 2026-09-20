import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api, sessionStore } from '../lib/api';

export default function AnalyzingState() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = sessionStore.getSessionId();
    const storedAnswers = sessionStorage.getItem('answers');
    
    if (!sessionId || !storedAnswers) {
      navigate('/');
      return;
    }

    const answers = JSON.parse(storedAnswers);

    api.analyzeDiagnosis(sessionId, answers)
      .then((res) => {
        const result = res.data;
        
        if (result.status === 'NEEDS_INFO') {
          const currentQs = sessionStore.getQuestions();
          sessionStore.setQuestions([...currentQs, ...result.newQuestions]);
          navigate('/interview');
          return;
        }

        sessionStorage.setItem('diagnosisResult', JSON.stringify(result));
        
        // Save to history before navigating
        console.log('[AnalyzingState] Attempting to save repair history for session:', sessionId);
        api.saveRepairHistory(sessionId)
          .then((res) => {
            console.log('[AnalyzingState] History save SUCCESS. Response:', res);
          })
          .catch((err) => {
            console.error('[AnalyzingState] Failed to save history. Error:', err);
          })
          .finally(() => {
            if (result.safetyWarning) {
              navigate('/safety-warning');
            } else {
              navigate('/result');
            }
          });
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || 'Analysis failed. Please try again.');
      });
  }, [navigate]);

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-[60vh] space-y-6 animate-in fade-in duration-700">
      <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold animate-pulse">AI is analyzing symptoms...</h2>
        <p className="text-slate-400 text-sm">Checking repair databases and cost estimates</p>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
}

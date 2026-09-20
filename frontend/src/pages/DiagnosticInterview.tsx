import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionStore } from '../lib/api';
import { ArrowRight, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export default function DiagnosticInterview() {
  const navigate = useNavigate();
  const questions = sessionStore.getQuestions();
  
  const [answers, setAnswers] = useState<Record<string, boolean>>(() => {
    const saved = sessionStorage.getItem('answers');
    return saved ? JSON.parse(saved) : {};
  });

  const initialIndex = Object.keys(answers).length;
  // If we already answered all questions, don't overshoot
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= questions.length ? Math.max(0, questions.length - 1) : initialIndex);

  // If no questions loaded, redirect to start
  if (!questions || questions.length === 0) {
    navigate('/device');
    return null;
  }


  const currentQ = questions[currentIndex];

  const handleAnswer = (value: boolean) => {
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Done. Save answers and go to analyzing state
      sessionStorage.setItem('answers', JSON.stringify(newAnswers));
      navigate('/analyzing');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm font-medium text-emerald-500">
          <span>Question {currentIndex + 1} of {questions.length}</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-[clamp(1.25rem,3vw,1.5rem)] font-bold">{currentQ.text}</h2>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => handleAnswer(true)}
            className="flex flex-col items-center justify-center p-6 min-h-[44px] rounded-2xl bg-white/5 border border-white/10 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors"
          >
            <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" />
            <span className="font-semibold">Yes</span>
          </button>
          <button 
            onClick={() => handleAnswer(false)}
            className="flex flex-col items-center justify-center p-6 min-h-[44px] rounded-2xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
          >
            <XCircle className="w-8 h-8 mb-2 text-red-400" />
            <span className="font-semibold">No</span>
          </button>
        </div>
        <button 
          onClick={() => handleAnswer(false)}
          className="w-full p-4 min-h-[44px] rounded-2xl bg-white/5 border border-white/10 text-left font-medium hover:bg-white/10 focus:bg-emerald-500/20 focus:border-emerald-500/50 transition-colors"
        >
          Not Sure
        </button>
      </div>

      <div className="flex gap-4">
        {currentIndex > 0 && (
          <button 
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <button 
          onClick={() => {
            sessionStorage.setItem('answers', JSON.stringify(answers));
            navigate('/analyzing');
          }}
          className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-colors"
        >
          <span>Skip to Analysis</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

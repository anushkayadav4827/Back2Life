import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import DeviceSelection from './pages/DeviceSelection';
import DeviceIntake from './pages/DeviceIntake';
import ProblemDescription from './pages/ProblemDescription';
import DiagnosticInterview from './pages/DiagnosticInterview';
import AnalyzingState from './pages/AnalyzingState';
import SafetyWarning from './pages/SafetyWarning';
import DiagnosisResult from './pages/DiagnosisResult';
import RepairabilityScore from './pages/RepairabilityScore';
import RepairVsReplace from './pages/RepairVsReplace';
import ProviderNetwork from './pages/ProviderNetwork';
import RepairHistory from './pages/RepairHistory';

import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import Auth from './pages/Auth';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
        <header className="border-b border-white/10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto p-4 md:px-8 flex items-center justify-between">
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              BACK2LIFE
            </Link>
            <div className="flex gap-4 items-center">
              <Link to="/history" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                History
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 md:p-8 relative min-h-[calc(100vh-64px)]">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected Routes */}
              <Route path="/device" element={<ProtectedRoute><DeviceSelection /></ProtectedRoute>} />
              <Route path="/intake" element={<ProtectedRoute><DeviceIntake /></ProtectedRoute>} />
              <Route path="/problem" element={<ProtectedRoute><ProblemDescription /></ProtectedRoute>} />
              <Route path="/interview" element={<ProtectedRoute><DiagnosticInterview /></ProtectedRoute>} />
              <Route path="/analyzing" element={<ProtectedRoute><AnalyzingState /></ProtectedRoute>} />
              <Route path="/safety-warning" element={<ProtectedRoute><SafetyWarning /></ProtectedRoute>} />
              <Route path="/result" element={<ProtectedRoute><DiagnosisResult /></ProtectedRoute>} />
              <Route path="/score" element={<ProtectedRoute><RepairabilityScore /></ProtectedRoute>} />
              <Route path="/compare" element={<ProtectedRoute><RepairVsReplace /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><RepairHistory /></ProtectedRoute>} />
              
              {/* Public */}
              <Route path="/providers" element={<ProviderNetwork />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </Router>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewDiagnosisPage from './pages/NewDiagnosisPage';
import MedicationLookupPage from './pages/MedicationLookupPage';
import PharmacyLocatorPage from './pages/PharmacyLocatorPage';
import PatientsPage from './pages/PatientsPage';
import UsersPage from './pages/UsersPage';
import DiagnosesPage from './pages/DiagnosesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MonitoringPage from './pages/MonitoringPage';
import HealthTrackerPage from './pages/HealthTrackerPage';
import FitnessTrackerPage from './pages/FitnessTrackerPage';
import InsurancePage from './pages/InsurancePage';
import MyDoctorPage from './pages/MyDoctorPage';
import OnboardingPage from './pages/OnboardingPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboarding_completed === false) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.onboarding_completed === false ? '/onboarding' : '/'} replace />;
  return <>{children}</>;
}

function OnboardingRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboarding_completed !== false) return <Navigate to="/" replace />;
  return <OnboardingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/onboarding" element={<OnboardingRoute />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="new-diagnosis" element={<NewDiagnosisPage />} />
            <Route path="medication-lookup" element={<MedicationLookupPage />} />
            <Route path="find-pharmacy" element={<PharmacyLocatorPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="diagnoses" element={<DiagnosesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="health-tracker" element={<HealthTrackerPage />} />
            <Route path="my-doctor" element={<MyDoctorPage />} />
            <Route path="fitness-tracker" element={<FitnessTrackerPage />} />
            <Route path="insurance" element={<InsurancePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

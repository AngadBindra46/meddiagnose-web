import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Stethoscope, Loader2, ShieldCheck, UserCog, HeartPulse, Key } from 'lucide-react';

const ROLES = [
  {
    id: 'admin',
    label: 'Admin',
    description: 'Platform analytics, user management & system monitoring',
    icon: ShieldCheck,
    gradient: 'from-violet-500 to-indigo-600',
    ring: 'ring-violet-400',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
  },
  {
    id: 'doctor',
    label: 'Doctor',
    description: 'Review patient diagnoses, validate AI results & prescriptions',
    icon: UserCog,
    gradient: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  {
    id: 'patient',
    label: 'Patient',
    description: 'Upload reports, view diagnoses, track symptoms & chat with AI',
    icon: HeartPulse,
    gradient: 'from-blue-500 to-cyan-600',
    ring: 'ring-blue-400',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
] as const;

function getAuthBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:8001/api/v1';
  const origin = window.location.origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';
  }
  return import.meta.env.VITE_API_BASE_URL || '/api/v1';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('patient');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Show session expired message when redirected after 401
  const sessionExpired = searchParams.get('session_expired') === '1';

  // Handle SSO callback: URL has access_token after Google/Keycloak redirect
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const needsOnboarding = searchParams.get('onboarding') === '1';
    if (accessToken) {
      setLoading(true);
      setError('');
      loginWithToken(accessToken, refreshToken ?? undefined)
        .then((u) => {
          setSearchParams({});
          navigate(needsOnboarding ? '/onboarding' : '/');
        })
        .catch((err) => setError(err.message || 'SSO login failed'))
        .finally(() => setLoading(false));
    }
  }, [searchParams, loginWithToken, setSearchParams, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role !== selectedRole) {
        setSelectedRole(user.role);
        setError(`Your account is registered as ${user.role === 'admin' ? 'Admin' : user.role === 'doctor' ? 'Doctor' : 'Patient'}. We've selected it for you — please sign in again.`);
        setLoading(false);
        return;
      }
      navigate('/');
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 404) {
        setError('API server not reachable. Start the backend: cd backend && python -m uvicorn app.main:app --port 8001');
      } else {
        setError(typeof detail === 'string' ? detail : err.message || 'Login failed');
      }
    }
    setLoading(false);
  };

  const active = ROLES.find((r) => r.id === selectedRole)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 mb-4">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">MedDiagnose</h1>
          <p className="text-blue-200/60 mt-1">Health Dashboard</p>
        </div>

        {/* Role Selection */}
        <div className="mb-6">
          <p className="text-sm text-slate-300 text-center mb-2 font-medium">Sign in as</p>
          <p className="text-xs text-slate-400 text-center mb-4">Not sure? Most users sign in as Patient.</p>
          <div className="grid grid-cols-3 gap-3">
            {ROLES.map((role) => {
              const isActive = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`
                    relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer
                    ${isActive
                      ? `border-transparent bg-gradient-to-br ${role.gradient} shadow-lg shadow-${role.id === 'admin' ? 'violet' : role.id === 'doctor' ? 'emerald' : 'blue'}-500/30 scale-[1.03]`
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'}
                  `}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : role.bg}`}>
                    <role.icon className={`w-5 h-5 ${isActive ? 'text-white' : role.text}`} />
                  </div>
                  <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {role.label}
                  </span>
                  <span className={`text-[10px] leading-tight text-center ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                    {role.description}
                  </span>
                  {isActive && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                      <svg className={`w-3 h-3 ${role.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          {sessionExpired && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              Your session has expired. Please sign in again to continue.
            </div>
          )}

          {/* Keycloak as default / primary */}
          <a
            href={`${getAuthBase()}/auth/keycloak/login?client=${selectedRole}`}
            className={`w-full py-3.5 px-4 flex items-center justify-center gap-2 rounded-xl border-2 transition-all font-semibold bg-gradient-to-r ${active.gradient} text-white hover:shadow-lg border-transparent`}
          >
            <Key className="w-5 h-5" />
            Sign in with Keycloak
          </a>
          {['patient', 'doctor'].includes(selectedRole) && (
            <a
              href={`${getAuthBase()}/auth/keycloak/login?client=${selectedRole}&register=1`}
              className="w-full py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-slate-600 font-medium text-sm"
            >
              Create account with Keycloak
            </a>
          )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">or sign in with email</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in...' : 'Sign in with email'}
          </button>

          <a
            href={`${getAuthBase()}/auth/google/login`}
            className="w-full py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-slate-600 font-medium text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </a>

          <p className="text-xs text-slate-400 text-center">
            Keycloak is the default. Token from Keycloak grants access to all pages.
          </p>
          <p className="text-xs text-slate-400 text-center pt-2">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

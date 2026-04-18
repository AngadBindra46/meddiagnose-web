import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LayoutDashboard, Users, FileHeart, BarChart3, Activity, LogOut, Menu, X, Stethoscope, UserSearch, FilePlus2, Pill, MapPin, HeartPulse, Dumbbell, Shield } from 'lucide-react';
import { useState } from 'react';

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles: string[] };

/** Patient-centric: My health, get diagnosis, care tools */
const PATIENT_NAV: NavItem[] = [
  { to: '/', label: 'My Health', icon: LayoutDashboard, roles: ['patient'] },
  { to: '/my-doctor', label: 'My Doctor', icon: Stethoscope, roles: ['patient'] },
  { to: '/new-diagnosis', label: 'Get Diagnosis', icon: FilePlus2, roles: ['patient'] },
  { to: '/diagnoses', label: 'My Diagnoses', icon: FileHeart, roles: ['patient'] },
  { to: '/health-tracker', label: 'Health Tracker', icon: HeartPulse, roles: ['patient'] },
  { to: '/fitness-tracker', label: 'Fitness Tracker', icon: Dumbbell, roles: ['patient'] },
  { to: '/medication-lookup', label: 'Medication Lookup', icon: Pill, roles: ['patient'] },
  { to: '/find-pharmacy', label: 'Find Pharmacy', icon: MapPin, roles: ['patient'] },
  { to: '/insurance', label: 'Insurance & Claims', icon: Shield, roles: ['patient'] },
];

/** Doctor-centric: Patients, diagnoses, clinical tools */
const DOCTOR_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['doctor'] },
  { to: '/patients', label: 'Patients', icon: UserSearch, roles: ['doctor'] },
  { to: '/diagnoses', label: 'Diagnoses', icon: FileHeart, roles: ['doctor'] },
  { to: '/new-diagnosis', label: 'New Diagnosis', icon: FilePlus2, roles: ['doctor'] },
  { to: '/medication-lookup', label: 'Medication Lookup', icon: Pill, roles: ['doctor'] },
  { to: '/find-pharmacy', label: 'Find Pharmacy', icon: MapPin, roles: ['doctor'] },
  { to: '/health-tracker', label: 'Health Tracker', icon: HeartPulse, roles: ['doctor'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['doctor'] },
];

/** Admin: full platform control */
const ADMIN_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { to: '/users', label: 'User Management', icon: Users, roles: ['admin'] },
  { to: '/patients', label: 'Patients', icon: UserSearch, roles: ['admin'] },
  { to: '/diagnoses', label: 'Diagnoses', icon: FileHeart, roles: ['admin'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
  { to: '/monitoring', label: 'System Monitoring', icon: Activity, roles: ['admin'] },
  { to: '/medication-lookup', label: 'Medication Lookup', icon: Pill, roles: ['admin'] },
  { to: '/find-pharmacy', label: 'Find Pharmacy', icon: MapPin, roles: ['admin'] },
  { to: '/insurance', label: 'Insurance & Claims', icon: Shield, roles: ['admin'] },
  { to: '/health-tracker', label: 'Health Tracker', icon: HeartPulse, roles: ['admin'] },
  { to: '/fitness-tracker', label: 'Fitness Tracker', icon: Dumbbell, roles: ['admin'] },
  { to: '/new-diagnosis', label: 'New Diagnosis', icon: FilePlus2, roles: ['admin'] },
];

function getNavForRole(role: string): NavItem[] {
  if (role === 'admin') return ADMIN_NAV;
  if (role === 'doctor') return DOCTOR_NAV;
  return PATIENT_NAV;
}

const THEME = {
  patient: { accent: 'blue', bg: 'bg-blue-600', shadow: 'shadow-blue-600/30', badge: 'bg-blue-600/20 text-blue-400' },
  doctor: { accent: 'emerald', bg: 'bg-emerald-600', shadow: 'shadow-emerald-600/30', badge: 'bg-emerald-600/20 text-emerald-400' },
  admin: { accent: 'violet', bg: 'bg-violet-600', shadow: 'shadow-violet-600/30', badge: 'bg-violet-600/20 text-violet-400' },
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = user?.role || 'patient';
  const theme = THEME[role as keyof typeof THEME] || THEME.patient;
  const NAV = getNavForRole(role);

  const handleLogout = () => { logout(); navigate('/login'); };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
      isActive ? `${theme.bg} text-white shadow-lg ${theme.shadow}` : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
    }`;

  const portalLabel = role === 'admin' ? 'Admin Panel' : role === 'doctor' ? 'Doctor Portal' : 'Patient Portal';

  const sidebar = (
    <div className="flex flex-col h-full bg-slate-900 w-64 p-4">
      <div className="flex items-center gap-3 px-4 py-5 mb-4">
        <div className={`w-10 h-10 rounded-xl ${theme.bg} flex items-center justify-center`}>
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">MedDiagnose</h1>
          <p className="text-slate-400 text-xs">{portalLabel}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkClass} onClick={() => setSidebarOpen(false)}>
            <n.icon className="w-5 h-5" />
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-700/50 pt-4 mt-4">
        <div className="px-4 pb-3">
          <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
          <p className="text-slate-400 text-xs truncate">{user?.email}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${theme.badge}`}>
            {user?.role}
          </span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30">{sidebar}</aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(true)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1 lg:flex-none lg:ml-auto flex items-center justify-between lg:justify-end gap-4">
            <div className="text-sm text-slate-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 hidden sm:inline truncate max-w-[140px]">{user?.full_name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

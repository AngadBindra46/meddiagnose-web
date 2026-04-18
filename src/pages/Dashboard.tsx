import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, healthAlertsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Users, FileHeart, MessageCircle, Activity, TrendingUp, Shield, AlertTriangle, Heart, Bell } from 'lucide-react';

interface Stats {
  users: { total: number; active: number; new_this_week: number };
  diagnoses: { total: number; this_week: number; this_month: number; avg_confidence: number; severity_distribution: Record<string, number> };
  engagement: { symptom_logs: number; chat_messages: number };
}

const SEV_COLORS: Record<string, string> = {
  mild: 'bg-emerald-100 text-emerald-700',
  moderate: 'bg-amber-100 text-amber-700',
  severe: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [alertsSummary, setAlertsSummary] = useState<{ total_active: number; critical: number; warning: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin' || user?.role === 'doctor';

  useEffect(() => {
    adminApi.stats().then((r) => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  useEffect(() => {
    healthAlertsApi.summary().then((r) => setAlertsSummary(r.data)).catch(() => {});
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!stats) return <div className="text-center text-slate-500 py-16">Failed to load dashboard data</div>;

  const adminCards = [
    { label: 'Total Users', value: stats.users.total, sub: `${stats.users.new_this_week} new this week`, icon: Users, color: 'bg-blue-500', light: 'bg-blue-50' },
    { label: 'Total Diagnoses', value: stats.diagnoses.total, sub: `${stats.diagnoses.this_week} this week`, icon: FileHeart, color: 'bg-emerald-500', light: 'bg-emerald-50' },
    { label: 'Avg. Confidence', value: `${Math.round(stats.diagnoses.avg_confidence * 100)}%`, sub: 'AI diagnosis accuracy', icon: TrendingUp, color: 'bg-violet-500', light: 'bg-violet-50' },
    { label: 'Active Users', value: stats.users.active, sub: `of ${stats.users.total} total`, icon: Activity, color: 'bg-amber-500', light: 'bg-amber-50' },
    { label: 'Symptom Logs', value: stats.engagement.symptom_logs, sub: 'Total tracked symptoms', icon: Heart, color: 'bg-pink-500', light: 'bg-pink-50' },
    { label: 'Chat Messages', value: stats.engagement.chat_messages, sub: 'AI assistant usage', icon: MessageCircle, color: 'bg-cyan-500', light: 'bg-cyan-50' },
  ];

  const patientCards = [
    { label: 'My Diagnoses', value: stats.diagnoses.total, sub: `${stats.diagnoses.this_week} this week`, icon: FileHeart, color: 'bg-emerald-500', light: 'bg-emerald-50' },
    { label: 'AI Accuracy', value: `${Math.round(stats.diagnoses.avg_confidence * 100)}%`, sub: 'Average confidence score', icon: TrendingUp, color: 'bg-violet-500', light: 'bg-violet-50' },
    { label: 'Symptoms Tracked', value: stats.engagement.symptom_logs, sub: 'Total logged symptoms', icon: Heart, color: 'bg-pink-500', light: 'bg-pink-50' },
    { label: 'AI Chat Messages', value: stats.engagement.chat_messages, sub: 'Questions asked', icon: MessageCircle, color: 'bg-cyan-500', light: 'bg-cyan-50' },
  ];

  const cards = isAdmin ? adminCards : patientCards;

  const sevTotal = Object.values(stats.diagnoses.severity_distribution).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {isAdmin ? 'Dashboard' : `Welcome, ${user?.full_name?.split(' ')[0]}`}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAdmin ? 'Overview of MedDiagnose platform activity' : 'Your health overview and diagnosis history'}
        </p>
      </div>

      {!isAdmin && alertsSummary && alertsSummary.total_active > 0 && (
        <Link
          to="/health-tracker?tab=alerts"
          className="block mb-6 p-4 rounded-2xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100">
              <Bell className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-800">
                {alertsSummary.total_active} health alert{alertsSummary.total_active !== 1 ? 's' : ''} need your attention
              </p>
              <p className="text-sm text-red-700 mt-0.5">
                {alertsSummary.critical > 0 && `${alertsSummary.critical} critical`}
                {alertsSummary.critical > 0 && alertsSummary.warning > 0 && ' • '}
                {alertsSummary.warning > 0 && `${alertsSummary.warning} warning`}
              </p>
            </div>
            <span className="text-red-600 font-medium">View alerts →</span>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{c.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{typeof c.value === 'number' ? c.value.toLocaleString() : c.value}</p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </div>
              <div className={`${c.light} p-3 rounded-xl`}>
                <c.icon className={`w-6 h-6 ${c.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Severity Distribution</h2>
          </div>
          {sevTotal > 0 ? (
            <div className="space-y-4">
              {Object.entries(stats.diagnoses.severity_distribution).map(([sev, count]) => (
                <div key={sev}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${SEV_COLORS[sev] || 'bg-slate-100 text-slate-600'}`}>{sev}</span>
                    <span className="text-slate-500">{count} ({Math.round((count / sevTotal) * 100)}%)</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${sev === 'mild' ? 'bg-emerald-500' : sev === 'moderate' ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${(count / sevTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No diagnosis data yet</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">Quick Stats</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.diagnoses.this_month}</p>
              <p className="text-xs text-slate-500 mt-1">{isAdmin ? 'Diagnoses this month' : 'My diagnoses this month'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.diagnoses.this_week}</p>
              <p className="text-xs text-slate-500 mt-1">{isAdmin ? 'Diagnoses this week' : 'My diagnoses this week'}</p>
            </div>
            {isAdmin && (
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {stats.users.total > 0 ? Math.round((stats.users.active / stats.users.total) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-500 mt-1">User retention rate</p>
              </div>
            )}
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {stats.diagnoses.total > 0 ? (stats.engagement.chat_messages / stats.diagnoses.total).toFixed(1) : 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">Avg chats per diagnosis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

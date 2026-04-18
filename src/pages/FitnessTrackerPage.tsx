import React, { useEffect, useState, useRef, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fitnessApi, wearableApi } from '../lib/api';
import {
  Dumbbell, Plus, Target, Flame, Footprints, Droplets, Moon, Activity, Loader2,
  Trash2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Calendar, Zap,
  TrendingUp, Award, Settings, Heart, Watch, Unplug, RefreshCw, Smartphone, Link2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from 'recharts';

interface FitnessLog {
  id: number;
  user_id: number;
  log_date: string;
  steps: number | null;
  calories_burned: number | null;
  active_minutes: number | null;
  distance_km: number | null;
  water_ml: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  workout_type: string | null;
  workout_duration_min: number | null;
  workout_intensity: string | null;
  weight_kg: number | null;
  mood: number | null;
  notes: string | null;
  created_at: string;
}

interface DailyProgress {
  date: string;
  steps: number;
  steps_goal: number;
  steps_pct: number;
  calories: number;
  calories_goal: number;
  calories_pct: number;
  active_minutes: number;
  active_minutes_goal: number;
  active_minutes_pct: number;
  water_ml: number;
  water_goal: number;
  water_pct: number;
  sleep_hours: number;
  sleep_goal: number;
  sleep_pct: number;
  workout_done: boolean;
  mood: number | null;
  weight_kg: number | null;
}

interface WeeklySummary {
  week_start: string;
  week_end: string;
  total_steps: number;
  avg_steps: number;
  total_calories: number;
  avg_calories: number;
  total_active_minutes: number;
  avg_active_minutes: number;
  total_water_ml: number;
  avg_water_ml: number;
  avg_sleep_hours: number;
  workout_count: number;
  workout_goal: number;
  workout_pct: number;
  days_logged: number;
  streak: number;
  avg_mood: number | null;
  weight_trend: { date: string; weight: number }[];
}

interface FitnessGoals {
  id: number;
  daily_steps: number | null;
  daily_calories: number | null;
  daily_active_minutes: number | null;
  daily_water_ml: number | null;
  daily_sleep_hours: number | null;
  weekly_workouts: number | null;
  target_weight_kg: number | null;
}

interface Dashboard {
  today: DailyProgress | null;
  goals: FitnessGoals | null;
  weekly: WeeklySummary | null;
  recent_logs: FitnessLog[];
  streak: number;
  total_logged_days: number;
}

const TABS = ['Dashboard', 'Log Activity', 'History', 'Goals', 'Devices'] as const;
type Tab = (typeof TABS)[number];

interface WearableConnection {
  id: number;
  provider: string;
  is_active: boolean;
  device_name: string | null;
  last_synced_at: string | null;
  created_at: string;
}

interface AvailableProvider {
  provider: string;
  name: string;
  description: string;
  icon: string;
  capabilities: string[];
  connected: boolean;
  requires_mobile: boolean;
}

interface SyncResultData {
  provider: string;
  days_synced: number;
  records_created: number;
  records_updated: number;
  message: string;
}

const WORKOUT_TYPES = [
  'Walking', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Gym / Weight Training',
  'HIIT', 'Pilates', 'Dance', 'Sports', 'Stretching', 'Other',
];

const PROVIDER_STYLES: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
  fitbit: {
    label: 'Fitbit',
    bg: 'bg-teal-100',
    icon: <Watch className="w-6 h-6 text-teal-600" />,
  },
  google_fit: {
    label: 'Google Fit',
    bg: 'bg-blue-100',
    icon: <Activity className="w-6 h-6 text-blue-600" />,
  },
  apple_health: {
    label: 'Apple Health',
    bg: 'bg-red-100',
    icon: <Heart className="w-6 h-6 text-red-500" />,
  },
  samsung_health: {
    label: 'Samsung Health',
    bg: 'bg-indigo-100',
    icon: <Watch className="w-6 h-6 text-indigo-600" />,
  },
  garmin: {
    label: 'Garmin',
    bg: 'bg-cyan-100',
    icon: <Watch className="w-6 h-6 text-cyan-600" />,
  },
};

const MOOD_EMOJI = ['', '😫', '😟', '😐', '🙂', '😄'];
const SLEEP_QUALITY_LABELS = ['', 'Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'];

export default function FitnessTrackerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('Dashboard');
  const autoSyncDone = useRef(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [logs, setLogs] = useState<FitnessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formValues, setFormValues] = useState<Record<string, string>>({
    log_date: new Date().toISOString().split('T')[0],
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Activity': true,
    'Workout': false,
    'Wellness': false,
  });

  const [goalValues, setGoalValues] = useState<Record<string, string>>({});
  const [savingGoals, setSavingGoals] = useState(false);

  // Wearable state
  const [wearableConnections, setWearableConnections] = useState<WearableConnection[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResultData | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [liveVitals, setLiveVitals] = useState<{
    heart_rate?: number | null;
    spo2?: number | null;
    steps_today?: number | null;
    active_minutes_today?: number | null;
    sleep_last_night?: number | null;
    weight_kg?: number | null;
    last_synced_at?: string | null;
    source_provider?: string | null;
  } | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fitnessApi.dashboard();
      setDashboard(res.data);
    } catch {
      setError('Failed to load dashboard');
    }
    setLoading(false);
  };

  const fetchLogs = async () => {
    try {
      const res = await fitnessApi.listLogs(1, 60, 60);
      setLogs(res.data.items);
    } catch {
      setError('Failed to load logs');
    }
  };

  const fetchConnections = async () => {
    try {
      const res = await wearableApi.connections();
      setWearableConnections(res.data.connections || []);
      setAvailableProviders(res.data.available_providers || []);
    } catch {
      /* non-critical */
    }
  };

  const fetchLiveVitals = async () => {
    try {
      const res = await wearableApi.liveVitals();
      setLiveVitals(res.data);
    } catch {
      /* non-critical */
    }
  };

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    try {
      const res = await wearableApi.connect(provider);
      window.location.href = res.data.auth_url;
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to connect ${provider}`);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Disconnect from ${provider}?`)) return;
    try {
      await wearableApi.disconnect(provider);
      fetchConnections();
      setSuccess('Device disconnected');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to disconnect');
    }
  };

  const handleSync = async (provider: string) => {
    setSyncing(provider);
    setSyncResult(null);
    try {
      const res = await wearableApi.sync(provider, 7);
      setSyncResult(res.data);
      setSuccess(res.data.message);
      fetchDashboard();
      fetchLogs();
      fetchConnections();
      fetchLiveVitals();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Sync failed for ${provider}`);
    }
    setSyncing(null);
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    setSyncResult(null);
    try {
      const res = await wearableApi.syncAll(7);
      setSyncResult(res.data.results?.[0] || res.data);
      setSuccess(res.data.message || 'All devices synced');
      fetchDashboard();
      fetchLogs();
      fetchConnections();
      fetchLiveVitals();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Sync failed');
    }
    setSyncingAll(false);
  };

  useEffect(() => {
    fetchDashboard();
    fetchLogs();
    fetchConnections();
    fetchLiveVitals();
  }, []);

  // When returning from Fitbit/Google Fit OAuth: backend may have already synced; if not, sync here
  useEffect(() => {
    const connected = searchParams.get('connected');
    const synced = searchParams.get('synced') === '1';
    if (!connected || autoSyncDone.current) return;
    if (connected !== 'fitbit' && connected !== 'google_fit') return;

    autoSyncDone.current = true;

    if (synced) {
      // Backend already imported data — just refresh and show success
      fetchDashboard();
      fetchLogs();
      fetchConnections();
      fetchLiveVitals();
      setSuccess(`Your ${connected === 'fitbit' ? 'Fitbit' : 'Google Fit'} data has been imported!`);
      setTimeout(() => setSuccess(''), 5000);
      setSearchParams((p) => { p.delete('connected'); p.delete('synced'); return p; });
      return;
    }

    const doAutoSync = async () => {
      setSyncing(connected);
      setSuccess(`Importing your ${connected === 'fitbit' ? 'Fitbit' : 'Google Fit'} data...`);
      try {
        const res = await wearableApi.sync(connected, 30);
        setSyncResult(res.data);
        setSuccess(res.data.message || `Imported ${res.data.records_created + res.data.records_updated} records from your device`);
        fetchDashboard();
        fetchLogs();
        fetchConnections();
        fetchLiveVitals();
        setTimeout(() => setSuccess(''), 6000);
      } catch (err: any) {
        setError(err.response?.data?.detail || `Failed to import from ${connected}`);
      }
      setSyncing(null);
      setSearchParams((p) => { p.delete('connected'); return p; });
    };
    doAutoSync();
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (dashboard?.goals) {
      const g = dashboard.goals;
      setGoalValues({
        daily_steps: String(g.daily_steps ?? 10000),
        daily_calories: String(g.daily_calories ?? 500),
        daily_active_minutes: String(g.daily_active_minutes ?? 30),
        daily_water_ml: String(g.daily_water_ml ?? 2500),
        daily_sleep_hours: String(g.daily_sleep_hours ?? 7.5),
        weekly_workouts: String(g.weekly_workouts ?? 4),
        target_weight_kg: g.target_weight_kg ? String(g.target_weight_kg) : '',
      });
    }
  }, [dashboard?.goals]);

  const handleLogSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload: Record<string, unknown> = { log_date: formValues.log_date };
      const intFields = ['steps', 'calories_burned', 'active_minutes', 'water_ml', 'sleep_quality', 'workout_duration_min', 'mood'];
      const floatFields = ['distance_km', 'sleep_hours', 'weight_kg'];
      const strFields = ['workout_type', 'workout_intensity', 'notes'];

      for (const key of intFields) {
        if (formValues[key]?.trim()) payload[key] = parseInt(formValues[key]);
      }
      for (const key of floatFields) {
        if (formValues[key]?.trim()) payload[key] = parseFloat(formValues[key]);
      }
      for (const key of strFields) {
        if (formValues[key]?.trim()) payload[key] = formValues[key];
      }

      await fitnessApi.createLog(payload);
      setSuccess('Activity logged successfully!');
      setFormValues({ log_date: new Date().toISOString().split('T')[0] });
      fetchDashboard();
      fetchLogs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save log');
    }
    setSaving(false);
  };

  const handleGoalsSave = async (e: FormEvent) => {
    e.preventDefault();
    setSavingGoals(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(goalValues)) {
        if (val?.trim()) {
          payload[key] = key === 'daily_sleep_hours' || key === 'target_weight_kg'
            ? parseFloat(val)
            : parseInt(val);
        }
      }
      await fitnessApi.upsertGoals(payload);
      setSuccess('Goals updated!');
      fetchDashboard();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save goals');
    }
    setSavingGoals(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this fitness log?')) return;
    try {
      await fitnessApi.deleteLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      fetchDashboard();
    } catch {
      setError('Failed to delete');
    }
  };

  const toggleGroup = (title: string) =>
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            Fitness Tracker
          </h1>
          <p className="text-slate-500 mt-1">Track workouts, steps, water, sleep, and more</p>
        </div>
        {dashboard && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1 text-emerald-600">
                <Zap className="w-4 h-4" />
                <span className="text-lg font-bold">{dashboard.streak}</span>
              </div>
              <span className="text-xs text-slate-400">day streak</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-700">{dashboard.total_logged_days}</div>
              <span className="text-xs text-slate-400">days logged</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'Dashboard' && <Activity className="w-4 h-4" />}
            {t === 'Log Activity' && <Plus className="w-4 h-4" />}
            {t === 'History' && <Calendar className="w-4 h-4" />}
            {t === 'Goals' && <Target className="w-4 h-4" />}
            {t === 'Devices' && <Watch className="w-4 h-4" />}
            {t}
          </button>
        ))}
      </div>

      {/* Onboarding: new user from registration — prompt to connect device */}
      {searchParams.get('onboarding') === '1' && wearableConnections.length === 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Watch className="w-5 h-5 text-blue-600" />
                Connect Your Fitness Device
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Link your Fitbit, Apple Watch, or Google Fit to automatically import steps, heart rate, sleep, and more into your fitness tracker.
              </p>
            </div>
            <button
              onClick={() => { setTab('Devices'); setSearchParams((p) => { p.delete('onboarding'); return p; }); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shrink-0"
            >
              <Link2 className="w-4 h-4" />
              Connect Device
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* ═══ Dashboard Tab ═══ */}
      {tab === 'Dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Live Vitals from Connected Devices */}
          {(liveVitals?.heart_rate != null || liveVitals?.spo2 != null || liveVitals?.steps_today != null || wearableConnections.length > 0) && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Live Health from Devices
                </h3>
                {wearableConnections.length > 0 && (
                  <button
                    onClick={handleSyncAll}
                    disabled={syncingAll}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {syncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {syncingAll ? 'Syncing...' : 'Sync All'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {liveVitals?.heart_rate != null && (
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-xs text-slate-500 font-medium">Heart Rate</p>
                    <p className="text-xl font-bold text-red-600">{Math.round(liveVitals.heart_rate)} <span className="text-sm font-normal text-slate-500">bpm</span></p>
                  </div>
                )}
                {liveVitals?.spo2 != null && (
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-xs text-slate-500 font-medium">Blood Oxygen</p>
                    <p className="text-xl font-bold text-cyan-600">{Math.round(liveVitals.spo2)}<span className="text-sm font-normal text-slate-500">%</span></p>
                  </div>
                )}
                {liveVitals?.steps_today != null && (
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-xs text-slate-500 font-medium">Steps Today</p>
                    <p className="text-xl font-bold text-blue-600">{liveVitals.steps_today.toLocaleString()}</p>
                  </div>
                )}
                {liveVitals?.sleep_last_night != null && (
                  <div className="bg-white/80 rounded-lg p-3">
                    <p className="text-xs text-slate-500 font-medium">Sleep Last Night</p>
                    <p className="text-xl font-bold text-indigo-600">{liveVitals.sleep_last_night}h</p>
                  </div>
                )}
                {wearableConnections.length > 0 && !liveVitals?.heart_rate && !liveVitals?.spo2 && !liveVitals?.steps_today && !liveVitals?.sleep_last_night && (
                  <div className="col-span-2 sm:col-span-4 bg-white/80 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-500">No live data yet. Click &quot;Sync All&quot; to fetch from your devices.</p>
                  </div>
                )}
              </div>
              {liveVitals?.last_synced_at && (
                <p className="text-xs text-slate-500 mt-2">
                  Last synced: {new Date(liveVitals.last_synced_at).toLocaleString()}
                  {liveVitals.source_provider && ` from ${PROVIDER_STYLES[liveVitals.source_provider]?.label || liveVitals.source_provider}`}
                </p>
              )}
            </div>
          )}

          {/* Today's Progress Rings */}
          {dashboard.today ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <ProgressCard icon={Footprints} label="Steps" value={dashboard.today.steps.toLocaleString()} pct={dashboard.today.steps_pct} goal={`/ ${dashboard.today.steps_goal.toLocaleString()}`} color="blue" />
              <ProgressCard icon={Flame} label="Calories" value={String(dashboard.today.calories)} pct={dashboard.today.calories_pct} goal={`/ ${dashboard.today.calories_goal} kcal`} color="orange" />
              <ProgressCard icon={Zap} label="Active Min" value={String(dashboard.today.active_minutes)} pct={dashboard.today.active_minutes_pct} goal={`/ ${dashboard.today.active_minutes_goal} min`} color="purple" />
              <ProgressCard icon={Droplets} label="Water" value={`${(dashboard.today.water_ml / 1000).toFixed(1)}L`} pct={dashboard.today.water_pct} goal={`/ ${(dashboard.today.water_goal / 1000).toFixed(1)}L`} color="cyan" />
              <ProgressCard icon={Moon} label="Sleep" value={`${dashboard.today.sleep_hours}h`} pct={dashboard.today.sleep_pct} goal={`/ ${dashboard.today.sleep_goal}h`} color="indigo" />
              <ProgressCard icon={Heart} label="Mood" value={dashboard.today.mood ? MOOD_EMOJI[dashboard.today.mood] : '—'} pct={dashboard.today.mood ? dashboard.today.mood * 20 : 0} goal="" color="pink" />
            </div>
          ) : (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 text-center">
              <Dumbbell className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-emerald-800">No activity logged today</p>
              <p className="text-sm text-emerald-600 mt-1">Go to "Log Activity" to record today's fitness data</p>
              <button onClick={() => setTab('Log Activity')} className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                Log Today's Activity
              </button>
            </div>
          )}

          {/* Weekly Summary */}
          {dashboard.weekly && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">This Week's Summary</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(dashboard.weekly.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' — '}
                    {new Date(dashboard.weekly.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                    <Zap className="w-4 h-4" /> {dashboard.weekly.streak} day streak
                  </span>
                  <span className="text-xs text-slate-400 px-2 py-1 bg-slate-100 rounded-full">{dashboard.weekly.days_logged} / 7 days</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
                <WeeklyStat label="Avg Steps" value={dashboard.weekly.avg_steps.toLocaleString()} icon={Footprints} color="text-blue-600" />
                <WeeklyStat label="Avg Calories" value={`${dashboard.weekly.avg_calories} kcal`} icon={Flame} color="text-orange-600" />
                <WeeklyStat label="Avg Active" value={`${dashboard.weekly.avg_active_minutes} min`} icon={Zap} color="text-purple-600" />
                <WeeklyStat label="Avg Sleep" value={`${dashboard.weekly.avg_sleep_hours}h`} icon={Moon} color="text-indigo-600" />
                <WeeklyStat label="Workouts" value={`${dashboard.weekly.workout_count} / ${dashboard.weekly.workout_goal}`} icon={Dumbbell} color="text-emerald-600" />
                <WeeklyStat label="Avg Water" value={`${(dashboard.weekly.avg_water_ml / 1000).toFixed(1)}L`} icon={Droplets} color="text-cyan-600" />
                <WeeklyStat label="Avg Mood" value={dashboard.weekly.avg_mood ? MOOD_EMOJI[Math.round(dashboard.weekly.avg_mood)] : '—'} icon={Heart} color="text-pink-600" />
                <WeeklyStat label="Total Steps" value={dashboard.weekly.total_steps.toLocaleString()} icon={Award} color="text-amber-600" />
              </div>
            </div>
          )}

          {/* Recent Activity Chart */}
          {dashboard.recent_logs.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-blue-600" /> Steps Trend
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[...dashboard.recent_logs].reverse().filter(l => l.steps != null).slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="log_date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(d: string) => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}`; }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={45} />
                    <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: '0.75rem', border: '1px solid #e2e8f0' }} labelFormatter={(d: unknown) => new Date(String(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                    <Bar dataKey="steps" radius={[4, 4, 0, 0]}>
                      {[...dashboard.recent_logs].reverse().filter(l => l.steps != null).slice(-14).map((entry, idx) => (
                        <Cell key={idx} fill={(entry.steps ?? 0) >= (dashboard.goals?.daily_steps ?? 10000) ? '#10b981' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-600" /> Sleep Trend
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={[...dashboard.recent_logs].reverse().filter(l => l.sleep_hours != null).slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="log_date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(d: string) => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}`; }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={35} domain={[0, 12]} />
                    <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: '0.75rem', border: '1px solid #e2e8f0' }} labelFormatter={(d: unknown) => new Date(String(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} formatter={(v: unknown) => [`${Number(v)}h`, 'Sleep']} />
                    <Line type="monotone" dataKey="sleep_hours" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Log Activity Tab ═══ */}
      {tab === 'Log Activity' && (
        <form onSubmit={handleLogSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formValues.log_date || ''}
                  onChange={(e) => setFormValues((p) => ({ ...p, log_date: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Activity Group */}
          <FormSection title="Activity" icon={Footprints} expanded={expandedGroups['Activity']} onToggle={() => toggleGroup('Activity')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField label="Steps" unit="steps" placeholder="8500" value={formValues.steps} onChange={(v) => setFormValues(p => ({ ...p, steps: v }))} />
              <FormField label="Calories Burned" unit="kcal" placeholder="350" value={formValues.calories_burned} onChange={(v) => setFormValues(p => ({ ...p, calories_burned: v }))} />
              <FormField label="Active Minutes" unit="min" placeholder="45" value={formValues.active_minutes} onChange={(v) => setFormValues(p => ({ ...p, active_minutes: v }))} />
              <FormField label="Distance" unit="km" placeholder="5.2" value={formValues.distance_km} onChange={(v) => setFormValues(p => ({ ...p, distance_km: v }))} step="0.1" />
            </div>
          </FormSection>

          {/* Workout Group */}
          <FormSection title="Workout" icon={Dumbbell} expanded={expandedGroups['Workout']} onToggle={() => toggleGroup('Workout')}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Workout Type</label>
                <select
                  value={formValues.workout_type || ''}
                  onChange={(e) => setFormValues(p => ({ ...p, workout_type: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Select...</option>
                  {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <FormField label="Duration" unit="min" placeholder="45" value={formValues.workout_duration_min} onChange={(v) => setFormValues(p => ({ ...p, workout_duration_min: v }))} />
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Intensity</label>
                <select
                  value={formValues.workout_intensity || ''}
                  onChange={(e) => setFormValues(p => ({ ...p, workout_intensity: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Select...</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="intense">Intense</option>
                </select>
              </div>
            </div>
          </FormSection>

          {/* Wellness Group */}
          <FormSection title="Wellness" icon={Heart} expanded={expandedGroups['Wellness']} onToggle={() => toggleGroup('Wellness')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField label="Water Intake" unit="ml" placeholder="2500" value={formValues.water_ml} onChange={(v) => setFormValues(p => ({ ...p, water_ml: v }))} />
              <FormField label="Sleep" unit="hours" placeholder="7.5" value={formValues.sleep_hours} onChange={(v) => setFormValues(p => ({ ...p, sleep_hours: v }))} step="0.5" />
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Sleep Quality</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(q => (
                    <button
                      type="button"
                      key={q}
                      onClick={() => setFormValues(p => ({ ...p, sleep_quality: String(q) }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        formValues.sleep_quality === String(q) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-center">
                  {formValues.sleep_quality ? SLEEP_QUALITY_LABELS[parseInt(formValues.sleep_quality)] : 'Rate 1-5'}
                </p>
              </div>
              <FormField label="Weight" unit="kg" placeholder="72.5" value={formValues.weight_kg} onChange={(v) => setFormValues(p => ({ ...p, weight_kg: v }))} step="0.1" />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">Mood</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(m => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setFormValues(p => ({ ...p, mood: String(m) }))}
                    className={`w-12 h-12 rounded-xl text-xl transition-all ${
                      formValues.mood === String(m) ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-110' : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    {MOOD_EMOJI[m]}
                  </button>
                ))}
              </div>
            </div>
          </FormSection>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <textarea
              value={formValues.notes || ''}
              onChange={(e) => setFormValues(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              placeholder="How did you feel today? Any achievements?"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {saving ? 'Saving...' : 'Save Activity Log'}
          </button>
        </form>
      )}

      {/* ═══ History Tab ═══ */}
      {tab === 'History' && (
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No activity logged yet</p>
              <p className="text-sm mt-1">Start logging your daily fitness activities</p>
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {new Date(log.log_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      {log.mood && <span className="text-lg">{MOOD_EMOJI[log.mood]}</span>}
                      {log.workout_type && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          {log.workout_type}
                          {log.workout_duration_min ? ` • ${log.workout_duration_min}min` : ''}
                          {log.workout_intensity ? ` • ${log.workout_intensity}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {log.steps != null && <LogBadge icon="👟" label={`${log.steps.toLocaleString()} steps`} />}
                      {log.calories_burned != null && <LogBadge icon="🔥" label={`${log.calories_burned} kcal`} />}
                      {log.active_minutes != null && <LogBadge icon="⚡" label={`${log.active_minutes} min active`} />}
                      {log.distance_km != null && <LogBadge icon="📏" label={`${log.distance_km} km`} />}
                      {log.water_ml != null && <LogBadge icon="💧" label={`${(log.water_ml / 1000).toFixed(1)}L water`} />}
                      {log.sleep_hours != null && <LogBadge icon="😴" label={`${log.sleep_hours}h sleep`} />}
                      {log.weight_kg != null && <LogBadge icon="⚖️" label={`${log.weight_kg} kg`} />}
                    </div>
                    {log.notes && <p className="text-xs text-slate-500 mt-2">{log.notes}</p>}
                  </div>
                  <button onClick={() => handleDelete(log.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ Goals Tab ═══ */}
      {tab === 'Goals' && (
        <form onSubmit={handleGoalsSave} className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-slate-400" /> Daily Goals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <GoalField icon={Footprints} label="Daily Steps" unit="steps" value={goalValues.daily_steps} onChange={(v) => setGoalValues(p => ({ ...p, daily_steps: v }))} placeholder="10000" />
              <GoalField icon={Flame} label="Daily Calories" unit="kcal" value={goalValues.daily_calories} onChange={(v) => setGoalValues(p => ({ ...p, daily_calories: v }))} placeholder="500" />
              <GoalField icon={Zap} label="Active Minutes" unit="min" value={goalValues.daily_active_minutes} onChange={(v) => setGoalValues(p => ({ ...p, daily_active_minutes: v }))} placeholder="30" />
              <GoalField icon={Droplets} label="Water Intake" unit="ml" value={goalValues.daily_water_ml} onChange={(v) => setGoalValues(p => ({ ...p, daily_water_ml: v }))} placeholder="2500" />
              <GoalField icon={Moon} label="Sleep Hours" unit="hours" value={goalValues.daily_sleep_hours} onChange={(v) => setGoalValues(p => ({ ...p, daily_sleep_hours: v }))} placeholder="7.5" />
              <GoalField icon={Dumbbell} label="Weekly Workouts" unit="/week" value={goalValues.weekly_workouts} onChange={(v) => setGoalValues(p => ({ ...p, weekly_workouts: v }))} placeholder="4" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-slate-400" /> Weight Goal
            </h3>
            <div className="max-w-xs">
              <GoalField icon={Target} label="Target Weight" unit="kg" value={goalValues.target_weight_kg} onChange={(v) => setGoalValues(p => ({ ...p, target_weight_kg: v }))} placeholder="70" />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingGoals}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {savingGoals ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
            {savingGoals ? 'Saving...' : 'Save Goals'}
          </button>
        </form>
      )}

      {/* ═══ Devices Tab ═══ */}
      {tab === 'Devices' && (
        <div className="space-y-6">
          {/* Sync All - when multiple devices connected */}
          {wearableConnections.length > 0 && (
            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-800">Live Patient Monitoring</h3>
                <p className="text-sm text-slate-500 mt-0.5">Sync all connected devices to get the latest health data</p>
              </div>
              <button
                onClick={handleSyncAll}
                disabled={syncingAll}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {syncingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                {syncingAll ? 'Syncing All...' : 'Sync All Devices'}
              </button>
            </div>
          )}

          {/* Connected Devices */}
          {wearableConnections.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-emerald-600" /> Connected Devices
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wearableConnections.map(conn => (
                  <div key={conn.id} className="bg-white rounded-xl border-2 border-emerald-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${PROVIDER_STYLES[conn.provider]?.bg || 'bg-slate-100'}`}>
                          {PROVIDER_STYLES[conn.provider]?.icon || <Watch className="w-6 h-6 text-slate-600" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-800">{PROVIDER_STYLES[conn.provider]?.label || conn.provider}</h4>
                          {conn.device_name && <p className="text-xs text-slate-500">{conn.device_name}</p>}
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                    </div>

                    {conn.last_synced_at && (
                      <p className="text-xs text-slate-400 mb-3">
                        Last synced: {new Date(conn.last_synced_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSync(conn.provider)}
                        disabled={syncing === conn.provider}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                      >
                        {syncing === conn.provider ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {syncing === conn.provider ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(conn.provider)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <Unplug className="w-4 h-4" /> Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sync Result */}
          {syncResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm font-medium text-emerald-800">{syncResult.message}</p>
              <div className="flex gap-4 mt-2 text-xs text-emerald-600">
                <span>{syncResult.records_created} new records</span>
                <span>{syncResult.records_updated} updated</span>
                <span>{syncResult.days_synced} days synced</span>
              </div>
            </div>
          )}

          {/* Available Providers */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Watch className="w-4 h-4 text-slate-400" /> Available Integrations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableProviders.map(provider => {
                const style = PROVIDER_STYLES[provider.provider];
                const isConnected = provider.connected;

                return (
                  <div key={provider.provider} className={`bg-white rounded-xl border p-5 transition-all ${isConnected ? 'border-emerald-200 opacity-75' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style?.bg || 'bg-slate-100'}`}>
                        {style?.icon || <Watch className="w-5 h-5 text-slate-600" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{provider.name}</h4>
                        {isConnected && <span className="text-[10px] font-medium text-emerald-600">Already connected</span>}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">{provider.description}</p>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {provider.capabilities.map(cap => (
                        <span key={cap} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">{cap.replace('_', ' ')}</span>
                      ))}
                    </div>

                    {isConnected ? (
                      <div className="text-center text-xs text-emerald-600 font-medium py-2">
                        <CheckCircle2 className="w-4 h-4 inline mr-1" /> Connected
                      </div>
                    ) : provider.requires_mobile ? (
                      <div className="text-center">
                        <p className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1">
                          <Smartphone className="w-3.5 h-3.5" /> Connect via mobile app
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {provider.provider === 'apple_health' && 'Open MedDiagnose on your iPhone to sync Apple Watch data'}
                          {provider.provider === 'samsung_health' && 'Use the MedDiagnose app on your Galaxy device to sync Samsung Health'}
                          {provider.provider === 'garmin' && 'Use the MedDiagnose app to sync from Garmin Connect'}
                          {!['apple_health', 'samsung_health', 'garmin'].includes(provider.provider) && 'Download the MedDiagnose mobile app to connect'}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConnect(provider.provider)}
                        disabled={connecting === provider.provider}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-60 transition-colors"
                      >
                        {connecting === provider.provider ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Link2 className="w-4 h-4" />
                        )}
                        {connecting === provider.provider ? 'Connecting...' : `Connect ${provider.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-3">How Device Sync Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Connect Your Device</p>
                  <p className="text-xs text-slate-500 mt-0.5">Fitbit & Google Fit: connect here. Apple Watch, Samsung, Garmin: use the mobile app</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-emerald-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Sync Your Data</p>
                  <p className="text-xs text-slate-500 mt-0.5">Steps, calories, sleep, heart rate, and weight are automatically pulled</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-purple-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Track & Analyze</p>
                  <p className="text-xs text-slate-500 mt-0.5">View trends, hit daily goals, and share data with your doctor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function ProgressCard({ icon: Icon, label, value, pct, goal, color }: {
  icon: any; label: string; value: string; pct: number; goal: string; color: string;
}) {
  const colorMap: Record<string, { ring: string; bg: string; text: string }> = {
    blue: { ring: 'stroke-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
    orange: { ring: 'stroke-orange-500', bg: 'bg-orange-50', text: 'text-orange-600' },
    purple: { ring: 'stroke-purple-500', bg: 'bg-purple-50', text: 'text-purple-600' },
    cyan: { ring: 'stroke-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-600' },
    indigo: { ring: 'stroke-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    pink: { ring: 'stroke-pink-500', bg: 'bg-pink-50', text: 'text-pink-600' },
  };
  const c = colorMap[color] || colorMap.blue;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center text-center">
      <div className="relative w-20 h-20 mb-2">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="5" />
          <circle cx="40" cy="40" r={radius} fill="none" className={c.ring} strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
      <div className="text-lg font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-400">{goal}</div>
      <div className="text-[10px] font-semibold text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function WeeklyStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
      <Icon className={`w-5 h-5 ${color} shrink-0`} />
      <div>
        <div className="text-sm font-semibold text-slate-800">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function FormSection({ title, icon: Icon, expanded, onToggle, children }: {
  title: string; icon: any; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Icon className="w-5 h-5 text-emerald-600" /> {title}
        </h3>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      {expanded && <div className="px-6 pb-5 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
}

function FormField({ label, unit, placeholder, value, onChange, step }: {
  label: string; unit: string; placeholder: string; value: string | undefined; onChange: (v: string) => void; step?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label} <span className="text-slate-400">({unit})</span>
      </label>
      <input
        type="number"
        step={step || 'any'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
    </div>
  );
}

function GoalField({ icon: Icon, label, unit, value, onChange, placeholder }: {
  icon: any; label: string; unit: string; value: string | undefined; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
        <Icon className="w-3.5 h-3.5" /> {label} <span className="text-slate-400">({unit})</span>
      </label>
      <input
        type="number"
        step="any"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
    </div>
  );
}

function LogBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
    </span>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { healthTrackerApi, healthAlertsApi } from '../lib/api';
import {
  HeartPulse, Plus, GitCompareArrows, TrendingUp, TrendingDown, Minus, Loader2,
  Trash2, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Calendar, ClipboardList, Activity, Bell, Check,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea,
} from 'recharts';

interface HealthReport {
  id: number;
  user_id: number;
  report_date: string;
  title: string | null;
  notes: string | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  heart_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  weight: number | null;
  fasting_blood_sugar: number | null;
  post_prandial_blood_sugar: number | null;
  hba1c: number | null;
  total_cholesterol: number | null;
  hdl_cholesterol: number | null;
  ldl_cholesterol: number | null;
  triglycerides: number | null;
  hemoglobin: number | null;
  serum_creatinine: number | null;
  tsh: number | null;
  vitamin_d: number | null;
  uric_acid: number | null;
  created_at: string;
}

interface MetricChange {
  metric: string;
  label: string;
  unit: string;
  old_value: number | null;
  new_value: number | null;
  change: number | null;
  percent_change: number | null;
  status: string;
  old_status: string | null;
  new_status: string | null;
}

interface Comparison {
  older_report: HealthReport;
  newer_report: HealthReport;
  changes: MetricChange[];
  summary: string;
  improved_count: number;
  worsened_count: number;
  stable_count: number;
}

interface TrendDataPoint { date: string; value: number; }
interface MetricTrend {
  metric: string;
  label: string;
  unit: string;
  normal_min: number | null;
  normal_max: number | null;
  data: TrendDataPoint[];
}

const TABS = ['Add Report', 'History & Compare', 'Trends', 'Alerts'] as const;
type Tab = (typeof TABS)[number];

interface HealthAlert {
  id: number;
  metric: string;
  metric_label: string | null;
  value: number;
  unit: string | null;
  normal_min: number | null;
  normal_max: number | null;
  severity: string;
  status: string;
  message: string | null;
  source_type: string | null;
  created_at: string;
}

const METRIC_GROUPS = [
  {
    title: 'Vitals',
    fields: [
      { key: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', placeholder: '120' },
      { key: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg', placeholder: '80' },
      { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', placeholder: '72' },
      { key: 'spo2', label: 'SpO2', unit: '%', placeholder: '98' },
      { key: 'temperature', label: 'Temperature', unit: '°F', placeholder: '98.6' },
      { key: 'weight', label: 'Weight', unit: 'kg', placeholder: '70' },
    ],
  },
  {
    title: 'Blood Sugar',
    fields: [
      { key: 'fasting_blood_sugar', label: 'Fasting Blood Sugar', unit: 'mg/dL', placeholder: '90' },
      { key: 'post_prandial_blood_sugar', label: 'Post-Prandial Blood Sugar', unit: 'mg/dL', placeholder: '120' },
      { key: 'hba1c', label: 'HbA1c', unit: '%', placeholder: '5.5' },
    ],
  },
  {
    title: 'Lipid Profile',
    fields: [
      { key: 'total_cholesterol', label: 'Total Cholesterol', unit: 'mg/dL', placeholder: '180' },
      { key: 'hdl_cholesterol', label: 'HDL Cholesterol', unit: 'mg/dL', placeholder: '50' },
      { key: 'ldl_cholesterol', label: 'LDL Cholesterol', unit: 'mg/dL', placeholder: '90' },
      { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', placeholder: '130' },
    ],
  },
  {
    title: 'Blood & Other',
    fields: [
      { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', placeholder: '14' },
      { key: 'serum_creatinine', label: 'Serum Creatinine', unit: 'mg/dL', placeholder: '0.9' },
      { key: 'tsh', label: 'TSH', unit: 'mIU/L', placeholder: '2.0' },
      { key: 'vitamin_d', label: 'Vitamin D', unit: 'ng/mL', placeholder: '40' },
      { key: 'uric_acid', label: 'Uric Acid', unit: 'mg/dL', placeholder: '5.5' },
    ],
  },
];

const STATUS_CLS: Record<string, string> = {
  improved: 'text-emerald-600 bg-emerald-50',
  worsened: 'text-red-600 bg-red-50',
  stable: 'text-slate-600 bg-slate-50',
  new: 'text-blue-600 bg-blue-50',
  removed: 'text-slate-400 bg-slate-50',
};

const VALUE_STATUS_CLS: Record<string, string> = {
  normal: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  high: 'text-red-700 bg-red-50 border-red-200',
  low: 'text-amber-700 bg-amber-50 border-amber-200',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function HealthTrackerPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return (TABS.includes(t as Tab) ? t : 'Add Report') as Tab;
  });
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [alertsUnread, setAlertsUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Report state
  const [formValues, setFormValues] = useState<Record<string, string>>({ report_date: new Date().toISOString().split('T')[0] });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ Vitals: true });

  // Compare state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [comparing, setComparing] = useState(false);

  // Trends state
  const [trends, setTrends] = useState<MetricTrend[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['systolic_bp', 'fasting_blood_sugar', 'hemoglobin']);
  const [loadingTrends, setLoadingTrends] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await healthTrackerApi.list(1, 50);
      setReports(res.data.items);
    } catch { setError('Failed to load reports'); }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && TABS.includes(t as Tab)) setTab(t as Tab);
  }, [searchParams]);
  useEffect(() => {
    if (tab === 'Alerts') {
      healthAlertsApi.list().then((r) => {
        setAlerts(r.data.items);
        setAlertsUnread(r.data.unread_count);
      });
    }
  }, [tab]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload: Record<string, unknown> = { report_date: formValues.report_date };
      if (formValues.title) payload.title = formValues.title;
      if (formValues.notes) payload.notes = formValues.notes;
      for (const group of METRIC_GROUPS) {
        for (const f of group.fields) {
          const val = formValues[f.key];
          if (val && val.trim()) payload[f.key] = parseFloat(val);
        }
      }
      await healthTrackerApi.create(payload);
      setSuccess('Report saved successfully!');
      setFormValues({ report_date: new Date().toISOString().split('T')[0] });
      fetchReports();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save report');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this report?')) return;
    try {
      await healthTrackerApi.remove(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch { setError('Failed to delete report'); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const runComparison = async () => {
    if (selectedIds.length < 2) return;
    setComparing(true);
    setComparison(null);
    try {
      const res = await healthTrackerApi.compare(selectedIds[0], selectedIds[1]);
      setComparison(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Comparison failed');
    }
    setComparing(false);
  };

  const runLatestComparison = async () => {
    setComparing(true);
    setComparison(null);
    try {
      const res = await healthTrackerApi.latestComparison();
      setComparison(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Need at least 2 reports to compare');
    }
    setComparing(false);
  };

  const fetchTrends = async () => {
    setLoadingTrends(true);
    try {
      const res = await healthTrackerApi.trends(selectedMetrics.length ? selectedMetrics : undefined);
      setTrends(res.data.trends);
    } catch { setError('Failed to load trends'); }
    setLoadingTrends(false);
  };

  useEffect(() => {
    if (tab === 'Trends') fetchTrends();
  }, [tab, selectedMetrics]);

  const filledMetrics = (report: HealthReport) => {
    let count = 0;
    for (const group of METRIC_GROUPS)
      for (const f of group.fields)
        if ((report as any)[f.key] != null) count++;
    return count;
  };

  const toggleGroup = (title: string) =>
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  const toggleTrendMetric = (metric: string) =>
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric],
    );

  const allMetricOptions = METRIC_GROUPS.flatMap((g) => g.fields.map((f) => ({ key: f.key, label: f.label })));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            Health Tracker
          </h1>
          <p className="text-slate-500 mt-1">Track your health metrics over time and compare reports</p>
        </div>
        <div className="text-sm text-slate-500">{reports.length} report{reports.length !== 1 ? 's' : ''} recorded</div>
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
            {t === 'Add Report' && <Plus className="w-4 h-4" />}
            {t === 'History & Compare' && <GitCompareArrows className="w-4 h-4" />}
            {t === 'Trends' && <Activity className="w-4 h-4" />}
            {t === 'Alerts' && <Bell className="w-4 h-4" />}
            {t === 'Alerts' && alertsUnread > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">{alertsUnread}</span>
            )}
            {t}
          </button>
        ))}
      </div>

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

      {/* Tab: Add Report */}
      {tab === 'Add Report' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Date *</label>
                <input
                  type="date"
                  required
                  value={formValues.report_date || ''}
                  onChange={(e) => setFormValues((p) => ({ ...p, report_date: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={formValues.title || ''}
                  onChange={(e) => setFormValues((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Monthly checkup, Blood test results"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {METRIC_GROUPS.map((group) => (
            <div key={group.title} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <h3 className="font-semibold text-slate-800">{group.title}</h3>
                {expandedGroups[group.title] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              {expandedGroups[group.title] && (
                <div className="px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                  {group.fields.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {f.label} <span className="text-slate-400">({f.unit})</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formValues[f.key] || ''}
                        onChange={(e) => setFormValues((p) => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <textarea
              value={formValues.notes || ''}
              onChange={(e) => setFormValues((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder="Any additional notes about this report..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3 rounded-xl font-medium hover:from-rose-600 hover:to-pink-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {saving ? 'Saving...' : 'Save Health Report'}
          </button>
        </form>
      )}

      {/* Tab: History & Compare */}
      {tab === 'History & Compare' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={runLatestComparison}
              disabled={reports.length < 2 || comparing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <GitCompareArrows className="w-4 h-4" /> Quick Compare (Latest 2)
            </button>
            {selectedIds.length === 2 && (
              <button
                onClick={runComparison}
                disabled={comparing}
                className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
              >
                <GitCompareArrows className="w-4 h-4" /> Compare Selected
              </button>
            )}
            {selectedIds.length > 0 && selectedIds.length < 2 && (
              <span className="text-sm text-slate-500">Select one more report to compare</span>
            )}
          </div>

          {comparing && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}

          {comparison && !comparing && <ComparisonPanel comparison={comparison} />}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No reports yet</p>
              <p className="text-sm mt-1">Add your first health report to start tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`bg-white rounded-xl border-2 transition-all ${
                    selectedIds.includes(report.id) ? 'border-blue-500 shadow-md shadow-blue-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    <button
                      onClick={() => toggleSelect(report.id)}
                      className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                        selectedIds.includes(report.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300 hover:border-blue-400'
                      }`}
                    >
                      {selectedIds.includes(report.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-800">
                          {new Date(report.report_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        {report.title && <span className="text-sm text-slate-500">— {report.title}</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {report.systolic_bp != null && (
                          <MetricBadge label="BP" value={`${report.systolic_bp}/${report.diastolic_bp || '?'}`} unit="mmHg" />
                        )}
                        {report.heart_rate != null && <MetricBadge label="HR" value={report.heart_rate} unit="bpm" />}
                        {report.fasting_blood_sugar != null && <MetricBadge label="FBS" value={report.fasting_blood_sugar} unit="mg/dL" />}
                        {report.hemoglobin != null && <MetricBadge label="Hb" value={report.hemoglobin} unit="g/dL" />}
                        {report.hba1c != null && <MetricBadge label="HbA1c" value={report.hba1c} unit="%" />}
                        {report.total_cholesterol != null && <MetricBadge label="Chol" value={report.total_cholesterol} unit="mg/dL" />}
                        <span className="text-xs text-slate-400 self-center">{filledMetrics(report)} metrics</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Trends */}
      {tab === 'Trends' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Select Metrics to Chart</h3>
            <div className="flex flex-wrap gap-2">
              {allMetricOptions.map((m) => (
                <button
                  key={m.key}
                  onClick={() => toggleTrendMetric(m.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedMetrics.includes(m.key)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {loadingTrends ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : trends.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No trend data yet</p>
              <p className="text-sm mt-1">Add at least 2 reports with the selected metrics</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {trends.map((trend, idx) => (
                <div key={trend.metric} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-800">{trend.label}</h3>
                      <p className="text-xs text-slate-400">{trend.data.length} data points • {trend.unit}</p>
                    </div>
                    {trend.data.length >= 2 && (
                      <TrendIndicator first={trend.data[0].value} last={trend.data[trend.data.length - 1].value} />
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trend.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickFormatter={(d: string) => {
                          const dt = new Date(d);
                          return `${dt.getDate()}/${dt.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={50} />
                      <Tooltip
                        contentStyle={{ borderRadius: '0.75rem', fontSize: '0.75rem', border: '1px solid #e2e8f0' }}
                        labelFormatter={(d: unknown) => new Date(String(d)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        formatter={(v: unknown) => [`${Number(v)} ${trend.unit}`, trend.label]}
                      />
                      {trend.normal_min != null && trend.normal_max != null && (
                        <ReferenceArea y1={trend.normal_min} y2={trend.normal_max} fill="#10b981" fillOpacity={0.08} />
                      )}
                      {trend.normal_min != null && (
                        <ReferenceLine y={trend.normal_min} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} />
                      )}
                      {trend.normal_max != null && (
                        <ReferenceLine y={trend.normal_max} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} />
                      )}
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4, fill: CHART_COLORS[idx % CHART_COLORS.length] }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  {trend.normal_min != null && trend.normal_max != null && (
                    <p className="text-xs text-emerald-600 mt-2 text-center">
                      Normal range: {trend.normal_min} — {trend.normal_max} {trend.unit}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Alerts */}
      {tab === 'Alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Health Alerts
            </h2>
            {alerts.filter((a) => a.status === 'active').length > 0 && (
              <button
                onClick={async () => {
                  await healthAlertsApi.acknowledgeAll();
                  healthAlertsApi.list().then((r) => {
                    setAlerts(r.data.items);
                    setAlertsUnread(0);
                  });
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Acknowledge all
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Automated alerts when your vitals (from wearables or health reports) are out of normal range.
          </p>
          {alerts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="font-medium text-slate-700">No alerts</p>
              <p className="text-sm text-slate-500 mt-1">Your vitals are within normal range. Keep syncing your devices and adding health reports.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-xl border p-4 ${
                    a.severity === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : a.severity === 'warning'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          a.severity === 'critical' ? 'bg-red-200 text-red-800' : a.severity === 'warning' ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {a.severity}
                        </span>
                        {a.status === 'acknowledged' && (
                          <span className="text-xs text-slate-500">Acknowledged</span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900 mt-2">{a.metric_label || a.metric}</p>
                      <p className="text-sm text-slate-600 mt-1">{a.message}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {a.value} {a.unit}
                        {a.normal_min != null && a.normal_max != null && ` (normal: ${a.normal_min}–${a.normal_max})`}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(a.created_at).toLocaleString()} • from {a.source_type || 'manual'}
                      </p>
                    </div>
                    {a.status === 'active' && (
                      <button
                        onClick={async () => {
                          await healthAlertsApi.acknowledge(a.id);
                          setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: 'acknowledged' as const } : x)));
                          setAlertsUnread((n) => Math.max(0, n - 1));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricBadge({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">
      <span className="font-medium text-slate-500">{label}:</span>
      <span className="font-semibold">{value}</span>
      <span className="text-slate-400">{unit}</span>
    </span>
  );
}

function TrendIndicator({ first, last }: { first: number; last: number }) {
  const diff = last - first;
  const pct = first !== 0 ? Math.abs((diff / first) * 100).toFixed(1) : '0';
  if (Math.abs(diff) < 0.01) return <span className="text-xs text-slate-400 flex items-center gap-1"><Minus className="w-3 h-3" /> Stable</span>;
  if (diff > 0)
    return <span className="text-xs text-amber-600 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +{pct}%</span>;
  return <span className="text-xs text-emerald-600 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> -{pct}%</span>;
}

function ComparisonPanel({ comparison }: { comparison: Comparison }) {
  const { older_report, newer_report, changes, summary, improved_count, worsened_count, stable_count } = comparison;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-violet-50 px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <GitCompareArrows className="w-5 h-5 text-blue-600" /> Report Comparison
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {new Date(older_report.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {' → '}
          {new Date(newer_report.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="px-6 py-4 border-b border-slate-100">
        <p className="text-sm text-slate-700">{summary}</p>
        <div className="flex gap-4 mt-3">
          {improved_count > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <ArrowDownRight className="w-4 h-4" /> {improved_count} Improved
            </span>
          )}
          {worsened_count > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-red-600">
              <ArrowUpRight className="w-4 h-4" /> {worsened_count} Worsened
            </span>
          )}
          {stable_count > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Minus className="w-4 h-4" /> {stable_count} Stable
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {changes.map((ch) => (
          <div key={ch.metric} className="px-6 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{ch.label}</p>
              <p className="text-xs text-slate-400">{ch.unit}</p>
            </div>
            <div className="text-right min-w-[70px]">
              {ch.old_value != null ? (
                <div>
                  <span className={`text-sm font-mono ${ch.old_status ? VALUE_STATUS_CLS[ch.old_status]?.split(' ')[0] : 'text-slate-600'}`}>
                    {ch.old_value}
                  </span>
                  {ch.old_status && ch.old_status !== 'normal' && (
                    <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${VALUE_STATUS_CLS[ch.old_status] || ''}`}>
                      {ch.old_status}
                    </span>
                  )}
                </div>
              ) : <span className="text-xs text-slate-300">—</span>}
            </div>
            <div className="text-slate-300">→</div>
            <div className="text-right min-w-[70px]">
              {ch.new_value != null ? (
                <div>
                  <span className={`text-sm font-mono ${ch.new_status ? VALUE_STATUS_CLS[ch.new_status]?.split(' ')[0] : 'text-slate-600'}`}>
                    {ch.new_value}
                  </span>
                  {ch.new_status && ch.new_status !== 'normal' && (
                    <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${VALUE_STATUS_CLS[ch.new_status] || ''}`}>
                      {ch.new_status}
                    </span>
                  )}
                </div>
              ) : <span className="text-xs text-slate-300">—</span>}
            </div>
            <div className="min-w-[90px] text-right">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${STATUS_CLS[ch.status] || ''}`}>
                {ch.status === 'improved' && <ArrowDownRight className="w-3 h-3" />}
                {ch.status === 'worsened' && <ArrowUpRight className="w-3 h-3" />}
                {ch.status === 'stable' && <Minus className="w-3 h-3" />}
                {ch.status !== 'new' && ch.status !== 'removed' && ch.percent_change != null
                  ? `${ch.percent_change > 0 ? '+' : ''}${ch.percent_change}%`
                  : ch.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

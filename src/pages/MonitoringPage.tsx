import { useEffect, useState, useCallback } from 'react';
import { healthApi } from '../lib/api';
import { Activity, RefreshCw, CheckCircle2, XCircle, Clock, Server, Database, Cpu } from 'lucide-react';

interface HealthData {
  status: string;
  app: string;
  version: string;
  checks: { database: string; redis: string };
}

interface MetricLine { name: string; value: string; type: string }

export default function MonitoringPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<MetricLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      const [h, m] = await Promise.all([healthApi.check(), healthApi.metrics()]);
      setHealth(h.data);
      const parsed = parseMetrics(m.data);
      setMetrics(parsed);
    } catch {
      setHealth(null);
    }
    setLastCheck(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  const parseMetrics = (raw: string): MetricLine[] => {
    return raw.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => {
      const [fullName, value] = l.split(' ');
      const name = fullName.replace('meddiagnose_', '').replace(/_/g, ' ');
      return { name, value: value || '0', type: fullName.includes('total') ? 'counter' : 'gauge' };
    });
  };

  const services = [
    { name: 'API Server', status: health?.status === 'healthy' || health?.status === 'degraded', icon: Server, desc: `${health?.app} v${health?.version}` },
    { name: 'PostgreSQL', status: health?.checks?.database === 'ok', icon: Database, desc: 'Primary database' },
    { name: 'Redis', status: health?.checks?.redis === 'ok', icon: Cpu, desc: 'Cache & rate limiting' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Monitoring</h1>
          <p className="text-slate-500 text-sm mt-1">Health checks, metrics, and service status</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            Auto-refresh (15s)
          </label>
          <button onClick={() => { setLoading(true); load(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`rounded-2xl p-6 mb-6 flex items-center gap-4 ${
        health?.status === 'healthy' ? 'bg-emerald-50 border border-emerald-200' :
        health?.status === 'degraded' ? 'bg-amber-50 border border-amber-200' :
        'bg-red-50 border border-red-200'
      }`}>
        {health?.status === 'healthy' ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        ) : (
          <XCircle className="w-8 h-8 text-red-500" />
        )}
        <div>
          <h2 className="text-lg font-bold text-slate-900 capitalize">System {health?.status || 'Unreachable'}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            Last checked: {lastCheck.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        {services.map((s) => (
          <div key={s.name} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <s.icon className="w-6 h-6 text-slate-400" />
              <div className={`w-3 h-3 rounded-full ${s.status ? 'bg-emerald-500' : 'bg-red-500'} ring-4 ${s.status ? 'ring-emerald-500/20' : 'ring-red-500/20'}`} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">{s.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
            <p className={`text-xs font-medium mt-2 ${s.status ? 'text-emerald-600' : 'text-red-600'}`}>
              {s.status ? 'Operational' : 'Down'}
            </p>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Application Metrics</h2>
        </div>
        {metrics.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((m, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{m.name}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {m.name.includes('avg') ? `${parseFloat(m.value).toFixed(1)}ms` : parseInt(m.value).toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400 uppercase">{m.type}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No metrics available. Ensure the API server is running.</p>
        )}
      </div>
    </div>
  );
}

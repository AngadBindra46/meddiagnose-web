import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const GENDER_COLORS: Record<string, string> = {
  Male: '#3b82f6', Female: '#ec4899', Other: '#8b5cf6', Unknown: '#94a3b8',
};
const SEV_COLORS: Record<string, string> = {
  mild: '#10b981', moderate: '#f59e0b', severe: '#ef4444', critical: '#991b1b',
};

interface GenderTotal { gender: string; count: number }
interface DiseaseCount { disease: string; count: number }
interface MedEntry { name: string; count: number; top_diseases: DiseaseCount[] }
interface SevGender { gender: string; mild?: number; moderate?: number; severe?: number; critical?: number }

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'doctor';

  const [diseases, setDiseases] = useState<{ name: string; count: number }[]>([]);
  const [trend, setTrend] = useState<{ date: string; count: number }[]>([]);
  const [confidence, setConfidence] = useState<{ range: string; count: number }[]>([]);
  const [genderTotals, setGenderTotals] = useState<GenderTotal[]>([]);
  const [diseaseByGender, setDiseaseByGender] = useState<Record<string, DiseaseCount[]>>({});
  const [medications, setMedications] = useState<MedEntry[]>([]);
  const [sevByGender, setSevByGender] = useState<SevGender[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [activeGender, setActiveGender] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const promises: Promise<any>[] = [
      adminApi.diseaseDistribution(days),
      adminApi.dailyTrend(days),
      adminApi.confidenceDistribution(),
    ];
    if (isAdmin) {
      promises.push(
        adminApi.genderDisease(days),
        adminApi.topMedications(days),
        adminApi.severityByGender(days),
      );
    }
    Promise.all(promises)
      .then((results) => {
        setDiseases(results[0].data.diseases || []);
        setTrend(results[1].data.trend || []);
        setConfidence(results[2].data.buckets || []);
        if (isAdmin && results.length > 3) {
          setGenderTotals(results[3].data.gender_totals || []);
          setDiseaseByGender(results[3].data.disease_by_gender || {});
          setMedications(results[4].data.medications || []);
          setSevByGender(results[5].data.genders || []);
          const genders = results[3].data.gender_totals || [];
          if (genders.length > 0 && !activeGender) setActiveGender(genders[0].gender);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const genderDiseases = activeGender ? (diseaseByGender[activeGender] || []).slice(0, 10) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">
            Disease, medication & demographic insights
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-blue-500 outline-none"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 1 year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Trend */}
        <ChartCard title="Diagnoses per Day">
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </ChartCard>

        {/* Confidence Distribution */}
        <ChartCard title="AI Confidence Distribution">
          {confidence.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={confidence} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={100}
                  label={(e: unknown) => {
                    const d = e as { range?: string; count?: number };
                    return `${d.range ?? ''}: ${d.count ?? 0}`;
                  }}>
                  {confidence.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </ChartCard>
      </div>

      {/* ── Admin-only: Gender & Medication Analytics ── */}
      {isAdmin && (
        <>
          {/* Gender overview + Severity by Gender */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Gender breakdown pie */}
            <ChartCard title="Diagnoses by Gender">
              {genderTotals.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genderTotals}
                      dataKey="count"
                      nameKey="gender"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={60}
                      label={(e: unknown) => {
                        const d = e as { gender?: string; count?: number; percent?: number };
                        return `${d.gender ?? ''}: ${d.count ?? 0} (${((d.percent ?? 0) * 100).toFixed(0)}%)`;
                      }}
                    >
                      {genderTotals.map((g) => (
                        <Cell key={g.gender} fill={GENDER_COLORS[g.gender] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState />}
            </ChartCard>

            {/* Severity by gender stacked bar */}
            <ChartCard title="Severity Distribution by Gender">
              {sevByGender.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sevByGender}>
                    <XAxis dataKey="gender" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="mild" stackId="a" fill={SEV_COLORS.mild} name="Mild" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="moderate" stackId="a" fill={SEV_COLORS.moderate} name="Moderate" />
                    <Bar dataKey="severe" stackId="a" fill={SEV_COLORS.severe} name="Severe" />
                    <Bar dataKey="critical" stackId="a" fill={SEV_COLORS.critical} name="Critical" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState />}
            </ChartCard>
          </div>

          {/* Disease by gender – interactive tabs */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Top Diseases by Gender</h2>
              <div className="flex gap-2">
                {genderTotals.map((g) => (
                  <button
                    key={g.gender}
                    onClick={() => setActiveGender(g.gender)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activeGender === g.gender
                        ? 'text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    style={activeGender === g.gender ? { backgroundColor: GENDER_COLORS[g.gender] || '#94a3b8' } : {}}
                  >
                    {g.gender} ({g.count})
                  </button>
                ))}
              </div>
            </div>
            {genderDiseases.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(250, genderDiseases.length * 38)}>
                <BarChart data={genderDiseases} layout="vertical" margin={{ left: 160 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="disease" tick={{ fontSize: 11 }} width={150} />
                  <Tooltip />
                  <Bar dataKey="count" fill={GENDER_COLORS[activeGender || ''] || '#3b82f6'} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState msg="No disease data for this gender" />
            )}
          </div>

          {/* Top Medications */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Most Prescribed Medications</h2>
            <p className="text-sm text-slate-400 mb-5">Top medications across all diagnoses with linked conditions</p>
            {medications.length > 0 ? (
              <div className="space-y-3">
                {medications.map((med, idx) => {
                  const maxCount = medications[0]?.count || 1;
                  return (
                    <div key={med.name} className="group">
                      <div className="flex items-center gap-3">
                        <span className="w-7 text-right text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-900 truncate">{med.name}</span>
                            <span className="text-xs font-bold text-blue-600 ml-2 flex-shrink-0">
                              {med.count} prescription{med.count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                              style={{ width: `${(med.count / maxCount) * 100}%` }}
                            />
                          </div>
                          {med.top_diseases.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {med.top_diseases.map((d) => (
                                <span key={d.disease} className="px-2 py-0.5 rounded-full text-[10px] bg-slate-50 text-slate-500 border border-slate-100">
                                  {d.disease} ({d.count})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState msg="No medication data for the selected period" />
            )}
          </div>
        </>
      )}

      {/* Disease Distribution (all roles) */}
      <ChartCard title="Top Diagnosed Conditions">
        {diseases.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(300, diseases.length * 40)}>
            <BarChart data={diseases} layout="vertical" margin={{ left: 180 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={170} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState msg="No disease data for the selected period" />
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function EmptyState({ msg = 'No data available' }: { msg?: string }) {
  return <p className="text-slate-400 text-sm py-16 text-center">{msg}</p>;
}

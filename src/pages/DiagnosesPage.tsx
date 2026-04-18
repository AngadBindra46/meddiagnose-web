import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ChevronLeft, ChevronRight, Eye, X, FileSearch, Stethoscope } from 'lucide-react';

interface DiagRow {
  id: number; status: string; ai_diagnosis: string | null; ai_layman_summary?: string | null;
  ai_severity: string | null; ai_urgency: string | null; ai_confidence: number | null;
  symptoms_text: string | null; ai_reasoning: string | null; ai_medications: any[] | null;
  ai_findings: any[] | null; ai_lifestyle: string[] | null; ai_precautions: string[] | null;
  ai_recommended_tests: string[] | null; ai_when_to_see_doctor: string | null;
  ai_drug_interactions: any[] | null; created_at: string | null;
}

const SEV_CLS: Record<string, string> = {
  mild: 'bg-emerald-100 text-emerald-700', moderate: 'bg-amber-100 text-amber-700',
  severe: 'bg-red-100 text-red-700', critical: 'bg-red-200 text-red-800',
};

export default function DiagnosesPage() {
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';
  const [items, setItems] = useState<DiagRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const [selected, setSelected] = useState<DiagRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.diagnoses({ page, per_page: 15, severity });
      setItems(r.data.items); setTotal(r.data.total);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load diagnoses. Please try again.');
    }
    setLoading(false);
  }, [page, severity]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 15);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{isPatient ? 'My Diagnoses' : 'Diagnoses'}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isPatient ? 'Your diagnosis history and AI results' : 'Review all AI-generated diagnoses'}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-blue-500 outline-none">
            <option value="">All Severities</option>
            {['mild', 'moderate', 'severe', 'critical'].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
        ) : error ? (
          <div className="py-16 px-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium">Try again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <FileSearch className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No diagnoses yet</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-4">
              {isPatient
                ? 'Upload a report and get an AI diagnosis to see your results here.'
                : 'When patients submit symptoms and reports, their AI diagnoses will appear here for review.'}
            </p>
            <Link to="/new-diagnosis" className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium">
              <Stethoscope className="w-4 h-4" />
              {isPatient ? 'Get a diagnosis' : 'Create a diagnosis'}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Diagnosis</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Confidence</th>
                  <th className="px-6 py-3">Urgency</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">#{d.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 max-w-xs truncate">{d.ai_diagnosis || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${SEV_CLS[d.ai_severity || ''] || 'bg-slate-100 text-slate-600'}`}>
                        {d.ai_severity || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{d.ai_confidence != null ? `${Math.round(d.ai_confidence * 100)}%` : '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{d.ai_urgency || '—'}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => setSelected(d)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">{total} diagnoses total</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm text-slate-600">Page {page} of {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selected.ai_diagnosis || 'Unknown'}</h2>
                <p className="text-sm text-slate-500">Diagnosis #{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex gap-2 mb-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${SEV_CLS[selected.ai_severity || ''] || 'bg-slate-100'}`}>{selected.ai_severity}</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {selected.ai_confidence != null ? `${Math.round(selected.ai_confidence * 100)}% confidence` : 'N/A'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 capitalize">{selected.ai_urgency}</span>
            </div>

            {selected.ai_layman_summary && (
              <Section title="In Simple Terms">
                <p className="text-sm text-slate-600 leading-relaxed bg-blue-50 border border-blue-100 rounded-lg p-3">{selected.ai_layman_summary}</p>
              </Section>
            )}
            {selected.symptoms_text && <Section title="Symptoms"><p className="text-sm text-slate-600">{selected.symptoms_text}</p></Section>}
            {selected.ai_reasoning && <Section title="AI Reasoning"><p className="text-sm text-slate-600 leading-relaxed">{selected.ai_reasoning}</p></Section>}

            {selected.ai_medications?.length ? (
              <Section title="Medications">
                <div className="space-y-2">
                  {selected.ai_medications.map((m: any, i: number) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 text-sm">
                      <span className="font-semibold text-slate-900">{m.name}</span>
                      {(m.when_to_take || m.frequency) && (
                        <p className="text-xs font-medium text-slate-600 mt-1">When to take: {m.when_to_take || m.frequency}</p>
                      )}
                      <span className="text-slate-500"> — {m.dosage}, {m.duration}</span>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {selected.ai_drug_interactions?.length ? (
              <Section title="Drug Interactions">
                {selected.ai_drug_interactions.map((ix: any, i: number) => (
                  <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm mb-2">
                    <span className="font-semibold text-red-700">{ix.severity?.toUpperCase()}</span>: {ix.drug_a} + {ix.drug_b} — {ix.description}
                  </div>
                ))}
              </Section>
            ) : null}

            {selected.ai_lifestyle?.length ? <Section title="Lifestyle"><ul className="text-sm text-slate-600 space-y-1">{selected.ai_lifestyle.map((l, i) => <li key={i}>• {l}</li>)}</ul></Section> : null}
            {selected.ai_precautions?.length ? <Section title="Precautions"><ul className="text-sm text-slate-600 space-y-1">{selected.ai_precautions.map((p, i) => <li key={i}>• {p}</li>)}</ul></Section> : null}
            {selected.ai_when_to_see_doctor && <Section title="When to See Doctor"><p className="text-sm text-slate-600">{selected.ai_when_to_see_doctor}</p></Section>}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../lib/api';
import {
  Search, ChevronLeft, ChevronRight, X, Eye,
  User as UserIcon, Phone, Droplets, AlertTriangle,
  Calendar, Scale, FileHeart, ArrowLeft,
} from 'lucide-react';

interface PatientRow {
  id: number;
  email: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  allergies: string | null;
  phone: string | null;
  weight_kg: number | null;
  is_active: boolean;
  created_at: string | null;
  diagnosis_count: number;
  last_diagnosis_at: string | null;
}

interface DiagRow {
  id: number;
  status: string;
  ai_diagnosis: string | null;
  ai_severity: string | null;
  ai_urgency: string | null;
  ai_confidence: number | null;
  symptoms_text: string | null;
  ai_reasoning: string | null;
  ai_medications: any[] | null;
  ai_findings: any[] | null;
  ai_lifestyle: string[] | null;
  ai_precautions: string[] | null;
  ai_recommended_tests: string[] | null;
  ai_when_to_see_doctor: string | null;
  ai_drug_interactions: any[] | null;
  created_at: string | null;
}

const SEV_CLS: Record<string, string> = {
  mild: 'bg-emerald-100 text-emerald-700',
  moderate: 'bg-amber-100 text-amber-700',
  severe: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800',
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [diagnoses, setDiagnoses] = useState<DiagRow[]>([]);
  const [diagTotal, setDiagTotal] = useState(0);
  const [diagPage, setDiagPage] = useState(1);
  const [diagLoading, setDiagLoading] = useState(false);
  const [expandedDiag, setExpandedDiag] = useState<DiagRow | null>(null);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.patients({ page, per_page: 15, search });
      setPatients(r.data.items);
      setTotal(r.data.total);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load patients. Please try again.');
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const openPatient = async (p: PatientRow) => {
    setSelectedPatient(p);
    setDiagPage(1);
    setExpandedDiag(null);
    await loadDiagnoses(p.id, 1);
  };

  const loadDiagnoses = async (patientId: number, pg: number) => {
    setDiagLoading(true);
    try {
      const r = await adminApi.patientDiagnoses(patientId, { page: pg, per_page: 10 });
      setDiagnoses(r.data.items);
      setDiagTotal(r.data.total);
    } catch { /* handled by loading state */ }
    setDiagLoading(false);
  };

  const handleDiagPageChange = (newPage: number) => {
    setDiagPage(newPage);
    if (selectedPatient) loadDiagnoses(selectedPatient.id, newPage);
  };

  const totalPages = Math.ceil(total / 15);
  const diagTotalPages = Math.ceil(diagTotal / 10);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const diff = Date.now() - birth.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  // Diagnosis detail modal
  if (expandedDiag) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={() => setExpandedDiag(null)} />
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">
                Patient: <span className="font-semibold text-slate-600">{selectedPatient?.full_name}</span>
              </p>
              <h2 className="text-xl font-bold text-slate-900">{expandedDiag.ai_diagnosis || 'Unknown Diagnosis'}</h2>
              <p className="text-sm text-slate-500">Diagnosis #{expandedDiag.id} &middot; {formatDate(expandedDiag.created_at)}</p>
            </div>
            <button onClick={() => setExpandedDiag(null)} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${SEV_CLS[expandedDiag.ai_severity || ''] || 'bg-slate-100'}`}>
              {expandedDiag.ai_severity || 'N/A'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {expandedDiag.ai_confidence != null ? `${Math.round(expandedDiag.ai_confidence * 100)}% confidence` : 'N/A'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 capitalize">
              {expandedDiag.ai_urgency || 'N/A'}
            </span>
          </div>

          {expandedDiag.symptoms_text && (
            <Section title="Symptoms Reported">
              <p className="text-sm text-slate-600">{expandedDiag.symptoms_text}</p>
            </Section>
          )}

          {expandedDiag.ai_reasoning && (
            <Section title="AI Reasoning">
              <p className="text-sm text-slate-600 leading-relaxed">{expandedDiag.ai_reasoning}</p>
            </Section>
          )}

          {expandedDiag.ai_findings?.length ? (
            <Section title="Key Findings">
              <ul className="text-sm text-slate-600 space-y-1">
                {expandedDiag.ai_findings.map((f: string, i: number) => <li key={i}>• {f}</li>)}
              </ul>
            </Section>
          ) : null}

          {expandedDiag.ai_medications?.length ? (
            <Section title="Prescribed Medications">
              <div className="space-y-2">
                {expandedDiag.ai_medications.map((m: any, i: number) => (
                  <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{m.dosage} &middot; {m.frequency} &middot; {m.duration}</p>
                    {m.notes && <p className="text-xs text-slate-400 mt-1 italic">{m.notes}</p>}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {expandedDiag.ai_drug_interactions?.length ? (
            <Section title="Drug Interaction Warnings">
              {expandedDiag.ai_drug_interactions.map((ix: any, i: number) => (
                <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm mb-2">
                  <span className="font-semibold text-red-700">{ix.severity?.toUpperCase()}</span>
                  : {ix.drug_a} + {ix.drug_b} — {ix.description}
                </div>
              ))}
            </Section>
          ) : null}

          {expandedDiag.ai_lifestyle?.length ? (
            <Section title="Lifestyle Recommendations">
              <ul className="text-sm text-slate-600 space-y-1">
                {expandedDiag.ai_lifestyle.map((l, i) => <li key={i}>• {l}</li>)}
              </ul>
            </Section>
          ) : null}

          {expandedDiag.ai_precautions?.length ? (
            <Section title="Precautions">
              <ul className="text-sm text-slate-600 space-y-1">
                {expandedDiag.ai_precautions.map((p, i) => <li key={i}>• {p}</li>)}
              </ul>
            </Section>
          ) : null}

          {expandedDiag.ai_recommended_tests?.length ? (
            <Section title="Recommended Tests">
              <ul className="text-sm text-slate-600 space-y-1">
                {expandedDiag.ai_recommended_tests.map((t: string, i: number) => <li key={i}>• {t}</li>)}
              </ul>
            </Section>
          ) : null}

          {expandedDiag.ai_when_to_see_doctor && (
            <Section title="When to See a Doctor">
              <p className="text-sm text-slate-600">{expandedDiag.ai_when_to_see_doctor}</p>
            </Section>
          )}
        </div>
      </div>
    );
  }

  // Patient detail view
  if (selectedPatient) {
    const age = calculateAge(selectedPatient.date_of_birth);

    return (
      <div>
        <button
          onClick={() => setSelectedPatient(null)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patients
        </button>

        {/* Patient Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{selectedPatient.full_name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${selectedPatient.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {selectedPatient.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-4">{selectedPatient.email}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <ProfileField icon={Calendar} label="Age" value={age ? `${age} yrs` : '—'} />
                <ProfileField icon={UserIcon} label="Gender" value={selectedPatient.gender || '—'} />
                <ProfileField icon={Droplets} label="Blood Group" value={selectedPatient.blood_group || '—'} />
                <ProfileField icon={Scale} label="Weight" value={selectedPatient.weight_kg ? `${selectedPatient.weight_kg} kg` : '—'} />
                <ProfileField icon={Phone} label="Phone" value={selectedPatient.phone || '—'} />
                <ProfileField icon={FileHeart} label="Diagnoses" value={String(selectedPatient.diagnosis_count)} />
              </div>

              {selectedPatient.allergies && (
                <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Allergies</p>
                    <p className="text-sm text-amber-800 mt-0.5">{selectedPatient.allergies}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Diagnosis History */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Diagnosis History</h2>
            <p className="text-sm text-slate-500 mt-0.5">{diagTotal} diagnosis report{diagTotal !== 1 ? 's' : ''} on file</p>
          </div>

          {diagLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : diagnoses.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileHeart className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No diagnoses found for this patient</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-50">
                {diagnoses.map((d) => (
                  <div
                    key={d.id}
                    className="p-5 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onClick={() => setExpandedDiag(d)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">
                            {d.ai_diagnosis || 'Pending Diagnosis'}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize flex-shrink-0 ${SEV_CLS[d.ai_severity || ''] || 'bg-slate-100 text-slate-600'}`}>
                            {d.ai_severity || 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{d.symptoms_text || 'No symptoms recorded'}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[11px] text-slate-400">
                            {formatDate(d.created_at)}
                          </span>
                          {d.ai_confidence != null && (
                            <span className="text-[11px] text-blue-500 font-medium">
                              {Math.round(d.ai_confidence * 100)}% confidence
                            </span>
                          )}
                          {d.ai_urgency && (
                            <span className={`text-[11px] font-medium capitalize ${d.ai_urgency === 'urgent' || d.ai_urgency === 'emergency' ? 'text-red-500' : 'text-slate-400'}`}>
                              {d.ai_urgency}
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 flex-shrink-0">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    {d.ai_medications?.length ? (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {d.ai_medications.slice(0, 4).map((m: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 font-medium">
                            {m.name}
                          </span>
                        ))}
                        {d.ai_medications.length > 4 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500">
                            +{d.ai_medications.length - 4} more
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">{diagTotal} total</span>
                <div className="flex items-center gap-2">
                  <button disabled={diagPage <= 1} onClick={() => handleDiagPageChange(diagPage - 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-slate-600">Page {diagPage} of {diagTotalPages || 1}</span>
                  <button disabled={diagPage >= diagTotalPages} onClick={() => handleDiagPageChange(diagPage + 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Patient list view
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
        <p className="text-slate-500 text-sm mt-1">View patient profiles and their diagnosis reports</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search patients by name or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : error && patients.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={loadPatients} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium">Try again</button>
          </div>
        ) : patients.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <UserIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {search ? 'No patients match your search' : 'No patients yet'}
            </h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              {search ? 'Try a different name or email.' : 'Patient profiles will appear here once they register and complete diagnoses.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Patient</th>
                  <th className="px-6 py-3">Age / Gender</th>
                  <th className="px-6 py-3">Blood Group</th>
                  <th className="px-6 py-3">Diagnoses</th>
                  <th className="px-6 py-3">Last Visit</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {patients.map((p) => {
                  const age = calculateAge(p.date_of_birth);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {p.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{p.full_name}</p>
                            <p className="text-xs text-slate-400 truncate">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {age ? `${age} yrs` : '—'}{p.gender ? ` / ${p.gender}` : ''}
                      </td>
                      <td className="px-6 py-4">
                        {p.blood_group ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                            {p.blood_group}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900">{p.diagnosis_count}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">{formatDate(p.last_diagnosis_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openPatient(p)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">{total} patient{total !== 1 ? 's' : ''} total</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600">Page {page} of {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileField({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

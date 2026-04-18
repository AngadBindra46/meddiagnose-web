import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { diagnosisApi, patientApi, type DiagnosisVitals } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Upload, FileText, Loader2, Stethoscope, AlertTriangle,
  Pill, ShieldAlert, Activity, ClipboardList, Heart, Trash2, MapPin,
  UtensilsCrossed, Clock, Sun, Moon, Sunrise, Coffee, ChevronDown, ChevronUp,
  Leaf, FlaskConical, Home, BookOpen, GitBranch, Share2, Printer,
  HeartPulse,
} from 'lucide-react';

const SEV_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  mild: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  severe: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

interface DietaryCategory {
  category: string;
  icon: string;
  items: string[];
}

interface RoutineBlock {
  time: string;
  icon: string;
  activities: string[];
}

interface AyurvedicMedicine {
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
  category: string;
}

interface DifferentialDiagnosis {
  diagnosis: string;
  confidence: number;
  reasoning: string;
}

interface ExtractedLabValue {
  test: string;
  value: string;
  unit: string;
  reference: string;
  status: string;
}

interface DiagResult {
  id: number;
  ai_diagnosis: string | null;
  ai_layman_summary: string | null;
  ai_severity: string | null;
  ai_urgency: string | null;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  ai_findings: string[] | null;
  ai_medications: any[] | null;
  ai_lifestyle: string[] | null;
  ai_precautions: string[] | null;
  ai_recommended_tests: string[] | null;
  ai_when_to_see_doctor: string | null;
  ai_differential_diagnoses: DifferentialDiagnosis[] | null;
  ai_drug_interactions: any[] | null;
  ai_allergy_warnings?: string[] | null;
  ai_high_risk_drug_warnings?: { drug: string; warning: string }[] | null;
  ai_organ_warnings?: { organ: string; drug: string; action: string; message: string }[] | null;
  ai_critical_warnings?: { organ: string; drug: string | null; action: string; message: string }[] | null;
  ai_dietary_plan: DietaryCategory[] | null;
  ai_routine_plan: RoutineBlock[] | null;
  ai_ayurvedic_medicines: AyurvedicMedicine[] | null;
  ai_extracted_lab_values?: ExtractedLabValue[] | null;
}

interface PatientOption {
  id: number;
  first_name: string;
  last_name: string;
}

export default function NewDiagnosisPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [symptoms, setSymptoms] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [modelSize, setModelSize] = useState<'4b' | '27b'>('4b');
  const [vitals, setVitals] = useState<DiagnosisVitals>({});
  const [patientId, setPatientId] = useState<number | undefined>(() => {
    const p = searchParams.get('patientId');
    return p ? parseInt(p, 10) : undefined;
  });
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DiagResult | null>(null);
  const [shareFeedback, setShareFeedback] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const canSelectPatient = user?.role === 'doctor' || user?.role === 'admin';

  useEffect(() => {
    if (canSelectPatient) {
      patientApi.list({ per_page: 100 }).then((r) => {
        setPatients(r.data.items || []);
      }).catch(() => {});
    }
  }, [canSelectPatient]);

  useEffect(() => {
    const p = searchParams.get('patientId');
    if (p) setPatientId(parseInt(p, 10));
  }, [searchParams]);

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) { setError('Please describe your symptoms'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await diagnosisApi.analyze(symptoms.trim(), clinicalNotes.trim(), files, modelSize, vitals, patientId);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Diagnosis failed. Please try again.');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setSymptoms('');
    setClinicalNotes('');
    setFiles([]);
    setModelSize('4b');
    setVitals({});
    setPatientId(undefined);
    setResult(null);
    setError('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Show results
  if (result) {
    const sev = SEV_STYLE[result.ai_severity || ''] || SEV_STYLE.mild;
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Diagnosis Report</h1>
          <p className="text-slate-500 text-sm mt-1">AI-generated analysis of your symptoms</p>
        </div>

        {/* Diagnosis header */}
        <div className={`${sev.bg} ${sev.border} border rounded-2xl p-6 mb-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Diagnosis</p>
              <h2 className="text-2xl font-bold text-slate-900">{result.ai_diagnosis || 'Pending'}</h2>
              {result.ai_layman_summary && (
                <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-2xl">
                  <span className="font-medium text-slate-700">In simple terms: </span>
                  {result.ai_layman_summary}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize ${sev.bg} ${sev.text} border ${sev.border}`}>
                {result.ai_severity || 'N/A'}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {result.ai_confidence != null ? `${Math.round(result.ai_confidence * 100)}% confidence` : 'N/A'}
              </span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize ${
                result.ai_urgency === 'urgent' || result.ai_urgency === 'emergency'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200'
              }`}>
                {result.ai_urgency || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Critical Condition Alert — Life-threatening; seek emergency care */}
        {result.ai_critical_warnings?.length ? (
          <div className="bg-red-100 border-2 border-red-400 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-6 h-6 text-red-700" />
              <h3 className="text-lg font-bold text-red-800">Critical — Seek Emergency Care</h3>
            </div>
            <p className="text-sm font-medium text-red-800 mb-3">
              This presentation may indicate a life-threatening condition. Do not rely on prescriptions alone.
            </p>
            <div className="space-y-2">
              {result.ai_critical_warnings.map((c: { organ: string; drug: string | null; action: string; message: string }, i: number) => (
                <div key={i} className={`rounded-xl p-3 text-sm ${
                  c.action === 'alert' ? 'bg-red-200 border-2 border-red-400' : 'bg-white border border-red-200'
                }`}>
                  <span className="text-red-900 font-medium">{c.message}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Extracted Lab Values (from lab report images) */}
        {result.ai_extracted_lab_values?.length ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-slate-900">Lab Report Values</h3>
              <span className="ml-auto text-xs text-slate-400">Extracted from uploaded reports</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 font-semibold text-slate-700">Test</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Value</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Unit</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Reference</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ai_extracted_lab_values.map((lab: ExtractedLabValue, i: number) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2.5 font-medium text-slate-800">{lab.test}</td>
                      <td className="py-2.5 text-slate-600">{lab.value}</td>
                      <td className="py-2.5 text-slate-500">{lab.unit}</td>
                      <td className="py-2.5 text-slate-500">{lab.reference}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          lab.status === 'high' || lab.status === 'low' || lab.status === 'abnormal'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {lab.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Differential Diagnoses */}
        {result.ai_differential_diagnoses?.length ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900">Other Conditions Considered</h3>
              <span className="ml-auto text-xs text-slate-400">Alternative possibilities the AI evaluated</span>
            </div>
            <div className="space-y-3">
              {result.ai_differential_diagnoses.map((d, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-slate-800">{d.diagnosis}</h4>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {Math.round(d.confidence * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.round(d.confidence * 100)}%` }}
                    />
                  </div>
                  {d.reasoning && (
                    <p className="text-xs text-slate-500 leading-relaxed">{d.reasoning}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Reasoning */}
          {result.ai_reasoning && (
            <ResultCard icon={Stethoscope} title="AI Analysis" color="blue">
              <p className="text-sm text-slate-600 leading-relaxed">{result.ai_reasoning}</p>
            </ResultCard>
          )}

          {/* Findings */}
          {result.ai_findings?.length ? (
            <ResultCard icon={ClipboardList} title="Key Findings" color="violet">
              <ul className="space-y-2">
                {result.ai_findings.map((f: any, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                    {typeof f === 'string' ? f : f?.finding ?? f}
                  </li>
                ))}
              </ul>
            </ResultCard>
          ) : null}
        </div>

        {/* Medications */}
        {result.ai_medications?.length ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Pill className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Your Medications</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.ai_medications.map((m: any, i: number) => (
                <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="font-semibold text-slate-900 text-sm">{m.name}</p>
                  {(m.when_to_take || m.frequency) && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-100/60 px-2.5 py-2">
                      <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-blue-800">When to take</p>
                        <p className="text-sm text-blue-700">{m.when_to_take || m.frequency}</p>
                      </div>
                    </div>
                  )}
                  <div className="mt-1.5 space-y-0.5">
                    {m.dosage && <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">Dosage:</span> {m.dosage}</p>}
                    {m.duration && <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">Duration:</span> {m.duration}</p>}
                  </div>
                  {m.notes && <p className="text-xs text-slate-400 mt-2 italic">{m.notes}</p>}
                </div>
              ))}
            </div>
            <Link
              to={`/find-pharmacy?medications=${encodeURIComponent(result.ai_medications.map((m: any) => m.name).join(','))}`}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium text-sm transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Find nearest pharmacy with these medicines
            </Link>
          </div>
        ) : null}

        {/* Allergy Warnings (excluded drugs) */}
        {result.ai_allergy_warnings?.length ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-800">Allergy Safety — Drugs Excluded</h3>
            </div>
            <p className="text-sm text-amber-700 mb-2">These medications were removed from recommendations due to your reported allergies:</p>
            <ul className="space-y-1">
              {result.ai_allergy_warnings.map((w, i) => (
                <li key={i} className="text-sm text-amber-800">{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Vital Organ Warnings (kidney, liver, heart, asthma) */}
        {result.ai_organ_warnings?.length ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-orange-800">Vital Organ Safety</h3>
            </div>
            <p className="text-sm text-orange-700 mb-2">Based on your reported organ function (kidney, liver, heart, or respiratory):</p>
            <div className="space-y-2">
              {result.ai_organ_warnings.map((o: { organ: string; drug: string; action: string; message: string }, i: number) => (
                <div key={i} className={`rounded-xl p-3 text-sm ${
                  o.action === 'excluded' ? 'bg-orange-100 border border-orange-200' : 'bg-white border border-orange-100'
                }`}>
                  <span className="font-medium text-orange-800 capitalize">{o.organ}:</span>
                  <span className="text-orange-700 ml-1">{o.message}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* High-Risk Drug Monitoring */}
        {result.ai_high_risk_drug_warnings?.length ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-800">Medications Requiring Monitoring</h3>
            </div>
            <p className="text-sm text-amber-700 mb-2">These medications need regular blood tests or special monitoring:</p>
            <div className="space-y-2">
              {result.ai_high_risk_drug_warnings.map((h: { drug: string; warning: string }, i: number) => (
                <div key={i} className="bg-white border border-amber-100 rounded-xl p-3 text-sm">
                  <span className="font-semibold text-amber-800">{h.drug}:</span>
                  <span className="text-amber-700 ml-1">{h.warning}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Drug Interactions */}
        {result.ai_drug_interactions?.length ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-800">Drug Interaction Warnings</h3>
            </div>
            <div className="space-y-2">
              {result.ai_drug_interactions.map((ix: any, i: number) => (
                <div key={i} className="bg-white border border-red-100 rounded-xl p-3 text-sm">
                  <span className="font-bold text-red-700 uppercase text-xs">{ix.severity}</span>
                  <span className="text-slate-600 ml-2">{ix.drug_a} + {ix.drug_b} — {ix.description}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Ayurvedic Medicines */}
        {result.ai_ayurvedic_medicines?.length ? (
          <AyurvedicMedicinesSection medicines={result.ai_ayurvedic_medicines} />
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Lifestyle */}
          {result.ai_lifestyle?.length ? (
            <ResultCard icon={Heart} title="Lifestyle Recommendations" color="emerald">
              <ul className="space-y-2">
                {result.ai_lifestyle.map((l, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    {l}
                  </li>
                ))}
              </ul>
            </ResultCard>
          ) : null}

          {/* Precautions */}
          {result.ai_precautions?.length ? (
            <ResultCard icon={AlertTriangle} title="Precautions" color="amber">
              <ul className="space-y-2">
                {result.ai_precautions.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </ResultCard>
          ) : null}
        </div>

        {/* Recommended Tests */}
        {result.ai_recommended_tests?.length ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-cyan-600" />
              <h3 className="text-lg font-semibold text-slate-900">Recommended Tests</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.ai_recommended_tests.map((t, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-100">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Dietary Plan */}
        {result.ai_dietary_plan?.length ? (
          <DietaryPlanSection plan={result.ai_dietary_plan} />
        ) : null}

        {/* Daily Routine Plan */}
        {result.ai_routine_plan?.length ? (
          <RoutinePlanSection plan={result.ai_routine_plan} />
        ) : null}

        {/* When to See Doctor */}
        {result.ai_when_to_see_doctor && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">When to See a Doctor</h3>
                <p className="text-sm text-amber-700">{result.ai_when_to_see_doctor}</p>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
          <p className="text-xs text-slate-500 text-center">
            This is an AI-generated preliminary assessment and should not replace professional medical advice.
            Always consult a qualified healthcare provider for proper diagnosis and treatment.
          </p>
        </div>

        {/* Next steps & actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print report
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!result) return;
              const text = `${result.ai_diagnosis || 'Diagnosis report'}\n\n${result.ai_layman_summary || ''}`;
              setShareFeedback('');
              try {
                if (navigator.share) {
                  await navigator.share({
                    title: `Diagnosis: ${result.ai_diagnosis || 'Report'}`,
                    text,
                  });
                } else {
                  await navigator.clipboard?.writeText(text);
                  setShareFeedback('Copied to clipboard');
                  setTimeout(() => setShareFeedback(''), 2500);
                }
              } catch {}
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {shareFeedback || 'Share with doctor'}
          </button>
        </div>

        <button
          onClick={resetForm}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Run Another Diagnosis
        </button>
      </div>
    );
  }

  // Input form
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Diagnosis</h1>
        <p className="text-slate-500 text-sm mt-1">Describe your symptoms and upload medical reports for AI analysis (MedGemma)</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        {/* Patient selector (doctor/admin) */}
        {canSelectPatient && patients.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Patient (optional)
            </label>
            <p className="text-xs text-slate-500 mb-4">
              Select a patient to link this diagnosis and include their prior reports in the analysis.
            </p>
            <select
              value={patientId ?? ''}
              onChange={(e) => setPatientId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
            >
              <option value="">— Self / No patient —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Symptoms */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Describe Your Symptoms *
          </label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={4}
            required
            placeholder="e.g. I've had a persistent headache for 3 days, mild fever, body aches, and a sore throat..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm resize-none"
          />
          <p className="text-xs text-slate-400 mt-2">
            Be as detailed as possible — include duration, intensity, and any patterns you've noticed.
          </p>
        </div>

        {/* Clinical Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Additional Notes (optional)
          </label>
          <textarea
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            rows={2}
            placeholder="Medical history, current medications, kidney/liver/heart conditions, asthma, pregnancy..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm resize-none"
          />
        </div>

        {/* Vitals */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="w-5 h-5 text-rose-500" />
            <label className="text-sm font-semibold text-slate-900">
              Vital Signs (optional)
            </label>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Add readings from your BP machine, oximeter, or ECG report for more accurate diagnosis.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Systolic BP (mmHg)</label>
              <input
                type="number"
                min={60}
                max={250}
                value={vitals.systolic ?? ''}
                onChange={(e) => setVitals((v) => ({ ...v, systolic: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                placeholder="120"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Diastolic BP (mmHg)</label>
              <input
                type="number"
                min={40}
                max={150}
                value={vitals.diastolic ?? ''}
                onChange={(e) => setVitals((v) => ({ ...v, diastolic: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                placeholder="80"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">SpO2 (%)</label>
              <input
                type="number"
                min={70}
                max={100}
                value={vitals.spo2 ?? ''}
                onChange={(e) => setVitals((v) => ({ ...v, spo2: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                placeholder="98"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Heart rate (bpm)</label>
              <input
                type="number"
                min={40}
                max={200}
                value={vitals.heartRate ?? ''}
                onChange={(e) => setVitals((v) => ({ ...v, heartRate: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                placeholder="72"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Temperature (°F)</label>
              <input
                type="number"
                min={95}
                max={106}
                step={0.1}
                value={vitals.temperature ?? ''}
                onChange={(e) => setVitals((v) => ({ ...v, temperature: e.target.value ? parseFloat(e.target.value) : undefined }))}
                placeholder="98.6"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Resp. rate (/min)</label>
              <input
                type="number"
                min={8}
                max={40}
                value={vitals.respiratoryRate ?? ''}
                onChange={(e) => setVitals((v) => ({ ...v, respiratoryRate: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                placeholder="16"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Blood sugar (mg/dL)</label>
              <input
                type="number"
                min={40}
                max={500}
                value={vitals.bloodSugar ?? ''}
                onChange={(e) => setVitals((v) => ({ ...v, bloodSugar: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                placeholder="100"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Weight (kg)</label>
              <input
                type="number"
                min={20}
                max={300}
                step={0.1}
                value={vitals.weightKg ?? ''}
                onChange={(e) => setVitals((v) => ({ ...v, weightKg: e.target.value ? parseFloat(e.target.value) : undefined }))}
                placeholder="70"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Pain level (0–10)</label>
              <input
                type="number"
                min={0}
                max={10}
                value={vitals.painLevel ?? ''}
                onChange={(e) => setVitals((v) => ({ ...v, painLevel: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-500 mb-1">ECG interpretation / report</label>
            <input
              type="text"
              value={vitals.ecgNotes ?? ''}
              onChange={(e) => setVitals((v) => ({ ...v, ecgNotes: e.target.value || undefined }))}
              placeholder="e.g. Normal sinus rhythm, HR 72, ST elevation in V1-V3..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <label className="block text-sm font-semibold text-slate-900 mb-3">
            Upload Medical Reports (optional)
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-medium">Click to upload files</p>
            <p className="text-xs text-slate-400 mt-1">PDF, Images, X-rays, Lab Reports — AI will analyze uploaded images (Max 50MB each)</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.dcm,.dicom"
            onChange={handleFiles}
            className="hidden"
          />

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(f.size)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeFile(idx)} className="p-1 hover:bg-red-50 rounded-lg text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MedGemma model: 4b (standard) vs 27b (enhanced) */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700">MedGemma model</label>
          <select
            value={modelSize}
            onChange={(e) => setModelSize(e.target.value as '4b' | '27b')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="4b">4B — Quick results (recommended)</option>
            <option value="27b">27B — More detailed analysis</option>
          </select>
          <span className="text-xs text-slate-400">4B is faster; 27B may take longer.</span>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !symptoms.trim()}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing your symptoms...
            </>
          ) : (
            <>
              <Stethoscope className="w-5 h-5" />
              Get AI Diagnosis
            </>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center mt-4">
          Your data is securely processed. This tool provides AI-assisted preliminary analysis only.
        </p>
      </form>
    </div>
  );
}

function ResultCard({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: any;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600',
    violet: 'text-violet-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    cyan: 'text-cyan-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${colorMap[color] || 'text-blue-600'}`} />
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}


const DIET_ICON_STYLE: Record<string, { bg: string; border: string; dot: string; headerText: string }> = {
  green: { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', headerText: 'text-emerald-800' },
  red: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', headerText: 'text-red-800' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', headerText: 'text-blue-800' },
  meal: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', headerText: 'text-amber-800' },
};

function DietaryPlanSection({ plan }: { plan: DietaryCategory[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-slate-900">Dietary Plan</h3>
            <p className="text-xs text-slate-500">Personalized nutrition recommendations for your condition</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {plan.map((category, idx) => {
            const style = DIET_ICON_STYLE[category.icon] || DIET_ICON_STYLE.green;
            return (
              <div key={idx} className={`${style.bg} ${style.border} border rounded-xl p-4`}>
                <h4 className={`font-semibold text-sm ${style.headerText} mb-3`}>{category.category}</h4>
                <ul className="space-y-1.5">
                  {category.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} mt-1.5 flex-shrink-0`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


const ROUTINE_ICON_MAP: Record<string, { icon: any; bg: string; ring: string }> = {
  sunrise: { icon: Sunrise, bg: 'bg-orange-100', ring: 'ring-orange-200' },
  morning: { icon: Coffee, bg: 'bg-amber-100', ring: 'ring-amber-200' },
  sun: { icon: Sun, bg: 'bg-yellow-100', ring: 'ring-yellow-200' },
  afternoon: { icon: Sun, bg: 'bg-sky-100', ring: 'ring-sky-200' },
  evening: { icon: Activity, bg: 'bg-indigo-100', ring: 'ring-indigo-200' },
  moon: { icon: Moon, bg: 'bg-violet-100', ring: 'ring-violet-200' },
};

function RoutinePlanSection({ plan }: { plan: RoutineBlock[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-slate-900">Daily Routine Plan</h3>
            <p className="text-xs text-slate-500">Structured daily schedule to support your recovery</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-6 pb-6">
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

            <div className="space-y-4">
              {plan.map((block, idx) => {
                const routineStyle = ROUTINE_ICON_MAP[block.icon] || ROUTINE_ICON_MAP.sun;
                const Icon = routineStyle.icon;
                return (
                  <div key={idx} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className={`relative z-10 w-10 h-10 rounded-full ${routineStyle.bg} ring-4 ${routineStyle.ring} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-slate-700" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <h4 className="font-semibold text-sm text-slate-800 mb-2">{block.time}</h4>
                      <ul className="space-y-1">
                        {block.activities.map((activity, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-slate-400 mt-0.5 flex-shrink-0">•</span>
                            {activity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const AYUR_CATEGORY_STYLE: Record<string, { bg: string; border: string; badge: string; badgeText: string; icon: any }> = {
  classical: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100', badgeText: 'text-amber-800', icon: BookOpen },
  patent: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100', badgeText: 'text-orange-800', icon: FlaskConical },
  single_herb: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100', badgeText: 'text-green-800', icon: Leaf },
  home_remedy: { bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-100', badgeText: 'text-teal-800', icon: Home },
};

const AYUR_CATEGORY_LABEL: Record<string, string> = {
  classical: 'Classical Formulation',
  patent: 'Patent Medicine',
  single_herb: 'Single Herb',
  home_remedy: 'Home Remedy',
};

function AyurvedicMedicinesSection({ medicines }: { medicines: AyurvedicMedicine[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-slate-900">Ayurvedic Medicines</h3>
            <p className="text-xs text-slate-500">Traditional Ayurvedic formulations and herbal remedies for your condition</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-6 pb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-amber-700">
              These are traditional Ayurvedic references. Always consult a qualified Ayurvedic practitioner (BAMS) before starting any Ayurvedic treatment. Do not replace prescribed allopathic medicines without medical advice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {medicines.map((med, idx) => {
              const style = AYUR_CATEGORY_STYLE[med.category] || AYUR_CATEGORY_STYLE.classical;
              const CatIcon = style.icon;
              return (
                <div key={idx} className={`${style.bg} ${style.border} border rounded-xl p-4`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-sm text-slate-900 leading-tight">{med.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.badge} ${style.badgeText} flex items-center gap-1 flex-shrink-0 whitespace-nowrap`}>
                      <CatIcon className="w-3 h-3" />
                      {AYUR_CATEGORY_LABEL[med.category] || med.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2 italic">{med.form}</p>
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-600">
                      <span className="font-medium text-slate-700">Dosage:</span> {med.dosage}
                    </p>
                    <p className="text-xs text-slate-600">
                      <span className="font-medium text-slate-700">Frequency:</span> {med.frequency}
                    </p>
                    <p className="text-xs text-slate-600">
                      <span className="font-medium text-slate-700">Duration:</span> {med.duration}
                    </p>
                  </div>
                  {med.notes && (
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed border-t border-slate-200/60 pt-2">
                      {med.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

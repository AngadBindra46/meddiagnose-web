import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { medicationApi } from '../lib/api';
import {
  Pill, Search, X, Loader2, AlertTriangle, Activity,
  Heart, ShieldAlert, Stethoscope, Plus,
  Thermometer, HeartPulse, Wind, Droplets, ChevronDown, ChevronUp,
} from 'lucide-react';

const SEV_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  mild: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  severe: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

interface DiseaseMatch {
  disease: string;
  matched_medications: string[];
  total_disease_medications: number;
  severity: string;
  urgency: string;
  confidence: number;
  reasoning: string;
  recommended_tests: string[];
  when_to_see_doctor: string;
  all_medications: any[];
  lifestyle_recommendations: string[];
  precautions: string[];
}

interface LookupResult {
  matches: DiseaseMatch[];
  medications_searched: string[];
  total_matches: number;
}

const ALL_KNOWN_MEDICATIONS = [
  'Paracetamol', 'Cetirizine', 'Strepsils', 'Ibuprofen',
  'Pantoprazole', 'Ondansetron', 'ORS', 'Levocetirizine',
  'Fluticasone Nasal Spray', 'Nitrofurantoin', 'Cranberry Extract',
  'Diclofenac', 'Thiocolchicoside', 'Diclofenac Gel', 'Amlodipine',
  'Telmisartan', 'Metformin', 'Vitamin B12', 'Hydrocortisone Cream',
  'Calamine Lotion', 'Escitalopram', 'Propranolol', 'Melatonin',
  'Moxifloxacin Eye Drops', 'Refresh Tears', 'Olopatadine Eye Drops',
  'Ferrous Sulfate', 'Folic Acid', 'Domperidone', 'Antacid Gel',
  'Glucosamine + Chondroitin', 'Amoxicillin + Clavulanate',
  'Montelukast', 'Salbutamol Inhaler', 'Guaifenesin Syrup',
  'Levothyroxine', 'Budesonide + Formoterol Inhaler',
  'Sumatriptan', 'Naproxen', 'Tamsulosin', 'Potassium Citrate',
  'Sertraline', 'Vitamin D3', 'Amoxicillin', 'Clarithromycin',
  'Esomeprazole', 'Sucralfate', 'Pregabalin', 'Methylcobalamin',
  'Artemether + Lumefantrine', 'Primaquine',
  'Doxylamine + Vitamin B6', 'Ginger Capsules',
  'Acyclovir', 'Prednisolone', 'Epinephrine Auto-Injector',
  'Calcium + Vitamin D3', 'Zolpidem',
  'Ciprofloxacin Ear Drops',
  'Colchicine', 'Allopurinol', 'Febuxostat',
  'Azithromycin', 'Cefixime',
  'Isoniazid', 'Rifampicin', 'Pyrazinamide', 'Ethambutol', 'Pyridoxine',
  'Betahistine', 'Cinnarizine',
  'Mebeverine', 'Rifaximin', 'Psyllium Husk',
  'Hyoscine Butylbromide', 'Ursodeoxycholic Acid',
  'Clobetasol Cream', 'Calcipotriol Cream', 'Methotrexate', 'Coal Tar Shampoo',
  'Valacyclovir',
  'Tiotropium Inhaler', 'Fluticasone + Salmeterol Inhaler',
  'Betadine Gargle',
  'Levetiracetam', 'Sodium Valproate', 'Clobazam',
  'Omega-3 Supplements', 'Cyclosporine Eye Drops',
  'Permethrin Cream', 'Ivermectin',
  'Spironolactone', 'Lactulose Syrup',
];

const COMMON_MEDICATIONS = [
  'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Metformin', 'Amlodipine',
  'Pantoprazole', 'Cetirizine', 'Diclofenac', 'Levothyroxine', 'Salbutamol Inhaler',
  'Sertraline', 'Prednisolone', 'Montelukast', 'Acyclovir', 'Melatonin',
];

export default function MedicationLookupPage() {
  const [medications, setMedications] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [showVitals, setShowVitals] = useState(false);
  const [temperatureF, setTemperatureF] = useState('');
  const [systolicBp, setSystolicBp] = useState('');
  const [diastolicBp, setDiastolicBp] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const suggestions = inputValue.trim().length >= 1
    ? ALL_KNOWN_MEDICATIONS.filter(
        (m) =>
          m.toLowerCase().includes(inputValue.trim().toLowerCase()) &&
          !medications.some((added) => added.toLowerCase() === m.toLowerCase()),
      )
    : [];

  useEffect(() => {
    setHighlightedIdx(-1);
  }, [inputValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addMedication = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (medications.some((m) => m.toLowerCase() === trimmed.toLowerCase())) return;
    setMedications((prev) => [...prev, trimmed]);
    setInputValue('');
    setShowSuggestions(false);
    setHighlightedIdx(-1);
  };

  const removeMedication = (idx: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIdx >= 0 && highlightedIdx < suggestions.length) {
        addMedication(suggestions[highlightedIdx]);
      } else if (inputValue.trim()) {
        addMedication(inputValue);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const parseNum = (v: string) => v.trim() ? Number(v) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (medications.length === 0) {
      setError('Please add at least one medication');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    setExpandedIdx(null);
    try {
      const res = await medicationApi.identify(medications, {
        symptoms: symptoms.trim() || undefined,
        temperature_f: parseNum(temperatureF),
        systolic_bp: parseNum(systolicBp) as number | null,
        diastolic_bp: parseNum(diastolicBp) as number | null,
        heart_rate: parseNum(heartRate) as number | null,
        spo2: parseNum(spo2) as number | null,
        blood_sugar: parseNum(bloodSugar) as number | null,
        respiratory_rate: parseNum(respiratoryRate) as number | null,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Lookup failed. Please try again.');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setMedications([]);
    setInputValue('');
    setSymptoms('');
    setTemperatureF('');
    setSystolicBp('');
    setDiastolicBp('');
    setHeartRate('');
    setSpo2('');
    setBloodSugar('');
    setRespiratoryRate('');
    setShowVitals(false);
    setResult(null);
    setError('');
    setExpandedIdx(null);
  };

  if (result) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Medication Analysis Results</h1>
          <p className="text-slate-500 text-sm mt-1">
            Possible conditions based on your medications: {result.medications_searched.join(', ')}
          </p>
        </div>

        {result.total_matches === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center mb-6">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Matching Conditions Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              The medications you entered didn't match any known disease profiles in our database.
              Please verify the medication names and try again.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {result.matches.map((match, idx) => {
              const sev = SEV_STYLE[match.severity] || SEV_STYLE.mild;
              const isExpanded = expandedIdx === idx;

              return (
                <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="w-full p-6 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-slate-900">{match.disease}</span>
                        </div>
                        <p className="text-sm text-slate-500">
                          Matched {match.matched_medications.length} of {match.total_disease_medications} medications:
                          <span className="font-medium text-slate-700 ml-1">{match.matched_medications.join(', ')}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize ${sev.bg} ${sev.text} border ${sev.border}`}>
                          {match.severity}
                        </span>
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {Math.round(match.confidence * 100)}% match
                        </span>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize ${
                          match.urgency === 'urgent' || match.urgency === 'emergency'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {match.urgency}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-6 bg-slate-50/30">
                      {/* Reasoning */}
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-2">
                          <Stethoscope className="w-4 h-4 text-blue-600" />
                          <h4 className="font-semibold text-slate-900 text-sm">Analysis</h4>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{match.reasoning}</p>
                      </div>

                      {/* All Medications for this disease */}
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-2">
                          <Pill className="w-4 h-4 text-violet-600" />
                          <h4 className="font-semibold text-slate-900 text-sm">Typical Medications for This Condition</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {match.all_medications.map((m: any, i: number) => {
                            const isMatched = match.matched_medications.some(
                              (mm) => m.name.toLowerCase().includes(mm.toLowerCase()),
                            );
                            return (
                              <div key={i} className={`rounded-xl p-3 border ${
                                isMatched
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-white border-slate-100'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-900 text-sm">{m.name}</p>
                                  {isMatched && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                                      MATCH
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{m.dosage} — {m.frequency}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                        {/* Lifestyle */}
                        {match.lifestyle_recommendations?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Heart className="w-4 h-4 text-emerald-600" />
                              <h4 className="font-semibold text-slate-900 text-sm">Lifestyle Recommendations</h4>
                            </div>
                            <ul className="space-y-1.5">
                              {match.lifestyle_recommendations.map((l, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 flex-shrink-0" />
                                  {l}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Precautions */}
                        {match.precautions?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <ShieldAlert className="w-4 h-4 text-amber-600" />
                              <h4 className="font-semibold text-slate-900 text-sm">Precautions</h4>
                            </div>
                            <ul className="space-y-1.5">
                              {match.precautions.map((p, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 flex-shrink-0" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Recommended Tests */}
                      {match.recommended_tests?.length > 0 && (
                        <div className="mb-5">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-cyan-600" />
                            <h4 className="font-semibold text-slate-900 text-sm">Recommended Tests</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {match.recommended_tests.map((t, i) => (
                              <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-100">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* When to See Doctor */}
                      {match.when_to_see_doctor && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-semibold text-amber-800 text-sm mb-1">When to See a Doctor</h4>
                              <p className="text-xs text-amber-700">{match.when_to_see_doctor}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
          <p className="text-xs text-slate-500 text-center">
            This is an AI-generated preliminary assessment based on medication profiles.
            It should not replace professional medical advice. Always consult a qualified healthcare provider.
          </p>
        </div>

        <button
          onClick={resetForm}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Search Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Medication Lookup</h1>
        <p className="text-slate-500 text-sm mt-1">
          Enter your current medications to identify possible conditions they may be treating
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        {/* Medication input */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Your Medications *
          </label>

          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Start typing a medication name..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                >
                  {suggestions.map((med, idx) => {
                    const matchStart = med.toLowerCase().indexOf(inputValue.toLowerCase());
                    const before = med.slice(0, matchStart);
                    const match = med.slice(matchStart, matchStart + inputValue.length);
                    const after = med.slice(matchStart + inputValue.length);

                    return (
                      <button
                        key={med}
                        type="button"
                        onClick={() => addMedication(med)}
                        onMouseEnter={() => setHighlightedIdx(idx)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                          idx === highlightedIdx
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        } ${idx === 0 ? 'rounded-t-xl' : ''} ${idx === suggestions.length - 1 ? 'rounded-b-xl' : ''}`}
                      >
                        <Pill className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>
                          {before}<span className="font-bold text-blue-600">{match}</span>{after}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => addMedication(inputValue)}
              disabled={!inputValue.trim()}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Add</span>
            </button>
          </div>

          {/* Medication tags */}
          {medications.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {medications.map((med, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium"
                >
                  <Pill className="w-3.5 h-3.5" />
                  {med}
                  <button
                    type="button"
                    onClick={() => removeMedication(idx)}
                    className="ml-0.5 p-0.5 hover:bg-blue-200/50 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400 mt-2">
            Add all medications you are currently taking. Include both prescription and OTC medicines.
          </p>
        </div>

        {/* Quick-add common medications */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <label className="block text-sm font-semibold text-slate-900 mb-3">
            Quick Add Common Medications
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_MEDICATIONS.map((med) => {
              const isAdded = medications.some((m) => m.toLowerCase() === med.toLowerCase());
              return (
                <button
                  key={med}
                  type="button"
                  onClick={() => !isAdded && addMedication(med)}
                  disabled={isAdded}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isAdded
                      ? 'bg-blue-100 text-blue-400 border-blue-200 cursor-default'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                  }`}
                >
                  {isAdded ? '✓ ' : '+ '}{med}
                </button>
              );
            })}
          </div>
        </div>

        {/* Symptoms */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-violet-500" />
              Describe Your Symptoms (optional)
            </div>
          </label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={3}
            placeholder="e.g. I've been having headaches for 3 days, mild fever, body aches, sore throat..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-sm resize-none"
          />
          <p className="text-xs text-slate-400 mt-2">
            Adding symptoms helps the AI correlate your medications with potential conditions more accurately.
          </p>
        </div>

        {/* Basic Health Vitals */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <button
            type="button"
            onClick={() => setShowVitals(!showVitals)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-semibold text-slate-900">Basic Health Check (optional)</span>
              {(temperatureF || systolicBp || heartRate || spo2 || bloodSugar || respiratoryRate) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                  Data entered
                </span>
              )}
            </div>
            {showVitals
              ? <ChevronUp className="w-4 h-4 text-slate-400" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showVitals && (
            <div className="px-6 pb-6 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400 mb-4">
                Enter any available vitals to improve the analysis. All fields are optional.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Temperature */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                    Temperature
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={temperatureF}
                      onChange={(e) => setTemperatureF(e.target.value)}
                      placeholder="98.6"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">°F</span>
                  </div>
                </div>

                {/* Blood Pressure */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                    BP (Systolic)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={systolicBp}
                      onChange={(e) => setSystolicBp(e.target.value)}
                      placeholder="120"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-none text-sm pr-14"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">mmHg</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                    BP (Diastolic)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={diastolicBp}
                      onChange={(e) => setDiastolicBp(e.target.value)}
                      placeholder="80"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-none text-sm pr-14"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">mmHg</span>
                  </div>
                </div>

                {/* Heart Rate */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                    Heart Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      placeholder="72"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 outline-none text-sm pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">bpm</span>
                  </div>
                </div>

                {/* SpO2 */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <Wind className="w-3.5 h-3.5 text-blue-500" />
                    SpO2 (Oxygen)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      placeholder="98"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none text-sm pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                  </div>
                </div>

                {/* Blood Sugar */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <Droplets className="w-3.5 h-3.5 text-purple-500" />
                    Blood Sugar
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bloodSugar}
                      onChange={(e) => setBloodSugar(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none text-sm pr-14"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">mg/dL</span>
                  </div>
                </div>

                {/* Respiratory Rate */}
                <div className="col-span-2 sm:col-span-1 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <Wind className="w-3.5 h-3.5 text-teal-500" />
                    Resp. Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(e.target.value)}
                      placeholder="16"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 outline-none text-sm pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">/min</span>
                  </div>
                </div>
              </div>

              {/* Normal ranges reference */}
              <div className="mt-4 bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Normal Ranges (Adult)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  <span>Temp: 97.8 – 99.1 °F</span>
                  <span>BP: 90/60 – 120/80</span>
                  <span>HR: 60 – 100 bpm</span>
                  <span>SpO2: 95 – 100%</span>
                  <span>Sugar: 70 – 140 mg/dL</span>
                  <span>Resp: 12 – 20 /min</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || medications.length === 0}
          className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing medications...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Identify Possible Conditions
            </>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center mt-4">
          This tool provides AI-assisted preliminary analysis based on medication profiles, symptoms, and vitals.
        </p>
      </form>
    </div>
  );
}

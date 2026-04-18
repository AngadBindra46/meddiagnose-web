import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pharmacyApi } from '../lib/api';
import {
  MapPin, Pill, Search, X, Loader2, Phone, Clock, Navigation,
  Plus, CheckCircle2, XCircle, ExternalLink, LocateFixed,
  MessageCircle, Store,
} from 'lucide-react';

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

interface PharmacyResult {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  phone: string;
  hours: string;
  is_24hr: boolean;
  distance_km: number | null;
  available_medications: string[];
  unavailable_medications: string[];
  availability_ratio: number;
  photo_url: string;
}

interface SearchResult {
  pharmacies: PharmacyResult[];
  medications_searched: string[];
  total_results: number;
  is_nationwide_fallback: boolean;
}

const COMMON_MEDICATIONS = [
  'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Metformin', 'Amlodipine',
  'Pantoprazole', 'Cetirizine', 'Diclofenac', 'Levothyroxine', 'Salbutamol Inhaler',
  'Vitamin D3', 'Vitamin B12', 'Sertraline', 'Montelukast', 'ORS',
];

export default function PharmacyLocatorPage() {
  const [searchParams] = useSearchParams();
  const medsFromUrl = searchParams.get('medications');
  const [medications, setMedications] = useState<string[]>(() => {
    if (medsFromUrl) {
      const list = medsFromUrl.split(',').map((m) => m.trim()).filter(Boolean);
      return list.length ? list : [];
    }
    return [];
  });
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');
  const [radiusKm, setRadiusKm] = useState(50);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
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

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocationStatus('granted');
      },
      () => {
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (medications.length === 0) {
      setError('Please add at least one medication');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await pharmacyApi.nearby(medications, userLat, userLng, radiusKm);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Search failed. Please try again.');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setMedications([]);
    setInputValue('');
    setResult(null);
    setError('');
  };

  const openDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  // ── Results view ──────────────────────────────────────────────
  if (result) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Nearby Pharmacies</h1>
          <p className="text-slate-500 text-sm mt-1">
            {result.total_results} store{result.total_results !== 1 ? 's' : ''} found with your medications:
            {' '}{result.medications_searched.join(', ')}
          </p>
        </div>

        {result.is_nationwide_fallback && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                No pharmacies found within your search radius
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Showing all matching pharmacies across India instead. You can order online or plan a visit.
              </p>
            </div>
          </div>
        )}

        {result.total_results === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center mb-6">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Pharmacies Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {locationStatus === 'granted'
                ? `No pharmacies within ${radiusKm} km stock your medications. Try increasing the search radius.`
                : 'No matching pharmacies found. Try enabling location access for better results or check the medication names.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5 mb-6">
            {result.pharmacies.map((pharmacy) => {
              const allAvailable = pharmacy.unavailable_medications.length === 0;
              const whatsappNumber = pharmacy.phone.replace(/[\s\-()]/g, '').replace('+', '');
              return (
                <div key={pharmacy.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {/* Store photo + overlay badges */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-100 to-teal-50 overflow-hidden">
                    {pharmacy.photo_url ? (
                      <img
                        src={pharmacy.photo_url}
                        alt={pharmacy.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`${pharmacy.photo_url ? 'hidden' : ''} absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-teal-500`}>
                      <Store className="w-12 h-12 text-white/70 mb-2" />
                      <span className="text-white/80 text-sm font-medium">Pharmacy Storefront</span>
                    </div>

                    {/* Overlay badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      {pharmacy.is_24hr && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-lg">
                          24 HRS
                        </span>
                      )}
                      {pharmacy.distance_km != null && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 text-blue-700 shadow-lg backdrop-blur-sm">
                          {pharmacy.distance_km} km away
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg backdrop-blur-sm ${
                        allAvailable
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}>
                        {Math.round(pharmacy.availability_ratio * 100)}% in stock
                      </span>
                    </div>

                    {/* Dark gradient overlay at bottom for readability */}
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-lg font-bold text-white drop-shadow-md leading-tight">{pharmacy.name}</h3>
                      <div className="flex items-center gap-1.5 text-white/85 text-xs mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{pharmacy.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Prominent contact section */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                      <a
                        href={`tel:${pharmacy.phone}`}
                        className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-sm text-sm"
                      >
                        <Phone className="w-4.5 h-4.5" />
                        <span>Call Now &middot; {pharmacy.phone}</span>
                      </a>
                      <a
                        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I'd like to check medication availability at ${pharmacy.name}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#1fb855] transition-colors shadow-sm text-sm"
                      >
                        <MessageCircle className="w-4.5 h-4.5" />
                        WhatsApp
                      </a>
                    </div>

                    {/* Info row */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{pharmacy.hours}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-slate-400" />
                        <span>{pharmacy.city}, {pharmacy.state}</span>
                      </div>
                    </div>

                    {/* Medication availability */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">
                          In Stock ({pharmacy.available_medications.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {pharmacy.available_medications.map((med, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3" />
                              {med}
                            </span>
                          ))}
                        </div>
                      </div>

                      {pharmacy.unavailable_medications.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1.5">
                            Not Available ({pharmacy.unavailable_medications.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {pharmacy.unavailable_medications.map((med, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                                <XCircle className="w-3 h-3" />
                                {med}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => openDirections(pharmacy.latitude, pharmacy.longitude)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Get Directions
                      </button>
                      <a
                        href={`tel:${pharmacy.phone}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call Again
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
          <p className="text-xs text-slate-500 text-center">
            Stock availability is indicative and may change. Please call the pharmacy to confirm before visiting.
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

  // ── Input form ────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Find Nearby Pharmacies</h1>
        <p className="text-slate-500 text-sm mt-1">
          Enter your medications to find the nearest stores that have them in stock
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        {/* Location status */}
        <div className={`rounded-2xl p-4 mb-4 flex items-center justify-between ${
          locationStatus === 'granted'
            ? 'bg-emerald-50 border border-emerald-200'
            : locationStatus === 'denied'
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <LocateFixed className={`w-5 h-5 ${
              locationStatus === 'granted' ? 'text-emerald-600'
              : locationStatus === 'denied' ? 'text-amber-600'
              : 'text-blue-600 animate-pulse'
            }`} />
            <div>
              <p className={`text-sm font-medium ${
                locationStatus === 'granted' ? 'text-emerald-800'
                : locationStatus === 'denied' ? 'text-amber-800'
                : 'text-blue-800'
              }`}>
                {locationStatus === 'granted' && 'Location detected — results will be sorted by distance'}
                {locationStatus === 'denied' && 'Location access denied — showing all pharmacies across India'}
                {locationStatus === 'loading' && 'Detecting your location...'}
                {locationStatus === 'idle' && 'Requesting location access...'}
              </p>
              {locationStatus === 'granted' && userLat != null && userLng != null && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  Coordinates: {userLat.toFixed(4)}, {userLng.toFixed(4)}
                </p>
              )}
            </div>
          </div>
          {locationStatus === 'denied' && (
            <button
              type="button"
              onClick={requestLocation}
              className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
            >
              Retry
            </button>
          )}
        </div>

        {/* Medication input */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Medications You Need *
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
            Add all medications you need to purchase. We'll find stores that stock them.
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

        {/* Search radius */}
        {locationStatus === 'granted' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Search Radius: {radiusKm} km
            </label>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>5 km</span>
              <span>100 km</span>
              <span>200 km</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || medications.length === 0}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Searching nearby pharmacies...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Find Pharmacies
            </>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center mt-4">
          Stock availability is indicative. Please call ahead to confirm.
        </p>
      </form>
    </div>
  );
}

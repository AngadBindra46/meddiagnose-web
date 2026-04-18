import { useEffect, useState } from 'react';
import { doctorApi, DoctorSummary } from '../lib/api';
import { Stethoscope, Search, Link2, Unlink, Loader2, Check } from 'lucide-react';

export default function MyDoctorPage() {
  const [linkedDoctor, setLinkedDoctor] = useState<DoctorSummary | null | undefined>(undefined);
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<number | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState('');

  const loadLinked = async () => {
    try {
      const r = await doctorApi.getLinked();
      setLinkedDoctor(r.data ?? null);
    } catch {
      setLinkedDoctor(null);
    }
  };

  const loadDoctors = async () => {
    try {
      const r = await doctorApi.list(search ? { search } : undefined);
      setDoctors(r.data);
    } catch {
      setDoctors([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadLinked(), loadDoctors()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) loadDoctors();
  }, [search]);

  const handleLink = async (doctorId: number) => {
    setError('');
    setLinking(doctorId);
    try {
      await doctorApi.link(doctorId);
      await loadLinked();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to link. Please try again.');
    }
    setLinking(null);
  };

  const handleUnlink = async () => {
    setError('');
    setUnlinking(true);
    try {
      await doctorApi.unlink();
      setLinkedDoctor(null);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to unlink. Please try again.');
    }
    setUnlinking(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Doctor</h1>
        <p className="text-slate-500 text-sm mt-1">
          Link your account to a doctor so they can view your diagnoses and health history
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {linkedDoctor ? (
        <div className="mb-8 p-6 rounded-2xl border border-slate-200 bg-emerald-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Stethoscope className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{linkedDoctor.full_name}</p>
                <p className="text-slate-500 text-sm">{linkedDoctor.email}</p>
                <span className="inline-flex items-center gap-1 mt-2 text-emerald-600 text-sm font-medium">
                  <Check className="w-4 h-4" /> Linked
                </span>
              </div>
            </div>
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              {unlinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
              Unlink
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 rounded-2xl border border-slate-200 bg-slate-50">
          <p className="text-slate-600 mb-4">You are not linked to a doctor yet. Search and select one below.</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Find a Doctor</h2>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {doctors.length === 0 ? (
          <p className="text-slate-500 py-8 text-center">No doctors found. Try a different search.</p>
        ) : (
          <div className="space-y-3">
            {doctors.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{d.full_name}</p>
                    <p className="text-slate-500 text-sm">{d.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleLink(d.id)}
                  disabled={linking !== null || linkedDoctor?.id === d.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {linking === d.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  {linkedDoctor?.id === d.id ? 'Linked' : 'Link'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

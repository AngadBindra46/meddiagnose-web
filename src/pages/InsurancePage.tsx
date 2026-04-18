import { useEffect, useState } from 'react';
import { insuranceApi } from '../lib/api';
import { Shield, Plus, Receipt, Send, Calendar } from 'lucide-react';

interface Policy {
  id: number;
  provider_type: string;
  provider_name: string;
  policy_number: string;
  member_id: string | null;
  sum_insured: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_primary: boolean;
  scheme_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface Bill {
  id: number;
  policy_id: number | null;
  bill_date: string;
  hospital_name: string;
  hospital_address: string | null;
  treatment_description: string | null;
  amount_total: number;
  created_at: string;
  claim_ids: number[];
}

interface Claim {
  id: number;
  policy_id: number;
  bill_id: number;
  claim_type: string;
  status: string;
  reference_number: string | null;
  amount_claimed: number;
  amount_approved: number | null;
  amount_paid: number | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  created_at: string;
}

interface Provider {
  id: string;
  name: string;
  type: string;
  description: string;
}

const TABS = ['Policies', 'Bills', 'Claims'] as const;
type Tab = (typeof TABS)[number];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function InsurancePage() {
  const [tab, setTab] = useState<Tab>('Policies');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showCreateClaim, setShowCreateClaim] = useState(false);
  const [claimBillId, setClaimBillId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      insuranceApi.policies(),
      insuranceApi.bills(),
      insuranceApi.claims(),
      insuranceApi.providers(),
    ])
      .then(([p, b, c, pr]) => {
        setPolicies(p.data);
        setBills(b.data);
        setClaims(c.data);
        setProviders(pr.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const handleAddPolicy = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      provider_type: fd.get('provider_type') as string,
      provider_name: fd.get('provider_name') as string,
      policy_number: fd.get('policy_number') as string,
      member_id: (fd.get('member_id') as string) || undefined,
      sum_insured: fd.get('sum_insured') ? parseFloat(fd.get('sum_insured') as string) : undefined,
      valid_from: fd.get('valid_from') || undefined,
      valid_until: fd.get('valid_until') || undefined,
      is_primary: true,
    };
    setSubmitting(true);
    insuranceApi.createPolicy(data).then(() => { setShowAddPolicy(false); load(); }).finally(() => setSubmitting(false));
  };

  const handleAddBill = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      policy_id: fd.get('policy_id') ? parseInt(fd.get('policy_id') as string) : undefined,
      bill_date: fd.get('bill_date') as string,
      hospital_name: fd.get('hospital_name') as string,
      hospital_address: (fd.get('hospital_address') as string) || undefined,
      treatment_description: (fd.get('treatment_description') as string) || undefined,
      amount_total: parseFloat(fd.get('amount_total') as string),
    };
    setSubmitting(true);
    insuranceApi.createBill(data).then(() => { setShowAddBill(false); load(); }).finally(() => setSubmitting(false));
  };

  const handleSubmitClaim = (claimId: number) => {
    setSubmitting(true);
    insuranceApi.submitClaim(claimId).then(() => load()).finally(() => setSubmitting(false));
  };

  const handleCreateClaim = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      policy_id: parseInt(fd.get('policy_id') as string),
      bill_id: claimBillId!,
      claim_type: fd.get('claim_type') as string,
    };
    setSubmitting(true);
    insuranceApi.createClaim(data).then(() => { setShowCreateClaim(false); setClaimBillId(null); load(); }).finally(() => setSubmitting(false));
  };

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');
  const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  if (loading && policies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insurance & Claims</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your policies, add bills, and submit claims for reimbursement or cashless
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t ? 'bg-white border border-b-0 border-slate-200 text-blue-600 -mb-px' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Policies */}
      {tab === 'Policies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddPolicy(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Policy
            </button>
          </div>
          {policies.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No insurance policies added yet</p>
              <p className="text-slate-400 text-sm mt-1">Add your government or private insurance to submit claims</p>
              <button
                onClick={() => setShowAddPolicy(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Add Policy
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {policies.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="p-3 rounded-xl bg-blue-50">
                        <Shield className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{p.provider_name}</p>
                        <p className="text-sm text-slate-500">Policy: {p.policy_number}</p>
                        {p.member_id && <p className="text-sm text-slate-500">Member ID: {p.member_id}</p>}
                        {p.sum_insured && <p className="text-sm text-emerald-600 mt-1">{formatCurrency(p.sum_insured)} coverage</p>}
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(p.valid_from)} – {formatDate(p.valid_until)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${p.provider_type === 'government' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {p.provider_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bills */}
      {tab === 'Bills' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddBill(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Bill
            </button>
          </div>
          {bills.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No medical bills added</p>
              <p className="text-slate-400 text-sm mt-1">Add bills to submit insurance claims</p>
              <button
                onClick={() => setShowAddBill(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Add Bill
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {bills.map((b) => (
                <div key={b.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{b.hospital_name}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-4 h-4" /> {formatDate(b.bill_date)}
                      </p>
                      {b.treatment_description && <p className="text-sm text-slate-600 mt-1">{b.treatment_description}</p>}
                      <p className="text-lg font-bold text-emerald-600 mt-2">{formatCurrency(b.amount_total)}</p>
                      {b.claim_ids.length > 0 && (
                        <p className="text-xs text-slate-400 mt-1">{b.claim_ids.length} claim(s) filed</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setClaimBillId(b.id); setShowCreateClaim(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      <Send className="w-4 h-4" /> File Claim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Claims */}
      {tab === 'Claims' && (
        <div className="space-y-4">
          {claims.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <Send className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No claims yet</p>
              <p className="text-slate-400 text-sm mt-1">Add a bill, then create and submit a claim from the Bills tab</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {claims.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">Claim #{c.id}</p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[c.status] || 'bg-slate-100'}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {c.claim_type} • {formatCurrency(c.amount_claimed)}
                      </p>
                      {c.reference_number && <p className="text-sm text-blue-600 mt-1">Ref: {c.reference_number}</p>}
                      {c.rejection_reason && <p className="text-sm text-red-600 mt-1">{c.rejection_reason}</p>}
                    </div>
                    {c.status === 'draft' && (
                      <button
                        onClick={() => handleSubmitClaim(c.id)}
                        disabled={submitting}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50"
                      >
                        {submitting ? <span className="animate-spin">⏳</span> : <Send className="w-4 h-4" />}
                        Submit to Insurer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Policy Modal */}
      {showAddPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Add Insurance Policy</h2>
              <p className="text-sm text-slate-500 mt-1">Government (PM-JAY, CGHS) or private insurer</p>
            </div>
            <form onSubmit={handleAddPolicy} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Provider Type</label>
                <select name="provider_type" required className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                  <option value="government">Government</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Provider / Scheme</label>
                <select name="provider_name" required className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                  {providers.map((pr) => (
                    <option key={pr.id} value={pr.name}>{pr.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Policy Number *</label>
                <input name="policy_number" required className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="e.g. PMJAY123456" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Member / Beneficiary ID</label>
                <input name="member_id" className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sum Insured (₹)</label>
                <input name="sum_insured" type="number" min="0" step="1000" className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="e.g. 500000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valid From</label>
                  <input name="valid_from" type="date" className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
                  <input name="valid_until" type="date" className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddPolicy(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Adding…' : 'Add Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bill Modal */}
      {showAddBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Add Medical Bill</h2>
              <p className="text-sm text-slate-500 mt-1">Add a bill to submit for insurance claim</p>
            </div>
            <form onSubmit={handleAddBill} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link to Policy (optional)</label>
                <select name="policy_id" className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                  <option value="">— Select policy —</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>{p.provider_name} - {p.policy_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bill Date *</label>
                <input name="bill_date" type="date" required className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hospital / Clinic Name *</label>
                <input name="hospital_name" required className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="e.g. Apollo Hospital" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Treatment Description</label>
                <input name="treatment_description" className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="e.g. Fever, blood tests" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Amount (₹) *</label>
                <input name="amount_total" type="number" required min="0" step="0.01" className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="e.g. 15000" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddBill(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Adding…' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Claim Modal */}
      {showCreateClaim && claimBillId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">File Insurance Claim</h2>
              <p className="text-sm text-slate-500 mt-1">Select policy and claim type</p>
            </div>
            <form onSubmit={handleCreateClaim} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Policy *</label>
                <select name="policy_id" required className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                  <option value="">— Select policy —</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>{p.provider_name} - {p.policy_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Claim Type *</label>
                <select name="claim_type" required className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                  <option value="reimbursement">Reimbursement (pay first, claim later)</option>
                  <option value="cashless">Cashless (direct settlement at hospital)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowCreateClaim(false); setClaimBillId(null); }} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || policies.length === 0} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Creating…' : 'Create Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

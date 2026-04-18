import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../lib/api';
import { Search, ChevronLeft, ChevronRight, Shield, ShieldOff, Users } from 'lucide-react';

interface UserRow {
  id: number; email: string; full_name: string; role: string;
  gender: string | null; blood_group: string | null; is_active: boolean;
  created_at: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFeedback, setActionFeedback] = useState<'success' | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.users({ page, per_page: 15, search, role: roleFilter });
      setUsers(r.data.items);
      setTotal(r.data.total);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load users. Please try again.');
    }
    setLoading(false);
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id: number) => {
    setError('');
    setActionFeedback('');
    try {
      await adminApi.toggleActive(id);
      setActionFeedback('success');
      load();
      setTimeout(() => setActionFeedback(''), 3000);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update user status.');
    }
  };

  const changeRole = async (id: number, role: string) => {
    setError('');
    setActionFeedback('');
    try {
      await adminApi.changeRole(id, role);
      setActionFeedback('success');
      load();
      setTimeout(() => setActionFeedback(''), 3000);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to change role.');
    }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500 text-sm mt-1">View and manage all registered users</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}
      {actionFeedback === 'success' && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm">
          Changes saved successfully.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" placeholder="Search by name or email..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-blue-500 outline-none">
            <option value="">All Roles</option>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
        ) : error && users.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium">Try again</button>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No users found</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              {search || roleFilter ? 'Try adjusting your search or filters.' : 'No users have registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Gender</th>
                  <th className="px-6 py-3">Blood</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{u.full_name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white capitalize">
                        {['patient', 'doctor', 'admin', 'reviewer'].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{u.gender || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{u.blood_group || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleActive(u.id)} title={u.is_active ? 'Deactivate' : 'Activate'}
                        className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'hover:bg-red-50 text-red-400 hover:text-red-600' : 'hover:bg-emerald-50 text-emerald-400 hover:text-emerald-600'}`}>
                        {u.is_active ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">{total} users total</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm text-slate-600">Page {page} of {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

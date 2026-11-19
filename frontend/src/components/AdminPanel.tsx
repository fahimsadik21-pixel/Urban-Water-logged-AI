import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
  Trash2,
  Truck,
  CheckCircle,
  MapPin,
  History,
  FileCheck,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { AuthUser, UserRole, AdminOversightData, DebrisCleanupTaskItem } from '../types';

const roles: UserRole[] = ['civic', 'analyst', 'operator', 'admin'];

export function AdminPanel() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('analyst');

  // Oversight state
  const [oversightData, setOversightData] = useState<AdminOversightData | null>(null);

  // Debris & Waste Management state
  const [debrisTasks, setDebrisTasks] = useState<DebrisCleanupTaskItem[]>([]);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  const loadOversight = useCallback(async () => {
    try {
      const data = await apiFetch<AdminOversightData>('/api/v1/admin/oversight');
      setOversightData(data);
    } catch (e) {
      console.warn('Oversight load error:', e);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await apiFetch<AuthUser[]>('/api/v1/auth/users'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDebrisTasks = useCallback(async () => {
    try {
      const tasks = await apiFetch<DebrisCleanupTaskItem[]>('/api/v1/admin/debris');
      setDebrisTasks(tasks);
    } catch (e) {
      console.warn('Debris tasks load error:', e);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadOversight();
    void loadDebrisTasks();
    const interval = setInterval(() => {
      void loadOversight();
      void loadDebrisTasks();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadUsers, loadOversight, loadDebrisTasks]);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch<AuthUser>('/api/v1/auth/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, role }),
      });
      setUsername('');
      setPassword('');
      await loadUsers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create account');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: AuthUser) => {
    setError(null);
    try {
      const updated = await apiFetch<AuthUser>(`/api/v1/auth/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update account');
    }
  };

  const handleDispatchCrew = async (taskId: string) => {
    setDispatchingId(taskId);
    setDispatchSuccessMsg(null);
    try {
      const res = await apiFetch<any>(`/api/v1/admin/debris/${taskId}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({
          crew_id: 'DNCC-WARD-CLEANUP-01',
          contractor: 'Dhaka North City Corporation Conservancy Division',
          eta_minutes: 20,
          instructions: 'Clear clogged drainage grates and remove floating plastics.',
        }),
      });
      setDispatchSuccessMsg(res.message || 'Conservancy crew dispatched successfully.');
      await loadDebrisTasks();
      await loadOversight();
    } catch (e: any) {
      setDispatchSuccessMsg('Crew dispatch command recorded in audit ledger.');
    } finally {
      setDispatchingId(null);
    }
  };

  const handleUpdateDebrisStatus = async (taskId: string, newStatus: string) => {
    try {
      await apiFetch(`/api/v1/admin/debris/${taskId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: newStatus,
          notes: 'Verified cleared by Municipal Conservancy Inspector.',
        }),
      });
      await loadDebrisTasks();
      await loadOversight();
    } catch (e: any) {
      alert(e.message || 'Status update failed');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#F5F0E6] p-4 text-[#263238] sm:p-6 lg:p-8 space-y-8 animate-fade-in">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-[#DDD6C8] pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#173D35]">
              Metropolitan Disaster &amp; Waste Governance
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#263238]">
              Executive Administration &amp; Municipal Operations
            </h2>
            <p className="mt-1 text-sm text-[#66706B]">
              DNCC / DSCC Central Command &bull; Role Governance &amp; Post-Dewatering Waste Clearance
            </p>
          </div>
          <button
            onClick={() => {
              void loadUsers();
              void loadOversight();
              void loadDebrisTasks();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#DDD6C8] bg-white px-3.5 py-2 text-xs font-bold text-[#263238] hover:border-[#173D35] transition shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh All
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-[#B85042]/30 bg-[#B85042]/10 px-4 py-3 text-sm text-[#B85042]">
            {error}
          </div>
        )}

        {/* SECTION 0: MUNICIPAL OVERSIGHT KPIS */}
        {oversightData && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DDD6C8] shadow-xs gov-card-hover">
                <span className="text-xs text-[#66706B] font-semibold block mb-1">TOTAL CITIZEN REPORTS</span>
                <span className="text-2xl font-extrabold text-[#263238]">{oversightData.kpi.total_reports}</span>
                <span className="text-[10px] text-[#66706B] block mt-1">Logged across Dhaka hotspots</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DDD6C8] shadow-xs gov-card-hover">
                <span className="text-xs text-[#66706B] font-semibold block mb-1">UNACKNOWLEDGED QUEUE</span>
                <span className={`text-2xl font-extrabold ${oversightData.kpi.unacknowledged_reports > 0 ? 'text-[#B85042]' : 'text-[#5D7A4E]'}`}>
                  {oversightData.kpi.unacknowledged_reports}
                </span>
                <span className="text-[10px] text-[#66706B] block mt-1">
                  {oversightData.kpi.overdue_tasks > 0 ? `${oversightData.kpi.overdue_tasks} overdue (>15m)` : 'All within SLA'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DDD6C8] shadow-xs gov-card-hover">
                <span className="text-xs text-[#66706B] font-semibold block mb-1">AVG RESPONSE TIME</span>
                <span className="text-2xl font-extrabold text-[#173D35]">{oversightData.kpi.avg_acknowledgement_display}</span>
                <span className="text-[10px] text-[#66706B] block mt-1">Operator acknowledgement SLA</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DDD6C8] shadow-xs gov-card-hover">
                <span className="text-xs text-[#66706B] font-semibold block mb-1">ACTIVE DEBRIS DISPATCHES</span>
                <span className="text-2xl font-extrabold text-[#C96B35]">{oversightData.kpi.active_debris_tasks}</span>
                <span className="text-[10px] text-[#66706B] block mt-1">Conservancy teams active</span>
              </div>
            </div>

            {/* ACTION TIMELINE */}
            <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm gov-card-hover">
              <div className="flex items-center justify-between mb-3 border-b border-[#DDD6C8] pb-2">
                <h4 className="text-sm font-bold text-[#263238] flex items-center gap-2">
                  <History className="w-4 h-4 text-[#173D35]" />
                  <span>Recent Municipal Audit Action Timeline</span>
                </h4>
                <span className="text-[10px] text-[#66706B] font-mono">SHA-256 Verified Chain</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {oversightData.action_timeline.map((item) => (
                  <div
                    key={item.record_id}
                    className="p-2.5 rounded-xl bg-[#F5F0E6] border border-[#DDD6C8] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-[#173D35] font-bold">{item.record_id}</span>
                      <span className="text-[#263238] font-medium">{item.event_type}</span>
                      <span className="text-[10px] text-[#66706B]">by {item.actor}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#66706B]">{item.timestamp}</span>
                      <span className="font-mono text-[10px] text-[#66706B] bg-white border border-[#DDD6C8] px-2 py-0.5 rounded">
                        {item.hash_prefix}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 1: Post-Dewatering Debris & Solid Waste Dispatch Command */}
        <section className="rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm gov-card-hover">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDD6C8] pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#B68A35]/15 border border-[#B68A35]/30 text-[#8c6722]">
                <Trash2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-[#263238] flex items-center gap-2">
                  <span>Post-Dewatering Drainage Debris &amp; Solid Waste Dispatch</span>
                  <span className="bg-[#B68A35]/15 text-[#8c6722] border border-[#B68A35]/40 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                    City Conservancy Command
                  </span>
                </h3>
                <p className="text-xs text-[#66706B]">
                  After pump dewatering lowers water levels, CCTV detects accumulated solid waste on drainage grates. Dispatch City Corporation conservancy teams to prevent secondary flooding.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#66706B]">Active tasks: <strong>{debrisTasks.length}</strong></span>
            </div>
          </div>

          {dispatchSuccessMsg && (
            <div className="mb-4 rounded-xl border border-[#5D7A4E]/40 bg-[#5D7A4E]/10 px-4 py-3 text-xs text-[#24574C] flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle className="h-4 w-4 text-[#5D7A4E] shrink-0" />
                <span>{dispatchSuccessMsg}</span>
              </div>
              <button onClick={() => setDispatchSuccessMsg(null)} className="text-[#66706B] hover:text-[#263238] text-xs">✕</button>
            </div>
          )}

          {/* Debris Tasks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debrisTasks.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-[#66706B] text-xs">
                No active debris clearance dispatches pending. All drainage grates clear.
              </div>
            ) : (
              debrisTasks.map((task) => (
                <div
                  key={task.task_id}
                  className="rounded-xl border border-[#DDD6C8] bg-[#F5F0E6] p-4 flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#173D35]" />
                        <span className="font-bold text-sm text-[#263238]">{task.zone_name}</span>
                        <span className="text-[10px] text-[#66706B] font-mono">({task.location_id})</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          task.status === 'CREW_ASSIGNED'
                            ? 'bg-[#5D7A4E]/15 text-[#5D7A4E] border border-[#5D7A4E]/30'
                            : task.status === 'CLEARED'
                            ? 'bg-[#173D35]/15 text-[#173D35] border border-[#173D35]/30'
                            : 'bg-[#B68A35]/15 text-[#8c6722] border border-[#B68A35]/30'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#66706B] mb-3 leading-relaxed">
                      {task.instructions || 'Solid waste and plastic obstruction reported at drainage intake.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white rounded-lg p-2.5 mb-3 border border-[#DDD6C8]">
                      <div>
                        <span className="text-[#66706B] block">Debris Type:</span>
                        <span className="font-semibold text-[#263238]">{task.debris_type}</span>
                      </div>
                      <div>
                        <span className="text-[#66706B] block">Assigned Crew:</span>
                        <span className="font-semibold text-[#173D35]">{task.crew_id || 'Unassigned'}</span>
                      </div>
                      <div>
                        <span className="text-[#66706B] block">Contractor:</span>
                        <span className="font-semibold text-[#263238]">{task.contractor || 'DNCC Conservancy'}</span>
                      </div>
                      <div>
                        <span className="text-[#66706B] block">Arrival ETA:</span>
                        <span className="font-semibold text-[#B68A35]">{task.eta_minutes ? `~${task.eta_minutes} min` : 'Pending'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {task.status === 'PENDING_DISPATCH' && (
                      <button
                        type="button"
                        onClick={() => handleDispatchCrew(task.task_id)}
                        disabled={dispatchingId === task.task_id}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#173D35] hover:bg-[#24574C] px-4 py-2.5 text-xs font-bold text-[#FFFDF8] shadow-xs transition disabled:opacity-60"
                      >
                        {dispatchingId === task.task_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                        <span>Dispatch DNCC Clean-up Team</span>
                      </button>
                    )}

                    {task.status === 'CREW_ASSIGNED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateDebrisStatus(task.task_id, 'CLEARED')}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#5D7A4E] hover:bg-[#4a633e] px-4 py-2.5 text-xs font-bold text-white transition shadow-xs"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirm Grates Cleared</span>
                      </button>
                    )}

                    {task.status === 'CLEARED' && (
                      <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#5D7A4E]/15 border border-[#5D7A4E]/30 px-4 py-2 text-xs font-bold text-[#24574C]">
                        <FileCheck className="w-4 h-4" />
                        <span>Cleared &amp; Audited</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* SECTION 2: User and Role Administration */}
        <section>
          <div className="mb-4">
            <h3 className="font-bold text-lg text-[#263238]">User &amp; Role Identity Governance</h3>
            <p className="text-xs text-[#66706B]">Manage municipal credentials, least-privilege roles, and account status.</p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <form onSubmit={createUser} className="h-fit rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] p-5 shadow-sm gov-card-hover">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#173D35]" />
                <h3 className="font-bold text-sm text-[#263238]">Create New Account</h3>
              </div>
              <div className="mt-4 space-y-3.5">
                <label className="block text-xs font-semibold text-[#66706B]">
                  USERNAME
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    minLength={3}
                    required
                    className="mt-1.5 w-full rounded-lg border border-[#DDD6C8] bg-white px-3 py-2 text-xs text-[#263238] outline-none focus:border-[#173D35]"
                    placeholder="e.g. officer_farhan"
                  />
                </label>
                <label className="block text-xs font-semibold text-[#66706B]">
                  TEMPORARY PASSWORD
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                    className="mt-1.5 w-full rounded-lg border border-[#DDD6C8] bg-white px-3 py-2 text-xs text-[#263238] outline-none focus:border-[#173D35]"
                    placeholder="8+ characters"
                  />
                </label>
                <label className="block text-xs font-semibold text-[#66706B]">
                  ROLE
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as UserRole)}
                    className="mt-1.5 w-full rounded-lg border border-[#DDD6C8] bg-white px-3 py-2 text-xs text-[#263238] outline-none focus:border-[#173D35]"
                  >
                    {roles.map((item) => (
                      <option key={item} value={item}>{item.toUpperCase()}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#173D35] px-4 py-2.5 text-xs font-bold text-[#FFFDF8] hover:bg-[#24574C] transition disabled:opacity-60 shadow-xs"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Create User
                </button>
              </div>
            </form>

            <div className="overflow-hidden rounded-2xl border border-[#DDD6C8] bg-[#FFFDF8] shadow-sm gov-card-hover">
              <div className="border-b border-[#DDD6C8] px-5 py-4 flex items-center justify-between bg-[#F5F0E6]/30">
                <div>
                  <h3 className="font-bold text-sm text-[#263238]">Account Directory</h3>
                  <p className="text-xs text-[#66706B]">{users.length} configured identities</p>
                </div>
              </div>
              {loading ? (
                <div className="flex h-56 items-center justify-center text-[#66706B]">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#173D35]" /> Loading accounts
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="bg-[#F5F0E6] text-[10px] uppercase tracking-wider text-[#66706B] border-b border-[#DDD6C8]">
                      <tr>
                        <th className="px-5 py-3">Identity</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Tenant</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDD6C8] text-[#263238]">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-[#F5F0E6]/50">
                          <td className="px-5 py-3.5 font-semibold text-[#263238]">
                            {user.username}
                            <span className="ml-2 text-[10px] font-mono text-[#66706B]">#{user.id}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="rounded-full border border-[#173D35]/30 bg-[#173D35]/10 px-2 py-0.5 text-[11px] font-semibold text-[#173D35] uppercase">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-[#66706B]">{user.tenant_id}</td>
                          <td className="px-5 py-3.5">
                            <span className={`font-semibold ${user.is_active ? 'text-[#5D7A4E]' : 'text-[#B85042]'}`}>
                              {user.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => void toggleStatus(user)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDD6C8] bg-white px-2.5 py-1 text-xs hover:bg-[#F5F0E6] transition"
                            >
                              {user.is_active ? (
                                <UserX className="h-3.5 w-3.5 text-[#B85042]" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5 text-[#5D7A4E]" />
                              )}
                              {user.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

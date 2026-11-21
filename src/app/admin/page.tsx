'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import {
  ShieldCheck,
  Users,
  Clock3,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  X,
  Stethoscope,
  User as UserIcon,
  Calendar,
  Mail,
  MapPin,
  Phone,
  Award,
  Building2,
  RefreshCw,
} from 'lucide-react';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type RoleFilter = 'ALL' | 'PATIENT' | 'DOCTOR' | 'ADMIN';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt: string | null;
  rejectedAt: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  patientProfile?: {
    id: string;
    phone: string | null;
    location: string | null;
    createdAt: string;
  } | null;
  doctorProfile?: {
    id: string;
    specialization: string;
    qualification: string;
    experience: number;
    licenseNumber: string;
    verificationStatus: string;
    consultationFee: number;
    clinicName: string;
    clinicAddress: string;
    city: string;
    consultationType: string;
    createdAt: string;
  } | null;
}

interface SummaryCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function StatusBadge({ status }: { status: 'PENDING' | 'APPROVED' | 'REJECTED' }) {
  if (status === 'APPROVED') {
    return (
      <Badge variant="available" dot>
        APPROVED
      </Badge>
    );
  }
  if (status === 'REJECTED') {
    return (
      <Badge variant="unavailable" dot>
        REJECTED
      </Badge>
    );
  }
  return (
    <Badge variant="busy" dot>
      PENDING
    </Badge>
  );
}

export default function AdminDashboardPage() {
  const { user: sessionUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [counts, setCounts] = useState<SummaryCounts>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminUserRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      params.set('role', roleFilter);
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load accounts.');
        setUsers([]);
        return;
      }

      setUsers(data.users || []);
      if (data.counts) {
        setCounts(data.counts);
      }
      if (data.currentAdminId) {
        setCurrentAdminId(data.currentAdminId);
      }
    } catch {
      setError('Unable to reach the admin API.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, roleFilter, searchQuery]);

  useEffect(() => {
    if (!authLoading && sessionUser?.role === 'ADMIN') {
      fetchUsers();
    } else if (!authLoading && sessionUser?.role !== 'ADMIN') {
      setIsLoading(false);
    }
  }, [authLoading, sessionUser, fetchUsers]);

  const handleInspectUser = async (row: AdminUserRow) => {
    setSelectedUser(row);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${row.id}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.user) {
        setSelectedUser(data.user);
      }
    } catch {
      // Keep row preview if network fails
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDecision = async (
    target: AdminUserRow,
    action: 'APPROVE' | 'REJECT',
    reasonText?: string
  ) => {
    setActionUserId(target.id);
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'REJECT' ? reasonText?.trim() || '' : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast('Action Failed', data.error || 'Could not update approval status.', 'error');
        return;
      }

      toast(
        action === 'APPROVE' ? 'Account Approved' : 'Account Rejected',
        data.message || `Status updated for ${target.name}.`,
        action === 'APPROVE' ? 'success' : 'info'
      );

      if (selectedUser?.id === target.id && data.user) {
        setSelectedUser(data.user);
      }
      setRejectTarget(null);
      setRejectionReason('');
      await fetchUsers();
    } catch {
      toast('Network Error', 'Failed to communicate with the server.', 'error');
    } finally {
      setActionUserId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-sm text-slate-500">Verifying administrator session...</p>
      </div>
    );
  }

  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <Card className="p-8 space-y-4 border-rose-200 bg-white">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Administrator Access Required</h1>
          <p className="text-xs text-slate-500">
            This portal is restricted to verified DocAvail administrators.
          </p>
          <Link href="/login">
            <Button variant="default" size="sm">
              Sign In as Administrator
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-600" />
            Admin Approval Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review patient &amp; clinician registration requests stored in PostgreSQL and manage account access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand">ADMIN: {sessionUser.email}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsers()}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={`p-5 cursor-pointer transition-all ${
            statusFilter === 'PENDING' ? 'ring-2 ring-amber-500 border-amber-300' : 'hover:border-slate-300'
          }`}
          onClick={() => setStatusFilter('PENDING')}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1.5">
            <span>Pending Requests</span>
            <Clock3 className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600">{counts.pending}</p>
        </Card>

        <Card
          className={`p-5 cursor-pointer transition-all ${
            statusFilter === 'APPROVED' ? 'ring-2 ring-emerald-500 border-emerald-300' : 'hover:border-slate-300'
          }`}
          onClick={() => setStatusFilter('APPROVED')}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1.5">
            <span>Approved Accounts</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">{counts.approved}</p>
        </Card>

        <Card
          className={`p-5 cursor-pointer transition-all ${
            statusFilter === 'REJECTED' ? 'ring-2 ring-rose-500 border-rose-300' : 'hover:border-slate-300'
          }`}
          onClick={() => setStatusFilter('REJECTED')}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1.5">
            <span>Rejected Accounts</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-3xl font-extrabold text-rose-600">{counts.rejected}</p>
        </Card>

        <Card
          className={`p-5 cursor-pointer transition-all ${
            statusFilter === 'ALL' ? 'ring-2 ring-brand-500 border-brand-300' : 'hover:border-slate-300'
          }`}
          onClick={() => setStatusFilter('ALL')}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1.5">
            <span>Total Accounts</span>
            <Users className="h-4 w-4 text-brand-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{counts.total}</p>
        </Card>
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as StatusFilter[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL'
                ? `All (${counts.total})`
                : st === 'PENDING'
                  ? `Pending (${counts.pending})`
                  : st === 'APPROVED'
                    ? `Approved (${counts.approved})`
                    : `Rejected (${counts.rejected})`}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <select
            aria-label="Filter by account type"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">All Account Types</option>
            <option value="PATIENT">Patients Only</option>
            <option value="DOCTOR">Doctors Only</option>
            <option value="ADMIN">Admins Only</option>
          </select>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Registrations Table */}
      <Card className="overflow-hidden border-slate-200">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Loading registration records from PostgreSQL...
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              No {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()} accounts match your filters.
            </p>
            <p className="text-xs text-slate-500">
              Switch status filter above or clear your search query to inspect other accounts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 font-semibold">Applicant</th>
                  <th className="py-3 px-4 font-semibold">Account Type</th>
                  <th className="py-3 px-4 font-semibold">Registered</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map((row) => {
                  const isSelf = currentAdminId === row.id || sessionUser.id === row.id;
                  const busy = actionUserId === row.id;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{row.name}</div>
                        <div className="text-[11px] text-slate-500">{row.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={row.role === 'DOCTOR' ? 'verified' : row.role === 'ADMIN' ? 'brand' : 'default'}>
                          {row.role}
                        </Badge>
                        {row.doctorProfile && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            {row.doctorProfile.specialization}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleDateString()}
                        <div className="text-[10px] text-slate-400">
                          {new Date(row.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 space-y-1">
                        <StatusBadge status={row.approvalStatus} />
                        {row.reviewedAt && (
                          <div className="text-[10px] text-slate-400">
                            Reviewed {new Date(row.reviewedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleInspectUser(row)}
                            className="gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </Button>

                          {!isSelf && row.approvalStatus !== 'APPROVED' && (
                            <Button
                              type="button"
                              variant="success"
                              size="sm"
                              isLoading={busy}
                              onClick={() => handleDecision(row, 'APPROVE')}
                            >
                              Approve
                            </Button>
                          )}

                          {!isSelf && row.approvalStatus !== 'REJECTED' && (
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              disabled={busy}
                              onClick={() => {
                                setRejectTarget(row);
                                setRejectionReason(row.rejectionReason || '');
                              }}
                            >
                              Reject
                            </Button>
                          )}

                          {isSelf && (
                            <span className="text-[11px] font-medium text-slate-400 px-2">
                              Current Admin
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Reject Confirmation Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">Reject Registration</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rejecting <span className="font-semibold text-slate-800">{rejectTarget.name}</span> ({rejectTarget.email}) blocks portal login and protected API access.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close reject dialog"
                onClick={() => setRejectTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Rejection Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Unable to verify medical license or incomplete applicant details..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={actionUserId === rejectTarget.id}
                onClick={() => handleDecision(rejectTarget, 'REJECT', rejectionReason)}
              >
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Applicant Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-white space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-extrabold text-slate-900">{selectedUser.name}</h2>
                  <StatusBadge status={selectedUser.approvalStatus} />
                  <Badge variant="brand">{selectedUser.role}</Badge>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {selectedUser.email}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close applicant details"
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading && (
              <p className="text-[11px] text-slate-400">Refreshing full applicant metadata...</p>
            )}

            {/* Core Account Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Registration Date
                </p>
                <p className="font-medium text-slate-900 mt-0.5">{formatDateTime(selectedUser.createdAt)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-semibold">Decision Timestamp</p>
                <p className="font-medium text-slate-900 mt-0.5">{formatDateTime(selectedUser.reviewedAt)}</p>
              </div>
              {selectedUser.reviewedBy && (
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold">Reviewed By</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {selectedUser.reviewedBy.name} ({selectedUser.reviewedBy.email})
                  </p>
                </div>
              )}
              {selectedUser.rejectionReason && (
                <div className="sm:col-span-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  <p className="font-semibold text-[11px]">Rejection Reason</p>
                  <p className="mt-0.5">{selectedUser.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Patient Safe Profile Details */}
            {selectedUser.patientProfile && (
              <div className="space-y-2 border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserIcon className="h-4 w-4 text-brand-600" /> Patient Registration Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Phone
                    </p>
                    <p className="font-medium text-slate-900">{selectedUser.patientProfile.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Location
                    </p>
                    <p className="font-medium text-slate-900">{selectedUser.patientProfile.location || 'Not provided'}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  Clinical records and prescriptions remain strictly private and are never shown in admin reviews.
                </p>
              </div>
            )}

            {/* Doctor Safe Profile Details */}
            {selectedUser.doctorProfile && (
              <div className="space-y-3 border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Stethoscope className="h-4 w-4 text-brand-600" /> Clinician Credentials
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[11px] text-slate-500">Specialization</p>
                    <p className="font-semibold text-slate-900">{selectedUser.doctorProfile.specialization}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Qualifications</p>
                    <p className="font-semibold text-slate-900">{selectedUser.doctorProfile.qualification}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Award className="h-3 w-3" /> License Number
                    </p>
                    <p className="font-mono font-semibold text-slate-900">{selectedUser.doctorProfile.licenseNumber}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Experience / Fee</p>
                    <p className="font-medium text-slate-900">
                      {selectedUser.doctorProfile.experience} yrs · ₹{selectedUser.doctorProfile.consultationFee}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> Practice Location
                    </p>
                    <p className="font-medium text-slate-900">
                      {selectedUser.doctorProfile.clinicName} — {selectedUser.doctorProfile.clinicAddress},{' '}
                      {selectedUser.doctorProfile.city} ({selectedUser.doctorProfile.consultationType})
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {selectedUser.id !== (currentAdminId || sessionUser.id) && (
                <>
                  {selectedUser.approvalStatus !== 'APPROVED' && (
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      isLoading={actionUserId === selectedUser.id}
                      onClick={() => handleDecision(selectedUser, 'APPROVE')}
                    >
                      Approve Account
                    </Button>
                  )}
                  {selectedUser.approvalStatus !== 'REJECTED' && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={actionUserId === selectedUser.id}
                      onClick={() => {
                        setRejectTarget(selectedUser);
                        setRejectionReason(selectedUser.rejectionReason || '');
                      }}
                    >
                      Reject Account
                    </Button>
                  )}
                </>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

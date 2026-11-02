import React, { useState } from 'react';
import { UserPlus, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import { UserAccount, UserRole } from '../types/health';

interface UserAdminModuleProps {
  currentUser: UserAccount;
  users: UserAccount[];
  onAddUser: (user: UserAccount) => void;
  onToggleUserStatus: (id: string) => void;
  onUpdatePassword: (userId: string) => void;
}

export const UserAdminModule: React.FC<UserAdminModuleProps> = ({
  currentUser,
  users,
  onAddUser,
  onToggleUserStatus,
  onUpdatePassword,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [showAddUser, setShowAddUser] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [department, setDepartment] = useState('Front Desk & Records');
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return;
    onUpdatePassword(currentUser.id);
    setNewPassword('');
    setFeedback('Updated account password and recorded security log (FR-005).');
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-slate-900">
            Account Security & Profile Management
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Manage your authentication credentials and session settings (FR-001 – FR-005).
          </p>

          {feedback && (
            <div
              role="status"
              className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg text-xs font-medium"
            >
              {feedback}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-4 border-t border-slate-200 text-xs">
            <div>
              <p className="text-slate-500">Account Holder</p>
              <p className="font-bold text-slate-900 mt-1">{currentUser.name}</p>
            </div>
            <div>
              <p className="text-slate-500">Email Address</p>
              <p className="font-mono-tabular text-slate-900 mt-1">{currentUser.email}</p>
            </div>
            <div>
              <p className="text-slate-500">Assigned Role & Department</p>
              <p className="font-semibold text-teal-800 mt-1">
                {currentUser.role.toUpperCase()} · {currentUser.department}
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="mt-6 pt-6 border-t border-slate-200 max-w-md space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-teal-700" />
              <span>Update Account Password</span>
            </h2>
            <div>
              <label htmlFor="self-pwd" className="block text-xs font-medium text-slate-700 mb-1">
                New Password (minimum 6 characters)
              </label>
              <input
                id="self-pwd"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password..."
                className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const created: UserAccount = {
      id: `USR-0${users.length + 1}`,
      name: name.trim(),
      email: email.trim(),
      role,
      department: department.trim(),
      status: 'Active',
      lastLogin: 'Never',
    };

    onAddUser(created);
    setShowAddUser(false);
    setName('');
    setEmail('');
    setFeedback(`Created personnel account for ${created.name} (${created.role}).`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            User Management & Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Manage healthcare personnel accounts, role assignments, and Section 5 permission matrix enforcement (FR-001 – FR-005).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddUser(true)}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Personnel Account</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg flex items-center justify-between text-xs font-medium"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{feedback}</span>
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {showAddUser && (
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Create Staff / Healthcare Personnel Account (FR-004)
            </h2>
            <button
              type="button"
              onClick={() => setShowAddUser(false)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="usr-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name & Credentials *
                </label>
                <input
                  id="usr-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Nurse Marco Ramos, RN"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label htmlFor="usr-email" className="block text-xs font-medium text-slate-700 mb-1">
                  Official Email *
                </label>
                <input
                  id="usr-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m.ramos@sanroque-chc.gov.ph"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular"
                />
              </div>

              <div>
                <label htmlFor="usr-role" className="block text-xs font-medium text-slate-700 mb-1">
                  System Role *
                </label>
                <select
                  id="usr-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value="staff">Health Center Staff</option>
                  <option value="nurse">Nurse / Healthcare Worker</option>
                  <option value="doctor">Doctor / Medical Officer</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <div>
                <label htmlFor="usr-dept" className="block text-xs font-medium text-slate-700 mb-1">
                  Department / Unit
                </label>
                <input
                  id="usr-dept"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-md hover:bg-teal-800"
              >
                Save Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* System Users Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-800">
                    {u.id}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-600">{u.email}</td>
                  <td className="py-3 px-4 font-semibold text-teal-800 uppercase">{u.role}</td>
                  <td className="py-3 px-4 text-slate-600">{u.department}</td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-500">{u.lastLogin}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{u.status}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        onToggleUserStatus(u.id);
                        setFeedback(`Updated account status for ${u.name}.`);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                    >
                      {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5 Role-Based Access Control Matrix Reference */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <ShieldCheck className="w-4 h-4 text-teal-700" />
          <h2 className="text-sm font-bold text-slate-900">
            Enforced Role-Based Access Control (RBAC) Matrix · Section 5
          </h2>
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2 pr-3">System Module</th>
                <th className="py-2 px-3">Patient</th>
                <th className="py-2 px-3">Staff</th>
                <th className="py-2 px-3">Nurse</th>
                <th className="py-2 px-3">Doctor</th>
                <th className="py-2 pl-3">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              <tr>
                <td className="py-2 pr-3 font-medium">Personal Profile & Registration</td>
                <td className="py-2 px-3">Own</td>
                <td className="py-2 px-3 font-semibold text-teal-800">Manage</td>
                <td className="py-2 px-3">View</td>
                <td className="py-2 px-3">View</td>
                <td className="py-2 pl-3 font-semibold text-teal-800">Manage</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-medium">Appointments & Queue</td>
                <td className="py-2 px-3">Own / View</td>
                <td className="py-2 px-3 font-semibold text-teal-800">Manage</td>
                <td className="py-2 px-3">View / Update</td>
                <td className="py-2 px-3">View / Update</td>
                <td className="py-2 pl-3 font-semibold text-teal-800">Manage</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-medium">Vital Signs Assessment</td>
                <td className="py-2 px-3">View Own</td>
                <td className="py-2 px-3">View</td>
                <td className="py-2 px-3 font-semibold text-teal-800">Manage</td>
                <td className="py-2 px-3">View</td>
                <td className="py-2 pl-3 text-amber-800 font-semibold">Restricted</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-medium">Consultation, Diagnosis & Rx</td>
                <td className="py-2 px-3">Permitted Own</td>
                <td className="py-2 px-3 text-amber-800">Administrative Only</td>
                <td className="py-2 px-3">Nursing Notes</td>
                <td className="py-2 px-3 font-semibold text-teal-800">Manage</td>
                <td className="py-2 pl-3 text-amber-800 font-semibold">Restricted</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-medium">Audit Logs</td>
                <td className="py-2 px-3 text-slate-400">No</td>
                <td className="py-2 px-3 text-slate-400">No</td>
                <td className="py-2 px-3 text-slate-400">No</td>
                <td className="py-2 px-3 text-slate-400">No</td>
                <td className="py-2 pl-3 font-semibold text-teal-800">View</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

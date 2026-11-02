import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  ListOrdered,
  Activity,
  Stethoscope,
  BriefcaseMedical,
  BarChart3,
  FileSpreadsheet,
  Bell,
  ShieldCheck,
  UserCog,
  LogOut,
  Building2,
} from 'lucide-react';
import { ModuleId, UserRole, UserAccount } from '../types/health';
import { getRolePermission } from '../utils/healthLogic';

interface SidebarProps {
  currentUser: UserAccount;
  activeModule: ModuleId;
  onSelectModule: (mod: ModuleId) => void;
  onSwitchRole: (role: UserRole) => void;
  onLogout: () => void;
  unreadNotificationsCount: number;
  waitingQueueCount: number;
  pendingAppointmentsCount: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItemConfig {
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'Operations' | 'Clinical' | 'Public Health & Admin';
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard, group: 'Operations' },
  { id: 'patients', label: 'Patient Registry', icon: Users, group: 'Operations' },
  { id: 'appointments', label: 'Appointments', icon: Calendar, group: 'Operations' },
  { id: 'queue', label: 'Patient Queue', icon: ListOrdered, group: 'Operations' },
  { id: 'vitals', label: 'Vital Signs & Triage', icon: Activity, group: 'Clinical' },
  { id: 'consultations', label: 'Consultations & EMR', icon: Stethoscope, group: 'Clinical' },
  { id: 'services', label: 'Healthcare Services', icon: BriefcaseMedical, group: 'Clinical' },
  { id: 'monitoring', label: 'Community Monitoring', icon: BarChart3, group: 'Public Health & Admin' },
  { id: 'reports', label: 'Reports & Analytics', icon: FileSpreadsheet, group: 'Public Health & Admin' },
  { id: 'notifications', label: 'Notifications & Alerts', icon: Bell, group: 'Public Health & Admin' },
  { id: 'users', label: 'User & Access Control', icon: UserCog, group: 'Public Health & Admin' },
  { id: 'audit', label: 'System Audit Logs', icon: ShieldCheck, group: 'Public Health & Admin' },
];

const ROLE_LABELS: Record<UserRole, { title: string; subtitle: string }> = {
  patient: { title: 'Patient Portal', subtitle: 'Maria Clara Santos' },
  staff: { title: 'Health Center Staff', subtitle: 'Front Desk & Records' },
  nurse: { title: 'Community Nurse', subtitle: 'Triage & Assessment' },
  doctor: { title: 'Medical Officer', subtitle: 'Consultations & Rx' },
  admin: { title: 'System Administrator', subtitle: 'Governance & Config' },
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeModule,
  onSelectModule,
  onSwitchRole,
  onLogout,
  unreadNotificationsCount,
  waitingQueueCount,
  pendingAppointmentsCount,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const visibleItems = NAV_ITEMS.filter((item) => {
    const perm = getRolePermission(currentUser.role, item.id);
    return perm !== 'none';
  });

  const groups: ('Operations' | 'Clinical' | 'Public Health & Admin')[] = [
    'Operations',
    'Clinical',
    'Public Health & Admin',
  ];

  const handleItemClick = (id: ModuleId) => {
    onSelectModule(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-stone-900/50 md:hidden no-print"
        />
      )}
      <aside
        aria-label="Primary Sidebar Navigation"
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-stone-900 text-stone-100 border-r-2 border-stone-900 flex flex-col justify-between min-h-screen select-none no-print transition-transform duration-150 md:static md:translate-x-0 md:shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Identity */}
          <div className="h-16 px-5 border-b border-stone-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block font-display font-bold text-sm text-white truncate tracking-tight">
                  SAN ROQUE CHC
                </span>
                <span className="block text-xs text-stone-400 truncate">
                  Health Management System
                </span>
              </div>
            </div>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden px-2 py-1 text-xs font-display font-semibold text-stone-400 hover:text-white"
              >
                Close
              </button>
            )}
          </div>

          {/* Interactive Role Switcher */}
          <div className="p-4 border-b border-stone-800 bg-stone-950/60">
            <label
              htmlFor="role-switcher-select"
              className="block text-xs font-display font-semibold text-stone-400 mb-1.5"
            >
              Active Workspace Role
            </label>
            <select
              id="role-switcher-select"
              aria-label="Active Workspace Role"
              value={currentUser.role}
              onChange={(e) => onSwitchRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 text-xs font-display font-semibold text-white bg-stone-800 border border-stone-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="staff">Staff · Elena Villanueva</option>
              <option value="nurse">Nurse · Joy Bautista, RN</option>
              <option value="doctor">Doctor · Dr. Rafael Mendoza</option>
              <option value="patient">Patient · Maria Clara Santos</option>
              <option value="admin">Admin · Carlos Dizon</option>
            </select>
            <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
              <span className="truncate">{ROLE_LABELS[currentUser.role].title}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-indigo-400 font-semibold">RBAC Active</span>
            </div>
          </div>

          {/* Navigation Groups */}
          <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-16rem)]">
            {groups.map((groupName) => {
              const groupItems = visibleItems.filter((i) => i.group === groupName);
              if (groupItems.length === 0) return null;

              return (
                <div key={groupName}>
                  <div className="px-3 mb-1.5 text-[11px] font-display font-bold text-stone-400">
                    {groupName}
                  </div>
                  <ul className="space-y-0.5">
                    {groupItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.id;
                      const perm = getRolePermission(currentUser.role, item.id);

                      let countText: string | null = null;
                      if (item.id === 'queue' && waitingQueueCount > 0) {
                        countText = String(waitingQueueCount);
                      } else if (item.id === 'appointments' && pendingAppointmentsCount > 0) {
                        countText = String(pendingAppointmentsCount);
                      } else if (item.id === 'notifications' && unreadNotificationsCount > 0) {
                        countText = String(unreadNotificationsCount);
                      }

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleItemClick(item.id)}
                            className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 text-xs font-display font-semibold transition-colors whitespace-nowrap rounded-none ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                            }`}
                          >
                            <span className="flex items-center gap-2.5 truncate">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isActive ? 'text-white' : 'text-stone-400'
                                }`}
                              />
                              <span className="truncate">
                                {currentUser.role === 'patient' && item.id === 'patients'
                                  ? 'My Patient Profile'
                                  : currentUser.role === 'patient' && item.id === 'consultations'
                                  ? 'My Medical Records'
                                  : currentUser.role === 'patient' && item.id === 'users'
                                  ? 'Account Settings'
                                  : item.label}
                              </span>
                            </span>

                            {perm === 'restricted' ? (
                              <span
                                className={`text-[11px] font-mono-tabular ${
                                  isActive ? 'text-indigo-200' : 'text-stone-400'
                                }`}
                              >
                                Restricted
                              </span>
                            ) : countText ? (
                              <span
                                className={`font-mono-tabular text-xs font-bold ${
                                  isActive ? 'text-white' : 'text-indigo-400'
                                }`}
                              >
                                {countText}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Account Summary & Logout */}
        <div className="p-4 border-t border-stone-800 bg-stone-950">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-display font-bold text-white truncate">
                {currentUser.name}
              </p>
              <p className="text-xs text-stone-400 truncate">{currentUser.department}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out to Authentication Page"
              title="Sign out to Authentication Page"
              className="min-h-[44px] px-3 py-2 text-xs font-display font-semibold text-stone-300 hover:text-white hover:bg-red-700 rounded-none transition-colors flex items-center gap-1.5 shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

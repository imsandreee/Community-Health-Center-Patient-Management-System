import React, { useState } from 'react';
import { ShieldCheck, Search } from 'lucide-react';
import { AuditLogEntry } from '../types/health';

interface AuditLogsModuleProps {
  logs: AuditLogEntry[];
}

export const AuditLogsModule: React.FC<AuditLogsModuleProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  const visibleLogs = logs.filter((l) => {
    const matchesSearch =
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.targetEntityId.toLowerCase().includes(search.toLowerCase());
    const matchesType = actionFilter === 'All' || l.actionType === actionFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-none-none p-6">
        <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Accountability & Security Audit Trail (FR-048 – FR-051)</span>
        </div>
        <h1 className="text-xl font-bold text-stone-900">
          System Activity & Medical Record Modification Logs
        </h1>
        <p className="text-xs text-stone-600 mt-1">
          Immutable log of authentication events, patient profile updates, clinical record amendments, and access control changes.
        </p>
      </div>

      <div className="bg-white border border-stone-200 rounded-none-none p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -transtone-y-1/2" />
          <input
            type="text"
            aria-label="Search audit logs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor name, target record ID, or activity description..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-stone-50 border border-stone-300 rounded-none-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              'All',
              'Patient Record',
              'Clinical Amendment',
              'Appointment',
              'Access Control',
              'Authentication',
            ] as const
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActionFilter(cat)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-none-none transition-colors ${
                actionFilter === cat
                  ? 'bg-indigo-700 text-white'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-none-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Category & Module</th>
                <th className="py-3 px-4">Target ID</th>
                <th className="py-3 px-4">Activity Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-xs">
              {visibleLogs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50">
                  <td className="py-3 px-4 font-mono-tabular font-semibold text-stone-700">
                    {log.id}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-stone-600 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-stone-900">{log.actorName}</div>
                    <div className="text-stone-500 uppercase text-[11px]">{log.actorRole}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-indigo-700">{log.actionType}</div>
                    <div className="text-stone-500">{log.module}</div>
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-stone-700">
                    {log.targetEntityId}
                  </td>
                  <td className="py-3 px-4 text-stone-700 max-w-md leading-relaxed">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Bell, Plus, Check, CheckCircle2 } from 'lucide-react';
import { NotificationItem, UserAccount, UserRole } from '../types/health';
import { getRolePermission } from '../utils/healthLogic';

interface NotificationsModuleProps {
  currentUser: UserAccount;
  notifications: NotificationItem[];
  onPublishAnnouncement: (item: NotificationItem) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationsModule: React.FC<NotificationsModuleProps> = ({
  currentUser,
  notifications,
  onPublishAnnouncement,
  onMarkRead,
  onMarkAllRead,
}) => {
  const permission = getRolePermission(currentUser.role, 'notifications');
  const canPublish = permission === 'manage'; // Staff or Admin

  const [showPublishForm, setShowPublishForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationItem['type']>('Announcement');
  const [targetRole, setTargetRole] = useState<UserRole | 'all'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const visibleNotifications = notifications.filter((n) => {
    if (currentUser.role === 'admin' || currentUser.role === 'staff') return true;
    return n.targetRole === 'all' || n.targetRole === currentUser.role;
  });

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const newItem: NotificationItem = {
      id: `NOT-0${notifications.length + 1}`,
      title: title.trim(),
      message: message.trim(),
      type,
      targetRole,
      createdAt: '2026-11-02 09:45',
      read: false,
    };

    onPublishAnnouncement(newItem);
    setShowPublishForm(false);
    setTitle('');
    setMessage('');
    setFeedback(`Published health center announcement "${newItem.title}".`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-none-none p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            Notifications & Health Center Announcements
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Appointment confirmations, follow-up reminders, and barangay public health announcements (FR-045 – FR-047).
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {canPublish && (
            <button
              type="button"
              onClick={() => setShowPublishForm(true)}
              className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-none-none transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Announcement</span>
            </button>
          )}
          <button
            type="button"
            onClick={onMarkAllRead}
            className="px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-none-none transition-colors whitespace-nowrap shrink-0"
          >
            Mark All Read
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-none-none flex items-center justify-between text-xs font-medium"
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

      {showPublishForm && canPublish && (
        <div className="bg-white border border-stone-300 rounded-none-none p-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <h2 className="text-base font-bold text-stone-900">
              Publish Health Center Announcement (FR-046)
            </h2>
            <button
              type="button"
              onClick={() => setShowPublishForm(false)}
              className="text-xs text-stone-500 hover:text-stone-900"
            >
              Close
            </button>
          </div>

          <form onSubmit={handlePublish} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="not-title" className="block text-xs font-medium text-stone-700 mb-1">
                  Subject / Title *
                </label>
                <input
                  id="not-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Free Flu Vaccination Schedule"
                  className="w-full h-10 px-3 text-xs bg-white border border-stone-300 rounded-none-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
                />
              </div>

              <div>
                <label htmlFor="not-type" className="block text-xs font-medium text-stone-700 mb-1">
                  Notification Category
                </label>
                <select
                  id="not-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as NotificationItem['type'])}
                  className="w-full h-10 px-3 text-xs bg-white border border-stone-300 rounded-none-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
                >
                  <option value="Announcement">Health Center Announcement</option>
                  <option value="Appointment">Appointment Reminder</option>
                  <option value="Follow-up">Clinical Follow-Up Reminder</option>
                  <option value="System">System Notice</option>
                </select>
              </div>

              <div>
                <label htmlFor="not-target" className="block text-xs font-medium text-stone-700 mb-1">
                  Audience
                </label>
                <select
                  id="not-target"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as UserRole | 'all')}
                  className="w-full h-10 px-3 text-xs bg-white border border-stone-300 rounded-none-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
                >
                  <option value="all">All Patients & Personnel</option>
                  <option value="patient">Patients Only</option>
                  <option value="nurse">Nurses Only</option>
                  <option value="doctor">Doctors Only</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="not-msg" className="block text-xs font-medium text-stone-700 mb-1">
                Announcement Message *
              </label>
              <textarea
                id="not-msg"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write clear instructions, schedule details, and requirements for patients..."
                className="w-full p-3 text-xs bg-white border border-stone-300 rounded-none-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowPublishForm(false)}
                className="px-4 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-none-none hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-none-none hover:bg-indigo-800"
              >
                Broadcast Announcement
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-none-none divide-y divide-stone-200">
        {visibleNotifications.map((item) => (
          <div
            key={item.id}
            className={`p-5 flex items-start justify-between gap-4 ${
              item.read ? 'bg-white' : 'bg-stone-50/70'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="font-semibold text-indigo-700">{item.type}</span>
                <span aria-hidden="true">·</span>
                <span>Target: {item.targetRole}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{item.createdAt}</span>
              </div>
              <h2 className="text-sm font-bold text-stone-900 mt-1">{item.title}</h2>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">{item.message}</p>
            </div>
            {!item.read && (
              <button
                type="button"
                onClick={() => onMarkRead(item.id)}
                className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-teal-50 hover:bg-teal-100 rounded-none shrink-0 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Read</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

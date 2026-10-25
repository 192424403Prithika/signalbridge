import React, { useState, useEffect } from 'react';
import {
  Settings, Lock, ShieldCheck, Download, Trash2, CheckCircle2,
  AlertCircle, History, Sparkles, User, Bell, ExternalLink,
  Moon, Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { HealthProfile } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser, logout, darkMode, toggleDarkMode } = useAuth();

  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [preferredName, setPreferredName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [ageRange, setAgeRange] = useState('25-34');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');

  // Password change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Privacy & Consent
  const [aiConsent, setAiConsent] = useState(user?.ai_consent || false);
  const [dataSharing, setDataSharing] = useState(false);
  const [sensitiveOptIn, setSensitiveOptIn] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  useEffect(() => {
    api.getProfile()
      .then((p) => {
        setProfile(p);
        setPreferredName(p.preferred_name || '');
        setPronouns(p.pronouns || '');
        setAgeRange(p.age_range || '25-34');
        setAllergies(p.allergies || '');
        setConditions(p.long_term_conditions || '');
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    if (user?.privacy_settings) {
      setDataSharing(user.privacy_settings.data_sharing || false);
      setSensitiveOptIn(user.privacy_settings.sensitive_categories_opt_in || false);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.updateProfile({
        preferred_name: preferredName,
        pronouns,
        age_range: ageRange,
        allergies,
        long_term_conditions: conditions,
      });
      setFeedback({ type: 'success', text: 'Profile updated successfully.' });
      refreshUser();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update profile.' });
    }
  };

  const handleUpdatePrivacy = async () => {
    setFeedback(null);
    try {
      await api.updatePrivacy({
        ai_consent: aiConsent,
        data_sharing: dataSharing,
        sensitive_categories_opt_in: sensitiveOptIn,
        export_restricted: false,
      });
      setFeedback({ type: 'success', text: 'Privacy & AI settings updated.' });
      refreshUser();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update privacy settings.' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.changePassword({ old_password: oldPassword, new_password: newPassword });
      setFeedback({ type: 'success', text: 'Password successfully changed.' });
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update password.' });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    try {
      await api.deleteAccount();
      logout();
      window.location.href = '/';
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Deletion failed.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-600" />
          Settings, Privacy & Portability
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Manage your account profile, privacy controls, AI processing consent, and complete data export.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Appearance & Theme Section */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {darkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-brand-600" />}
              Appearance & Theme
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize your interface display preference.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Current: {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            onClick={() => { if (darkMode) toggleDarkMode(); }}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2.5 transition text-center cursor-pointer ${
              !darkMode
                ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 font-bold ring-2 ring-brand-500/30'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center shadow-xs">
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <span className="text-xs font-bold block">Light Theme</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Crisp, high-contrast light mode</span>
            </div>
            {!darkMode && (
              <span className="text-[10px] font-semibold bg-brand-200 dark:bg-brand-900 text-brand-800 dark:text-brand-200 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { if (!darkMode) toggleDarkMode(); }}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2.5 transition text-center cursor-pointer ${
              darkMode
                ? 'border-brand-500 bg-brand-950/70 text-brand-200 font-bold ring-2 ring-brand-500/30'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shadow-xs">
              <Moon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-xs font-bold block">Dark Theme</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Sleek dark mode easy on eyes</span>
            </div>
            {darkMode && (
              <span className="text-[10px] font-semibold bg-brand-900 text-brand-200 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 1. Profile Management */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-4 h-4 text-brand-600" />
          Personal Profile & Preferences
        </h2>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Preferred Name
              </label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pronouns
              </label>
              <input
                type="text"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Age Range
              </label>
              <select
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <option value="18-24">18–24</option>
                <option value="25-34">25–34</option>
                <option value="35-44">35–44</option>
                <option value="45-54">45–54</option>
                <option value="55+">55 and above</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Allergies (Optional)
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Existing Long-Term Conditions (Optional)
            </label>
            <input
              type="text"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* 2. Privacy & AI Consent Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Privacy Controls & Consent Settings
        </h2>

        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Natural-Language AI Processing Consent
              </span>
              <p className="text-xs text-slate-500">
                Enables AI symptom extraction from natural text descriptions. AI proposals always require your manual review.
              </p>
            </div>
            <input
              type="checkbox"
              checked={aiConsent}
              onChange={(e) => setAiConsent(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 mt-1"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Sensitive Categories Opt-In
              </span>
              <p className="text-xs text-slate-500">
                Explicitly enable logging and analysis of sensitive sexual or fertility health indicators.
              </p>
            </div>
            <input
              type="checkbox"
              checked={sensitiveOptIn}
              onChange={(e) => setSensitiveOptIn(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 mt-1"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Two-Factor Authentication (2FA) Prototype
              </span>
              <p className="text-xs text-slate-500">
                Require a second authorization factor when signing in from unfamiliar browsers.
              </p>
            </div>
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(e) => setTwoFactorEnabled(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 mt-1"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleUpdatePrivacy}
              className="px-5 py-2 rounded-xl bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-xs"
            >
              Update Privacy Preferences
            </button>
          </div>
        </div>
      </div>

      {/* 3. Data Portability & Complete Export */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-brand-600" />
          Data Portability & Full Export (GDPR Compliant)
        </h2>
        <p className="text-xs text-slate-500">
          Download your complete history of entries, medication logs, cycles, reports, and audit events at any time.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href={api.getExportUrl('/user/export/json')}
            download
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Complete History (.JSON)</span>
          </a>

          <a
            href={api.getExportUrl('/user/export/csv')}
            download
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Symptom Entries (.CSV)</span>
          </a>
        </div>
      </div>

      {/* 4. Password Change */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-600" />
          Security & Password Change
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Password (8+ characters)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* 5. Permanent Account Deletion */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-rose-200 dark:border-rose-950 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Danger Zone: Permanent Account Deletion
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Permanently delete your user profile and cascade delete all associated symptom logs, cycle history, medications, and consultation reports. This action cannot be undone.
        </p>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
        >
          Request Permanent Account Deletion
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Permanently Delete All Your Health Records?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              To confirm permanent erasure of all records under <strong>{user?.email}</strong>, type{' '}
              <span className="font-mono font-bold text-rose-600">DELETE</span> below:
            </p>

            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-center font-mono text-xs uppercase font-bold"
            />

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteInput !== 'DELETE'}
                onClick={handleDeleteAccount}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-40"
              >
                Permanently Erase Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, BarChart3, ToggleLeft, ToggleRight, Plus, CheckCircle2,
  Lock, EyeOff, Layers, AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { SymptomTaxonomy } from '../types';

export const AdminPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [taxonomy, setTaxonomy] = useState<SymptomTaxonomy[]>([]);
  const [loading, setLoading] = useState(true);

  // New taxonomy form
  const [newSymName, setNewSymName] = useState('');
  const [newSymCategory, setNewSymCategory] = useState('Pain');
  const [newSymDescription, setNewSymDescription] = useState('');
  const [newSymUrgency, setNewSymUrgency] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [m, flags, tax] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminFlags(),
        api.getAdminTaxonomy(),
      ]);
      setMetrics(m);
      setFeatureFlags(flags);
      setTaxonomy(tax);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleFlag = async (flagKey: string) => {
    try {
      const res = await api.toggleAdminFlag(flagKey);
      setFeatureFlags((prev) => ({ ...prev, [flagKey]: res.enabled }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTaxonomyActive = async (id: number) => {
    try {
      await api.toggleTaxonomyActive(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTaxonomy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCustomSymptom({
        name: newSymName,
        category: newSymCategory,
        description: newSymDescription,
        urgency_flag: newSymUrgency,
      });
      setStatusFeedback(`Added ${newSymName} to taxonomy.`);
      setNewSymName('');
      setNewSymDescription('');
      fetchData();
    } catch (err: any) {
      setStatusFeedback(err.message || 'Failed to add item');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            System Metrics & Taxonomy Maintenance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Administrative operations with strict privacy isolation. Private user entries are never accessible.
          </p>
        </div>
      </div>

      {/* Strict Privacy Guarantee Box */}
      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-purple-950 dark:text-purple-200 text-xs flex items-start gap-3">
        <EyeOff className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Strict User Data Isolation Policy: </span>
          <p>
            By design and architectural constraint, this dashboard only reveals anonymized count aggregates and distribution summaries. Individual symptom entries, user identities, notes, or timelines are cryptographically and programmatically inaccessible to administrators.
          </p>
        </div>
      </div>

      {statusFeedback && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* Anonymized Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total User Accounts</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics?.total_registered_users || 0}
          </div>
          <span className="text-[11px] text-slate-500">
            {metrics?.total_active_users || 0} active users
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Aggregate Logs</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics?.total_symptom_entries_logged || 0}
          </div>
          <span className="text-[11px] text-slate-500">Across all categories</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Taxonomy Items</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {taxonomy.filter((t) => t.is_active).length}
          </div>
          <span className="text-[11px] text-slate-500">Recognized medical symptoms</span>
        </div>
      </div>

      {/* Feature Flags Manager */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-600" />
          Feature Flags & Service Switches
        </h3>

        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          {Object.entries(featureFlags).map(([key, val]) => (
            <div
              key={key}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40"
            >
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-slate-400">
                  Status: {val ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFlag(key)}
                className={`p-1 rounded-lg transition ${
                  val ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {val ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Taxonomy Manager */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Symptom Taxonomy Management
        </h3>

        {/* Add Taxonomy Form */}
        <form onSubmit={handleAddTaxonomy} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <span className="text-xs font-bold text-slate-900 dark:text-white block">Add New Symptom to Taxonomy</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <input
                type="text"
                required
                placeholder="Symptom Name (e.g. Tinnitus)"
                value={newSymName}
                onChange={(e) => setNewSymName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <select
                value={newSymCategory}
                onChange={(e) => setNewSymCategory(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <option value="Pain">Pain</option>
                <option value="Digestive">Digestive</option>
                <option value="Menstrual">Menstrual</option>
                <option value="Mood">Mood</option>
                <option value="Sleep">Sleep</option>
                <option value="Neurological">Neurological</option>
                <option value="Systemic">Systemic</option>
                <option value="Skin">Skin</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={newSymUrgency}
                  onChange={(e) => setNewSymUrgency(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Urgency Flag (Safety Notice)</span>
              </label>
              <button
                type="submit"
                className="ml-auto px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs"
              >
                Add
              </button>
            </div>
          </div>
        </form>

        {/* Existing Taxonomy Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
              <tr>
                <th className="px-4 py-2.5">Symptom</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Safety Notice</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {taxonomy.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-2 font-bold text-slate-900 dark:text-white">{s.name}</td>
                  <td className="px-4 py-2 text-slate-500">{s.category}</td>
                  <td className="px-4 py-2">
                    {s.urgency_flag ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold text-[10px]">
                        Active Alert
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Standard</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      s.is_active
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                    }`}>
                      {s.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => handleToggleTaxonomyActive(s.id)}
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      {s.is_active ? 'Disable' : 'Enable'}
                    </button>
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

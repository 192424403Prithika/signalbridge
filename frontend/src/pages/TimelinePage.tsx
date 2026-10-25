import React, { useState, useEffect } from 'react';
import {
  Clock, Filter, Calendar, AlertCircle, ChevronDown, ChevronUp,
  Edit2, Trash2, Tag, Shield, CheckCircle2, History, X
} from 'lucide-react';
import { api } from '../api/client';
import { SymptomEntry, SymptomTaxonomy } from '../types';

export const TimelinePage: React.FC = () => {
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [taxonomy, setTaxonomy] = useState<SymptomTaxonomy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedSymptomId, setSelectedSymptomId] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [cyclePhaseFilter, setCyclePhaseFilter] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<string>('all');
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);

  // Edit / Delete Modal State
  const [editingEntry, setEditingEntry] = useState<SymptomEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editSeverity, setEditSeverity] = useState<number>(5);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedSymptomId) params.symptom_id = selectedSymptomId;
      if (cyclePhaseFilter !== 'all') params.cycle_phase = cyclePhaseFilter;

      // Severity range
      if (severityFilter === 'mild') {
        params.severity_min = 0;
        params.severity_max = 3;
      } else if (severityFilter === 'moderate') {
        params.severity_min = 4;
        params.severity_max = 6;
      } else if (severityFilter === 'severe') {
        params.severity_min = 7;
        params.severity_max = 10;
      }

      // Date range presets
      const today = new Date();
      if (dateRangePreset === '7d') {
        const d = new Date();
        d.setDate(today.getDate() - 7);
        params.start_date = d.toISOString().split('T')[0];
      } else if (dateRangePreset === '30d') {
        const d = new Date();
        d.setDate(today.getDate() - 30);
        params.start_date = d.toISOString().split('T')[0];
      } else if (dateRangePreset === '90d') {
        const d = new Date();
        d.setDate(today.getDate() - 90);
        params.start_date = d.toISOString().split('T')[0];
      }

      const [entriesData, taxonomyData] = await Promise.all([
        api.getEntries(params),
        api.getTaxonomy(),
      ]);
      setEntries(entriesData);
      setTaxonomy(taxonomyData);
    } catch (err) {
      console.error('Failed to load timeline', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedSymptomId, severityFilter, cyclePhaseFilter, dateRangePreset]);

  const handleOpenEdit = (entry: SymptomEntry) => {
    setEditingEntry(entry);
    setEditNotes(entry.notes || '');
    setEditSeverity(entry.severity !== undefined && entry.severity !== null ? entry.severity : 5);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    try {
      await api.updateEntry(editingEntry.id, {
        severity: editSeverity,
        notes: editNotes,
      });
      setEditingEntry(null);
      fetchEntries();
    } catch (err) {
      console.error('Failed to update entry', err);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    try {
      await api.deleteEntry(id);
      setDeleteConfirmId(null);
      fetchEntries();
    } catch (err) {
      console.error('Failed to delete entry', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-brand-600" />
            Health Timeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Chronological audit trail of all recorded episodes with severity, context, and revision logs.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          Total Entries: {entries.length}
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </div>

        {/* Symptom Filter */}
        <select
          value={selectedSymptomId}
          onChange={(e) => setSelectedSymptomId(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Symptoms</option>
          {taxonomy.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">All Severities</option>
          <option value="mild">Mild (0–3)</option>
          <option value="moderate">Moderate (4–6)</option>
          <option value="severe">Severe (7–10)</option>
        </select>

        {/* Cycle Phase Filter */}
        <select
          value={cyclePhaseFilter}
          onChange={(e) => setCyclePhaseFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">All Cycle Phases</option>
          <option value="menstrual">Menstrual Phase</option>
          <option value="follicular">Follicular Phase</option>
          <option value="ovulation">Ovulation Phase</option>
          <option value="luteal">Luteal Phase</option>
        </select>

        {/* Date Range Preset */}
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-medium">
          {['all', '90d', '30d', '7d'].map((preset) => (
            <button
              key={preset}
              onClick={() => setDateRangePreset(preset)}
              className={`px-2.5 py-1.5 transition uppercase ${
                dateRangePreset === preset
                  ? 'bg-brand-600 text-white font-bold'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              {preset === 'all' ? 'All' : preset}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Entries List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading timeline records...</div>
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No matching records found
            </p>
            <p className="text-xs text-slate-500">
              Try adjusting your filter options or log a new symptom in your journal.
            </p>
          </div>
        ) : (
          entries.map((entry) => {
            const isExpanded = expandedEntryId === entry.id;
            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                {/* Main Card Header */}
                <div
                  onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Severity Badge */}
                    <div className="flex-shrink-0">
                      {entry.severity !== null && entry.severity !== undefined ? (
                        <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-bold text-xs shadow-xs ${
                          entry.severity >= 7
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                            : entry.severity >= 4
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                        }`}>
                          <span className="text-sm leading-none">{entry.severity}</span>
                          <span className="text-[9px] uppercase font-semibold">/10</span>
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-[10px] text-slate-400 font-semibold">
                          None
                        </div>
                      )}
                    </div>

                    {/* Title & Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {entry.symptom_name}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {entry.symptom_category}
                        </span>
                        {entry.cycle_phase && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-plum-50 dark:bg-plum-950/60 text-plum-700 dark:text-plum-300 border border-plum-200 dark:border-plum-800 capitalize">
                            {entry.cycle_phase} phase
                          </span>
                        )}
                        {entry.ai_extracted && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            NLP Extracted
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>{entry.onset_date} {entry.onset_time ? `@ ${entry.onset_time}` : ''}</span>
                        {entry.duration_minutes ? (
                          <>
                            <span>&bull;</span>
                            <span>{entry.duration_minutes} mins</span>
                          </>
                        ) : null}
                        {entry.body_location ? (
                          <>
                            <span>&bull;</span>
                            <span>{entry.body_location}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Expand / Collapse Icon */}
                  <div className="flex items-center gap-2">
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                    {/* Notes */}
                    {entry.notes && (
                      <div className="text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-semibold block text-slate-900 dark:text-white mb-0.5">Logged Notes:</span>
                        <p className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          {entry.notes}
                        </p>
                      </div>
                    )}

                    {/* Context Factors */}
                    {entry.contexts && entry.contexts.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                          Associated Triggers & Context:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.contexts.map((ctx, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              {ctx.context_type}: <strong>{ctx.value}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audit Trail & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5" />
                        <span>Source: {entry.source_type} &bull; Recorded {new Date(entry.recorded_at).toLocaleDateString()}</span>
                        {entry.edit_history && entry.edit_history.length > 1 && (
                          <span className="text-brand-600 dark:text-brand-400">
                            ({entry.edit_history.length - 1} edits recorded)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(entry)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(entry.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Entry: {editingEntry.symptom_name}
              </h3>
              <button onClick={() => setEditingEntry(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Severity (0–10): <span className="font-bold text-brand-600">{editSeverity}/10</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(Number(e.target.value))}
                  className="w-full accent-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Symptom Entry?</h3>
              <p className="text-xs text-slate-500 mt-1">
                This will permanently remove this record from your timeline and recalculate analytics.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEntry(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

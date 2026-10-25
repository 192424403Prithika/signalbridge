import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, CheckCircle2, BookmarkPlus, EyeOff, Layers, Calculator, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { api } from '../../api/client';
import { EvidenceDetail } from '../../types';

interface EvidenceModalProps {
  insightId: number | null;
  customEvidence?: Partial<EvidenceDetail> | null;
  onClose: () => void;
  onInsightUpdated?: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  insightId,
  customEvidence,
  onClose,
  onInsightUpdated,
}) => {
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (customEvidence) {
      setEvidence(customEvidence as EvidenceDetail);
      return;
    }
    if (insightId) {
      setLoading(true);
      api.getEvidence(insightId)
        .then((data) => setEvidence(data))
        .catch((err) => console.error('Failed to load evidence', err))
        .finally(() => setLoading(false));
    }
  }, [insightId, customEvidence]);

  if (!insightId && !customEvidence) return null;

  const handleDismiss = async () => {
    if (!insightId) return;
    try {
      await api.dismissInsight(insightId);
      setActionSuccess('Insight dismissed.');
      setTimeout(() => {
        onClose();
        if (onInsightUpdated) onInsightUpdated();
      }, 800);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveToReport = async () => {
    if (!insightId) return;
    try {
      await api.saveInsightToReport(insightId);
      setActionSuccess('Insight saved to consultation report draft!');
      setTimeout(() => {
        setActionSuccess(null);
        if (onInsightUpdated) onInsightUpdated();
      }, 1500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Evidence & Calculation Transparency
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Traceable source records and deterministic calculation method
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p>Retrieving contributing records and mathematical parameters...</p>
          </div>
        ) : evidence ? (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Action Feedback Banner */}
            {actionSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {actionSuccess}
              </div>
            )}

            {/* Insight Statement */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Observed Pattern Statement
              </span>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {evidence.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {evidence.description}
              </p>
            </div>

            {/* Metadata Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sample Size (N)</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {evidence.sample_size} records
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Confidence Level</span>
                <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full inline-block mt-1 ${
                  evidence.confidence_level?.includes('high')
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                    : evidence.confidence_level?.includes('moderate')
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                }`}>
                  {evidence.confidence_level || 'Moderate evidence'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Excluded Records</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {evidence.excluded_records_count || 0}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Type</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block mt-1">
                  Deterministic Logic
                </span>
              </div>
            </div>

            {/* Formula & Rule explanation */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                Calculation Formula & Rule:
              </span>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-950 font-mono text-slate-800 dark:text-slate-200 text-xs">
                {evidence.calculation_formula}
              </div>
              {evidence.exclusion_reason && (
                <p className="text-[11px] text-slate-500">
                  <span className="font-medium">Exclusion rationale:</span> {evidence.exclusion_reason}
                </p>
              )}
            </div>

            {/* Contributing Records Table */}
            <div className="space-y-2">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand-600" />
                Contributing Source Records ({evidence.contributing_records?.length || 0}):
              </span>
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                <table className="w-full text-left divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Date & Time</th>
                      <th className="px-3 py-2">Symptom</th>
                      <th className="px-3 py-2">Severity</th>
                      <th className="px-3 py-2">Duration</th>
                      <th className="px-3 py-2">Location/Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                    {evidence.contributing_records && evidence.contributing_records.length > 0 ? (
                      evidence.contributing_records.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-1.5 whitespace-nowrap text-slate-500">
                            {rec.onset_date} {rec.onset_time || ''}
                          </td>
                          <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">
                            {rec.symptom}
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="font-semibold text-brand-700 dark:text-brand-300">
                              {rec.severity !== undefined && rec.severity !== null ? `${rec.severity}/10` : 'Unrated'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-500">
                            {rec.duration_minutes ? `${rec.duration_minutes} min` : 'unknown'}
                          </td>
                          <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {rec.notes || rec.body_location || '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                          No specific contributing records attached.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Non-Diagnostic Disclaimer Box */}
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Evidence Disclosures: </strong>
                {evidence.disclaimer || 'All insights reflect user-entered data only. Unlogged days are not assumed to be symptom-free. Temporal associations do not imply causation.'}
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3">
          {insightId ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Dismiss Insight
              </button>
              <button
                onClick={handleSaveToReport}
                className="px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 hover:bg-brand-100 border border-brand-200 dark:border-brand-800 text-xs font-medium transition flex items-center gap-1.5"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                Save to Report
              </button>
            </div>
          ) : (
            <div></div>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-white text-xs font-semibold transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

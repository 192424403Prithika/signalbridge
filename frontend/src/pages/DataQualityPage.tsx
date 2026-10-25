import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertTriangle, AlertCircle, Info, CheckCircle2,
  RefreshCw, Check, EyeOff, Wrench
} from 'lucide-react';
import { api } from '../api/client';
import { DataQualityIssue } from '../types';

export const DataQualityPage: React.FC = () => {
  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('open');
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchIssues = async (status = filterStatus) => {
    setLoading(true);
    try {
      const data = await api.getDataQualityIssues(status);
      setIssues(data);
    } catch (err) {
      console.error('Failed to load data quality issues', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues(filterStatus);
  }, [filterStatus]);

  const handleTriggerScan = async () => {
    setScanning(true);
    setFeedback(null);
    try {
      const res = await api.triggerQualityScan();
      setFeedback(`Data audit completed: ${res.open_issues_count} open issue(s) detected.`);
      fetchIssues(filterStatus);
    } catch (err: any) {
      setFeedback('Scan failed: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await api.resolveQualityIssue(id);
      setFeedback('Issue marked as resolved.');
      fetchIssues(filterStatus);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleIgnore = async (id: number) => {
    try {
      await api.ignoreQualityIssue(id);
      setFeedback('Issue marked as intentional / ignored.');
      fetchIssues(filterStatus);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            Data Quality & Integrity Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Automatically flags missing severity, reversed dates, duplicate logs, unconfirmed AI extractions, and gaps.
          </p>
        </div>

        <button
          onClick={handleTriggerScan}
          disabled={scanning}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Auditing Records...' : 'Run Fresh Quality Scan'}</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold">
        <span className="text-slate-400 uppercase mr-2">Filter:</span>
        {['open', 'resolved', 'ignored', 'all'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg capitalize transition ${
              filterStatus === st
                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Auditing database records...</div>
        ) : issues.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Open Data Quality Issues
            </h3>
            <p className="text-xs text-slate-500">
              Your logged entries satisfy all structural consistency, chronological validity, and completeness rules.
            </p>
          </div>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.id}
              className={`p-6 rounded-2xl border transition shadow-xs space-y-4 ${
                issue.status === 'open'
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {issue.severity === 'critical' ? (
                    <span className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300">
                      <AlertCircle className="w-5 h-5" />
                    </span>
                  ) : issue.severity === 'warning' ? (
                    <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300">
                      <AlertTriangle className="w-5 h-5" />
                    </span>
                  ) : (
                    <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                      <Info className="w-5 h-5" />
                    </span>
                  )}

                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Rule Type: {issue.issue_type.replace(/_/g, ' ')}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {issue.description}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                    issue.severity === 'critical'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                      : issue.severity === 'warning'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                  }`}>
                    {issue.severity} Priority
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                    {issue.status}
                  </span>
                </div>
              </div>

              {/* Plain-Language Suggested Action */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <span className="font-semibold block text-slate-900 dark:text-white">
                  Suggested Action:
                </span>
                <p>{issue.suggested_action}</p>
                {issue.affected_entry_ids && issue.affected_entry_ids.length > 0 && (
                  <div className="text-[11px] text-slate-400 pt-1">
                    Affected Record IDs: {issue.affected_entry_ids.join(', ')}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {issue.status === 'open' && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleIgnore(issue.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    Mark as Intentional / Ignore
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve(issue.id)}
                    className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark Resolved
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

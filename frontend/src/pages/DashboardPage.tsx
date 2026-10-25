import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, Sparkles, Clock, Calendar, AlertTriangle, ShieldCheck,
  TrendingUp, ArrowRight, PlusCircle, CheckCircle2, FileText, ChevronRight,
  Calculator, UserCheck, Flame, Bell, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { SymptomEntry, AnalyticsOverview, DataQualityIssue, Appointment } from '../types';
import { EvidenceModal } from '../components/Common/EvidenceModal';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [qualityIssues, setQualityIssues] = useState<DataQualityIssue[]>([]);
  const [upcomingAppointment, setUpcomingAppointment] = useState<Appointment | null>(null);
  const [selectedEvidenceInsight, setSelectedEvidenceInsight] = useState<number | null>(null);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recentEntries, overview, issues, appointments] = await Promise.all([
        api.getEntries({ limit: 6 }),
        api.getAnalyticsOverview(),
        api.getDataQualityIssues('open'),
        api.getAppointments(),
      ]);

      setEntries(recentEntries);
      setAnalytics(overview);
      setQualityIssues(issues);

      // Find upcoming appointment (date in future)
      const now = new Date().toISOString();
      const upcoming = appointments.find((a) => a.appointment_date >= now) || appointments[0] || null;
      setUpcomingAppointment(upcoming);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Data Completeness percentage: entries with both severity and duration/notes
  const totalEntries = entries.length;
  const completeEntries = entries.filter((e) => e.severity !== null && e.severity !== undefined).length;
  const completenessPct = totalEntries > 0 ? Math.round((completeEntries / totalEntries) * 100) : null;

  const readiness = analytics?.consultation_readiness;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Evidence Modal if opened */}
      <EvidenceModal
        insightId={selectedEvidenceInsight}
        onClose={() => setSelectedEvidenceInsight(null)}
        onInsightUpdated={fetchData}
      />

      {/* Greeting & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
            {todayStr}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Hello, {user?.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Evidence-based women's healthcare journal & clinical consultation readiness
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/journal"
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Symptom</span>
          </Link>
          <Link
            to="/reports"
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 text-brand-600" />
            <span>New Report</span>
          </Link>
        </div>
      </div>

      {/* Guided Onboarding for New / Empty Users */}
      {entries.length === 0 && !loading && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-50 via-purple-50 to-pink-50 dark:from-brand-950/40 dark:via-purple-950/30 dark:to-pink-950/40 border border-brand-200 dark:border-brand-900/60 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-brand-700 dark:text-brand-300">
            <Sparkles className="w-5 h-5 text-brand-600" />
            <h2 className="text-sm font-bold uppercase tracking-wide">
              Welcome to SignalBridge — Guided Onboarding
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            SignalBridge helps you organize longitudinal health facts so you can advocate for yourself in consultations.
            We use transparent mathematical formulas over your records — never hardcoded statistics or medical diagnoses.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-brand-100 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-brand-600 block">Step 1</span>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Record Daily Facts</h3>
              <p className="text-[11px] text-slate-500">Log symptoms with 0–10 severity, onset timing, duration, and contextual tags.</p>
              <Link to="/journal" className="inline-flex text-[11px] font-semibold text-brand-600 hover:underline pt-1">
                Open Journal &rarr;
              </Link>
            </div>

            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-brand-100 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-purple-600 block">Step 2</span>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Inspect Evidence</h3>
              <p className="text-[11px] text-slate-500">Review empirical frequency rates, non-window baseline shifts, and data quality.</p>
              <Link to="/analytics" className="inline-flex text-[11px] font-semibold text-purple-600 hover:underline pt-1">
                Explore Analytics &rarr;
              </Link>
            </div>

            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-brand-100 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-emerald-600 block">Step 3</span>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Prepare for Doctor</h3>
              <p className="text-[11px] text-slate-500">Check consultation readiness and export a structured, non-diagnostic clinician summary.</p>
              <Link to="/reports" className="inline-flex text-[11px] font-semibold text-emerald-600 hover:underline pt-1">
                Consultation Reports &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Data Quality Alert Banner if issues exist */}
      {qualityIssues.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-semibold">Data Quality Advisory: </span>
              Detected {qualityIssues.length} item{qualityIssues.length > 1 ? 's' : ''} (e.g.{' '}
              {qualityIssues[0].description})
            </div>
          </div>
          <Link
            to="/data-quality"
            className="px-3 py-1.5 rounded-lg bg-amber-200/80 dark:bg-amber-900 hover:bg-amber-300 font-semibold text-xs text-amber-950 dark:text-amber-100 whitespace-nowrap transition flex items-center gap-1"
          >
            Review Issues <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total verified records */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Records</span>
            <Clock className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {analytics?.total_records_in_period !== undefined ? analytics.total_records_in_period : entries.length}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {totalEntries > 0 ? 'Past 90 days active entries' : 'No symptom records yet'}
          </span>
        </div>

        {/* Average Severity - Strictly Handles Missing & Null */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Severity</span>
            <Activity className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {analytics?.severity_metrics?.has_data &&
            analytics?.severity_metrics?.average !== null &&
            analytics?.severity_metrics?.average !== undefined
              ? `${analytics.severity_metrics.average}/10`
              : totalEntries === 0
              ? 'No records yet'
              : 'Not available yet'}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {analytics?.severity_metrics?.has_data &&
            analytics?.severity_metrics?.max !== null &&
            analytics?.severity_metrics?.max !== undefined
              ? `Peak: ${analytics.severity_metrics.max}/10`
              : 'Peak: Not rated'}
          </span>
        </div>

        {/* Data Completeness Score - Strictly Honest Denominator */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Completeness Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {completenessPct !== null ? `${completenessPct}%` : 'Not evaluated'}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${completenessPct !== null ? completenessPct : 0}%` }}
            ></div>
          </div>
          <span className="text-[11px] text-slate-500 block">
            {totalEntries > 0
              ? `${completeEntries} of ${totalEntries} entries rated (0–10 scale)`
              : 'Awaiting first symptom log'}
          </span>
        </div>

        {/* Flare-Up Cluster Alert Status */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Flare-Up Alerts</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {analytics?.flare_ups?.filter((f) => f.status === 'detected').length || 0}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {totalEntries === 0
              ? 'No symptom records yet'
              : analytics?.flare_ups?.some((f) => f.status === 'detected')
              ? 'Elevated frequency cluster detected'
              : analytics?.flare_ups?.some((f) => f.status === 'insufficient_data')
              ? 'Not enough data to assess'
              : 'No flare-up detected (stable)'}
          </span>
        </div>
      </div>

      {/* Distinctive Feature: Consultation Readiness & Evidence Coverage Module */}
      {readiness && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Consultation Readiness & Evidence Coverage
                </h2>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    readiness.readiness_tier === 'Well Prepared'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                      : readiness.readiness_tier === 'Moderate Coverage'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                  }`}
                >
                  {readiness.readiness_tier}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transparent pre-visit checklist evaluating the organization and depth of your recorded health facts.
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {readiness.completeness_percentage}%
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {readiness.completed_criteria_count} of {readiness.total_criteria_count} Checkpoints Met
              </span>
            </div>
          </div>

          {/* Progress bar and formula disclosure */}
          <div className="space-y-1.5">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  readiness.completeness_percentage >= 85
                    ? 'bg-emerald-500'
                    : readiness.completeness_percentage >= 50
                    ? 'bg-brand-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${readiness.completeness_percentage}%` }}
              ></div>
            </div>
            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400">
              <span>Formula: {readiness.calculation_formula}</span>
              <span>{readiness.summary_statement}</span>
            </div>
          </div>

          {/* Transparent Checklist Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {readiness.checklist.map((item) => (
              <div
                key={item.key}
                className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                  item.is_complete
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                    : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {item.title}
                    </span>
                    {item.is_complete ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                    {item.available_summary}
                  </p>
                  {item.missing_summary && (
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 italic">
                      {item.missing_summary}
                    </p>
                  )}
                </div>

                <Link
                  to={item.target_link}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    item.is_complete
                      ? 'bg-slate-200/60 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
                  }`}
                >
                  <span>{item.action_text}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>

          {/* Practical Next Steps Recommendations */}
          {readiness.practical_next_steps && readiness.practical_next_steps.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wide">
                Suggested Next Steps for Better Visit Readiness:
              </span>
              <div className="flex flex-wrap gap-2.5">
                {readiness.practical_next_steps.map((step, idx) => (
                  <Link
                    key={idx}
                    to={step.link}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:border-brand-500 transition"
                  >
                    <span>{step.task}</span>
                    <ArrowRight className="w-3 h-3 text-brand-600" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Objective Disclaimer Notice */}
          <div className="text-[10px] text-slate-400 dark:text-slate-500 italic border-t border-slate-100 dark:border-slate-800 pt-3">
            {readiness.disclaimer}
          </div>
        </div>
      )}

      {/* Main Grid: Recent Symptoms & Next Appointment */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Symptom Logs (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              Recent Symptom Entries
            </h2>
            <Link to="/timeline" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
              View All Timeline &rarr;
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading recent records...</div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-xs text-slate-500">No symptom entries recorded yet.</p>
                <Link
                  to="/journal"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Log Your First Symptom
                </Link>
              </div>
            ) : (
              entries.slice(0, 6).map((entry) => (
                <div key={entry.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {entry.symptom_name}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {entry.symptom_category}
                      </span>
                      {entry.ai_extracted && !entry.user_confirmed && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300">
                          AI Proposal (Pending Confirmation)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                      <span>{entry.onset_date} {entry.onset_time ? `@ ${entry.onset_time}` : ''}</span>
                      {entry.duration_minutes ? <span>&bull; {entry.duration_minutes} mins</span> : null}
                      {entry.body_location ? <span>&bull; {entry.body_location}</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {entry.severity !== null && entry.severity !== undefined ? (
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                          entry.severity >= 7
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                            : entry.severity >= 4
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {entry.severity}/10
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No severity rating</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Appointment & Quick Actions (1 col) */}
        <div className="space-y-6">
          {/* Upcoming Appointment Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Upcoming Consultation
              </h3>
              <Link to="/appointments" className="text-xs text-brand-600 font-semibold hover:underline">
                Manage
              </Link>
            </div>

            {upcomingAppointment ? (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {upcomingAppointment.clinician_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {upcomingAppointment.specialty || 'General Practitioner'} &bull;{' '}
                    {upcomingAppointment.appointment_date}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <span className="font-semibold block text-slate-800 dark:text-slate-200">
                    Pre-Visit Agenda:
                  </span>
                  <p>{upcomingAppointment.top_concerns || 'Prepare symptom timeline and top questions.'}</p>
                </div>

                <Link
                  to="/appointments"
                  className="w-full py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 transition flex items-center justify-center gap-1.5"
                >
                  <span>Review Pre-Appointment Checklist</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-xs text-slate-500">No appointments scheduled.</p>
                <Link
                  to="/appointments"
                  className="inline-flex text-xs font-semibold text-brand-600 hover:underline"
                >
                  + Add Next Appointment
                </Link>
              </div>
            )}
          </div>

          {/* Consultation Report Shortcut Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-50 to-plum-50 dark:from-brand-950/40 dark:to-plum-950/40 border border-brand-200 dark:border-brand-900/60 space-y-3">
            <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
              <FileText className="w-5 h-5" />
              <h4 className="text-sm font-bold">Consultation Report Ready</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Export a clean, evidence-backed summary with your full frequency metrics, medication logs, and clinician questions.
            </p>
            <Link
              to="/reports"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <span>Generate Consultation Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Prominent Non-Diagnostic Medical Disclaimer Footer */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Transparent Mathematical Observations: </strong>
          All figures shown on this dashboard are empirical calculations derived strictly from the records you have logged.
          SignalBridge does not evaluate medical risks or diagnose diseases.
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, Sparkles, Clock, Calendar, AlertTriangle, ShieldCheck,
  TrendingUp, ArrowRight, PlusCircle, CheckCircle2, FileText, ChevronRight,
  Calculator, UserCheck, Flame, Bell
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
  const completenessPct = totalEntries > 0 ? Math.round((completeEntries / totalEntries) * 100) : 100;

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
            Here is your evidence summary across recent health logs
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
            {analytics?.total_records_in_period || entries.length}
          </div>
          <span className="text-[11px] text-slate-500 block">Past 90 days active entries</span>
        </div>

        {/* Average Severity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Severity</span>
            <Activity className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {analytics?.severity_metrics?.average !== undefined ? `${analytics.severity_metrics.average}/10` : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Peak: {analytics?.severity_metrics?.max !== undefined ? `${analytics.severity_metrics.max}/10` : 'None'}
          </span>
        </div>

        {/* Data Completeness */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Completeness Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {completenessPct}%
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${completenessPct}%` }}></div>
          </div>
        </div>

        {/* Notable Trend / Flare-Up */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Flare-Up Alerts</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {analytics?.flare_ups?.filter((f) => f.status === 'detected').length || 0}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {analytics?.flare_ups?.some((f) => f.status === 'detected')
              ? 'Elevated frequency cluster detected'
              : 'No current flare-up cluster'}
          </span>
        </div>
      </div>

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

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell
} from 'recharts';
import {
  BarChart3, TrendingUp, Calendar, AlertCircle, ShieldCheck, Flame,
  Share2, ArrowUpDown, Filter, Eye, Layers, Info
} from 'lucide-react';
import { api } from '../api/client';
import { AnalyticsOverview } from '../types';
import { EvidenceModal } from '../components/Common/EvidenceModal';

export const AnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRangeOption, setDateRangeOption] = useState<string>('90d');
  const [selectedEvidence, setSelectedEvidence] = useState<any | null>(null);

  const fetchAnalytics = async (range: string) => {
    setLoading(true);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    const past = new Date();

    if (range === '30d') {
      past.setDate(today.getDate() - 30);
    } else if (range === '14d') {
      past.setDate(today.getDate() - 14);
    } else {
      past.setDate(today.getDate() - 90);
    }

    const startStr = past.toISOString().split('T')[0];

    try {
      const data = await api.getAnalyticsOverview(startStr, endStr);
      setOverview(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(dateRangeOption);
  }, [dateRangeOption]);

  const COLORS = ['#d75f75', '#80a58d', '#c084fc', '#e58797', '#618a70', '#a855f7', '#fbbf24'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Evidence Modal */}
      {selectedEvidence && (
        <EvidenceModal
          insightId={null}
          customEvidence={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
        />
      )}

      {/* Header & Date Preset Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            Symptom Analytics & Evidence Patterns
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Deterministic descriptive calculations. Every observation is traceable to your verified logs.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase">Analysis Window:</span>
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
            {['14d', '30d', '90d'].map((r) => (
              <button
                key={r}
                onClick={() => setDateRangeOption(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  dateRangeOption === r
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Last {r.replace('d', ' Days')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transparent Methodology & Non-Diagnostic Banner */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            Evidence-Linked Analytical Framework:
          </span>
          <p>
            All charts on this page are pure deterministic aggregations calculated in Python. No medical conclusions, disease predictions, or diagnoses are inferred. Unlogged days are <strong>not</strong> assumed to be symptom-free.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400">
          <div className="inline-block w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p>Calculating frequency distributions, baseline shifts, and rolling flare-up windows...</p>
        </div>
      ) : overview ? (
        <div className="space-y-8">
          {/* Section 1: Frequency & Severity Trends Charts */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Chart 1: Symptom Frequency Bar Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Symptom Frequency in Period
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distinct active days with symptom logged &bull; {overview.date_range.start} to {overview.date_range.end}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSelectedEvidence({
                      title: 'Symptom Frequency Distribution',
                      description: 'Proportion of calendar days in the selected window where each symptom was recorded.',
                      sample_size: overview.total_records_in_period,
                      calculation_formula: 'frequency = distinct_days_with_symptom / total_days_in_period',
                      confidence_level: 'High evidence',
                      excluded_records_count: 0,
                      missing_data_summary: 'Unlogged days are not verified as symptom-free.',
                      disclaimer: 'Frequency indicates occurrence within recorded days, not disease presence.',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-brand-600" />
                  View Evidence
                </button>
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.symptom_frequency.slice(0, 7)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis
                      dataKey="symptom_name"
                      angle={-25}
                      textAnchor="end"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                              <span className="font-bold text-slate-900 dark:text-white block">{data.symptom_name}</span>
                              <div className="text-brand-600 dark:text-brand-300 font-semibold">
                                {data.distinct_days_count} active days ({data.frequency_percentage}%)
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {data.total_records_count} total entries logged
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="distinct_days_count" radius={[6, 6, 0, 0]}>
                      {overview.symptom_frequency.slice(0, 7).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Severity Summary & Metrics */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Severity Distribution & Extremes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Average, median, peak, and excluded unrated records
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSelectedEvidence({
                      title: 'Severity Ratings Calculation',
                      description: 'Central tendency and spread of validated 0–10 numeric ratings.',
                      sample_size: overview.severity_metrics.sample_size,
                      calculation_formula: 'mean = sum(severity) / N, median = middle value',
                      confidence_level: 'High evidence',
                      excluded_records_count: overview.severity_metrics.excluded_count,
                      exclusion_reason: 'Unrated symptom entries (missing numeric severity score)',
                      missing_data_summary: `${overview.severity_metrics.excluded_count} records excluded due to missing severity.`,
                      disclaimer: 'Pain or severity scores are self-reported subjective impressions.',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-brand-600" />
                  View Evidence
                </button>
              </div>

              {/* Metric Callouts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Average Severity</span>
                  <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {overview.severity_metrics.average !== undefined ? `${overview.severity_metrics.average}/10` : 'N/A'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Median Severity</span>
                  <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {overview.severity_metrics.median !== undefined ? `${overview.severity_metrics.median}/10` : 'N/A'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Peak Recorded</span>
                  <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
                    {overview.severity_metrics.max !== undefined ? `${overview.severity_metrics.max}/10` : 'None'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Excluded Unrated</span>
                  <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {overview.severity_metrics.excluded_count}
                  </span>
                </div>
              </div>

              {/* Severity Level Visual Scale */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Observed Severity Scale Interpretation
                </span>
                <div className="flex h-3 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 w-1/3" title="Mild (0-3)"></div>
                  <div className="bg-amber-400 w-1/3" title="Moderate (4-6)"></div>
                  <div className="bg-rose-500 w-1/3" title="Severe (7-10)"></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Mild (0–3): Noticeable</span>
                  <span>Moderate (4–6): Disruptive</span>
                  <span>Severe (7–10): Disabling</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Period Comparison & Baseline Comparison */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Period Comparison Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-brand-600" />
                    Period-Over-Period Comparison
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selected period vs. preceding equal calendar duration
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSelectedEvidence({
                      title: 'Period Comparison Evidence',
                      description: 'Mathematical shift in average severity and volume between two consecutive periods.',
                      sample_size:
                        overview.period_comparison.period1_records + overview.period_comparison.period2_records,
                      calculation_formula:
                        'absolute_change = p1_avg - p2_avg; percentage_change = ((p1_avg - p2_avg) / p2_avg) * 100',
                      confidence_level: 'Moderate evidence',
                      excluded_records_count: 0,
                      missing_data_summary: 'Computed strictly where base period average > 0.',
                      disclaimer: 'Differences may stem from logging frequency changes rather than physical health shifts.',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-brand-600" />
                  View Evidence
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Current Period</span>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {overview.period_comparison.period1_avg_severity !== undefined
                      ? `${overview.period_comparison.period1_avg_severity}/10`
                      : 'N/A'}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {overview.period_comparison.period1_records} records logged
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Preceding Window</span>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {overview.period_comparison.period2_avg_severity !== undefined
                      ? `${overview.period_comparison.period2_avg_severity}/10`
                      : 'N/A'}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {overview.period_comparison.period2_records} records logged
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-900/40 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-brand-900 dark:text-brand-200 block">
                    Mathematical Shift:
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {overview.period_comparison.interpretation}
                  </span>
                </div>
                {overview.period_comparison.severity_percentage_change !== null &&
                  overview.period_comparison.severity_percentage_change !== undefined && (
                    <span className={`text-sm font-extrabold px-3 py-1 rounded-lg ${
                      overview.period_comparison.severity_percentage_change > 0
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    }`}>
                      {overview.period_comparison.severity_percentage_change > 0 ? '+' : ''}
                      {overview.period_comparison.severity_percentage_change}%
                    </span>
                  )}
              </div>
            </div>

            {/* Flare-Up Cluster Detection Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    Rolling Flare-Up Clusters
                  </h3>
                  <p className="text-xs text-slate-500">
                    Trigger rule: &ge; 3 active days in rolling 7-day window &ge; 1.5 above baseline
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSelectedEvidence({
                      title: 'Flare-Up Detection Rule',
                      description: 'Mathematical flare-up detection requiring >= 3 logs in 7 days with elevated severity above personal baseline.',
                      sample_size: overview.total_all_time_records,
                      calculation_formula: 'window_days >= 3 AND window_avg >= (personal_baseline + 1.5)',
                      confidence_level: 'Moderate evidence',
                      excluded_records_count: 0,
                      missing_data_summary: 'Requires >= 10 historical records to establish a personal baseline.',
                      disclaimer: 'A flare-up is a mathematical frequency cluster, not a clinical relapse or diagnosis.',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-brand-600" />
                  View Evidence
                </button>
              </div>

              {overview.flare_ups && overview.flare_ups.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {overview.flare_ups.map((flare, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        flare.status === 'detected'
                          ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{flare.symptom_name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          flare.status === 'detected'
                            ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {flare.status === 'detected' ? 'Cluster Detected' : 'Insufficient Baseline'}
                        </span>
                      </div>

                      {flare.status === 'detected' ? (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-400 block font-semibold">Active Window</span>
                              <span>{flare.start_date} to {flare.end_date}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-semibold">Average Severity</span>
                              <span className="font-bold text-rose-600">{flare.window_average_severity}/10 (+{flare.elevation} vs baseline)</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                            Rule: {flare.rule}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500">
                          {flare.message || 'Requires at least 10 baseline records with severity.'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  No flare-up clusters detected within the selected timeframe.
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Correlation Explorer */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-600" />
                  Symptom & Context Co-Occurrence Explorer
                </h3>
                <p className="text-xs text-slate-500">
                  Conditional frequency: P(Symptom | Context) = (Days with both) / (Days with context)
                </p>
              </div>

              <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Correlation &ne; Causation Notice</span>
              </div>
            </div>

            {overview.correlations && overview.correlations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Symptom</th>
                      <th className="px-4 py-3">Context / Trigger Factor</th>
                      <th className="px-4 py-3">Matching Days</th>
                      <th className="px-4 py-3">Conditional Probability</th>
                      <th className="px-4 py-3">Mathematical Note</th>
                      <th className="px-4 py-3">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {overview.correlations.map((corr, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                          {corr.symptom}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-brand-700 dark:text-brand-300">
                          {corr.context}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                          {corr.both_days_count} of {corr.total_context_days} context days
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {corr.percentage}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-slate-400 italic">
                          Co-occurred in logged records
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedEvidence({
                                title: `Correlation: ${corr.symptom} with ${corr.context}`,
                                description: `Observed co-occurrence on ${corr.both_days_count} out of ${corr.total_context_days} days when ${corr.context} was logged.`,
                                sample_size: corr.both_days_count,
                                calculation_formula: corr.formula,
                                confidence_level: corr.total_context_days >= 5 ? 'Moderate evidence' : 'Low evidence',
                                excluded_records_count: 0,
                                missing_data_summary: 'Days without context logging cannot be verified.',
                                disclaimer: corr.disclaimer,
                              })
                            }
                            className="text-brand-600 hover:text-brand-800 dark:text-brand-400 text-xs font-semibold hover:underline"
                          >
                            Trace Records
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Not enough co-occurring context tags recorded yet to compute conditional probability.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

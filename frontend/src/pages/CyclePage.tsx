import React, { useState, useEffect } from 'react';
import {
  Calendar, Plus, AlertCircle, Clock, CheckCircle2, ShieldCheck,
  TrendingUp, Sparkles, HelpCircle, X
} from 'lucide-react';
import { api } from '../api/client';
import { Cycle, CyclePrediction } from '../types';

export const CyclePage: React.FC = () => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [prediction, setPrediction] = useState<CyclePrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);

  // Form
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [flow, setFlow] = useState<'light' | 'medium' | 'heavy' | 'spotting'>('medium');
  const [cycleLength, setCycleLength] = useState<number | ''>(28);
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cyclesData, predData] = await Promise.all([
        api.getCycles(),
        api.getCyclePrediction(),
      ]);
      setCycles(cyclesData);
      setPrediction(predData);
    } catch (err) {
      console.error('Failed to load cycles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.recordCycle({
        period_start_date: startDate,
        period_end_date: endDate || undefined,
        flow_intensity: flow,
        cycle_length: cycleLength !== '' ? Number(cycleLength) : undefined,
        notes: notes || undefined,
      });
      setShowLogModal(false);
      setNotes('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-brand-600" />
            Menstrual Rhythm & Cycle Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Log period intervals, flow intensity, and approximate cycle phases.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Cycle Entry</span>
        </button>
      </div>

      {/* Cycle Prediction Card with Uncertainty Disclosures */}
      {prediction && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-plum-50/60 to-brand-50/60 dark:from-plum-950/40 dark:to-brand-950/40 border border-plum-200 dark:border-plum-900/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-plum-900 dark:text-plum-200">
              <Sparkles className="w-4 h-4 text-plum-600 dark:text-plum-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Cycle Mathematical Estimate
              </h3>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-plum-100 dark:bg-plum-900/80 text-plum-800 dark:text-plum-200">
              {prediction.confidence === 'insufficient_data' ? 'Preliminary' : 'Moderate Evidence'}
            </span>
          </div>

          {prediction.predicted_next_period_start ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-plum-100 dark:border-plum-900">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Estimated Next Start</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {prediction.predicted_next_period_start}
                </span>
                <span className="text-[11px] text-slate-500 block">Est. End: {prediction.predicted_next_period_end}</span>
              </div>

              <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-plum-100 dark:border-plum-900">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Observed Interval Average</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {prediction.cycle_length_average} Days
                </span>
                <span className="text-[11px] text-slate-500 block">Based on past recorded entries</span>
              </div>

              <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-plum-100 dark:border-plum-900">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Est. Ovulation Window</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {prediction.predicted_ovulation_date}
                </span>
                <span className="text-[11px] text-slate-500 block">~14 days prior to estimated onset</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {prediction.uncertainty_notice}
            </p>
          )}

          {/* Uncertainty Disclosure Alert */}
          <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-plum-200 dark:border-plum-800/80 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-plum-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Biological Variation Notice: </strong>
              {prediction.uncertainty_notice}
            </div>
          </div>
        </div>
      )}

      {/* Cycle History Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Logged Menstrual Cycle History
        </h3>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading cycle records...</div>
        ) : cycles.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No menstrual cycle periods logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Start Date</th>
                  <th className="px-4 py-2.5">End Date</th>
                  <th className="px-4 py-2.5">Flow Intensity</th>
                  <th className="px-4 py-2.5">Cycle Length</th>
                  <th className="px-4 py-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {cycles.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2 font-bold text-slate-900 dark:text-white">
                      {c.period_start_date}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {c.period_end_date || 'In progress'}
                    </td>
                    <td className="px-4 py-2">
                      <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                        {c.flow_intensity}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {c.cycle_length ? `${c.cycle_length} days` : '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-400 max-w-xs truncate">
                      {c.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Cycle Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Log Period Dates</h3>
              <button onClick={() => setShowLogModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordCycle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Period Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Period End Date (Optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Flow Intensity
                </label>
                <select
                  value={flow}
                  onChange={(e: any) => setFlow(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="heavy">Heavy</option>
                  <option value="spotting">Spotting</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cycle Length (Days, Optional)
                </label>
                <input
                  type="number"
                  min={20}
                  max={50}
                  value={cycleLength}
                  onChange={(e) => setCycleLength(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Mild pre-menstrual cramping"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold"
                >
                  Save Cycle Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

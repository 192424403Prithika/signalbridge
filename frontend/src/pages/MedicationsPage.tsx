import React, { useState, useEffect } from 'react';
import {
  Pill, Plus, CheckCircle2, Clock, AlertCircle, X, ShieldAlert,
  Calendar, Check, AlertTriangle, Layers
} from 'lucide-react';
import { api } from '../api/client';
import { Medication, MedicationLog } from '../types';

export const MedicationsPage: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);

  // New Medication Form
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('');
  const [prescriber, setPrescriber] = useState('');
  const [notes, setNotes] = useState('');

  // Dose Log Form
  const [selectedMedId, setSelectedMedId] = useState<number | ''>('');
  const [doseStatus, setDoseStatus] = useState<string>('taken');
  const [sideEffects, setSideEffects] = useState<string>('');
  const [perceivedEffectiveness, setPerceivedEffectiveness] = useState<string>('moderate');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [medsData, logsData] = await Promise.all([
        api.getMedications(),
        api.getMedicationLogs(),
      ]);
      setMedications(medsData);
      setLogs(logsData);
      if (medsData.length > 0 && selectedMedId === '') {
        setSelectedMedId(medsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load medications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addMedication({
        name,
        dosage,
        frequency,
        start_date: startDate,
        purpose,
        prescriber,
        notes,
        is_active: true,
      });
      setShowAddModal(false);
      setName('');
      setDosage('');
      setPurpose('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogDose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId) return;
    try {
      await api.logMedicationDose({
        medication_id: Number(selectedMedId),
        status: doseStatus,
        side_effects: sideEffects || undefined,
        perceived_effectiveness: perceivedEffectiveness,
      });
      setShowLogModal(false);
      setSideEffects('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Pill className="w-6 h-6 text-brand-600" />
            Medications & Supplements Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Record prescriptions, supplements, dosages, adherence logs, and perceived side effects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLogModal(true)}
            disabled={medications.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span>Log Daily Dose</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medication</span>
          </button>
        </div>
      </div>

      {/* Mandatory Non-Causality Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Temporal Association Notice: </span>
          Temporal overlap between medication logs and symptom changes does <strong>not</strong> prove medical cause or effect.
          Do not alter prescription dosages without consulting your prescribing healthcare provider.
        </div>
      </div>

      {/* Medications Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-xs text-slate-400">Loading medications...</div>
        ) : medications.length === 0 ? (
          <div className="col-span-2 p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <Pill className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Medications Logged</h3>
            <p className="text-xs text-slate-500">
              Add your current vitamins, supplements, or prescriptions to track adherence alongside your symptoms.
            </p>
          </div>
        ) : (
          medications.map((med) => (
            <div
              key={med.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {med.name}
                  </h3>
                  <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-0.5">
                    {med.dosage} &bull; {med.frequency}
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Start Date</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{med.start_date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Purpose / Target</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{med.purpose || 'Unspecified'}</span>
                </div>
              </div>

              {med.notes && (
                <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {med.notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Adherence Logs History Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-600" />
          Recent Adherence & Dose Logs
        </h3>

        {logs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No daily dose records logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Date & Time</th>
                  <th className="px-4 py-2.5">Medication</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Effectiveness Impression</th>
                  <th className="px-4 py-2.5">Observed Side Effects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {logs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(log.taken_at).toLocaleDateString()} {new Date(log.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2 font-bold text-slate-900 dark:text-white">
                      {log.medication_name}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        log.status === 'taken'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                          : log.status === 'missed'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 capitalize text-slate-600 dark:text-slate-300">
                      {log.perceived_effectiveness || 'Not assessed'}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {log.side_effects || 'None noted'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Medication / Supplement</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedication} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Medication / Supplement Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Magnesium Glycinate, Progesterone"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Dosage</label>
                  <input
                    type="text"
                    required
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 200 mg"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                  <input
                    type="text"
                    required
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="e.g. Once nightly"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Muscle relaxation, ferritin support"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold"
                >
                  Save Medication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Dose Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Daily Dose</h3>
              <button onClick={() => setShowLogModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogDose} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Medication</label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  {medications.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.dosage})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={doseStatus}
                  onChange={(e) => setDoseStatus(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="taken">Taken</option>
                  <option value="missed">Missed</option>
                  <option value="skipped">Skipped / Paused</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Side Effects (Optional)
                </label>
                <input
                  type="text"
                  value={sideEffects}
                  onChange={(e) => setSideEffects(e.target.value)}
                  placeholder="e.g. Mild stomach upset, drowsiness"
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
                  Confirm Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

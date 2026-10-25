import React, { useState, useEffect } from 'react';
import {
  UserCheck, Plus, Calendar, Clock, CheckSquare, Square,
  FileText, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { api } from '../api/client';
import { Appointment } from '../types';

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);

  // New Appointment Form
  const [clinicianName, setClinicianName] = useState('');
  const [specialty, setSpecialty] = useState('Gynecologist / Women’s Health');
  const [appDate, setAppDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [location, setLocation] = useState('Main Clinic Suite 400');
  const [topConcerns, setTopConcerns] = useState('Evaluating pelvic pain and fatigue patterns.');
  const [questionsToAsk, setQuestionsToAsk] = useState('1. Does my frequency chart warrant pelvic ultrasound?');

  // Pre-visit checklist toggles
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    printed_report: false,
    listed_questions: true,
    medication_list_ready: true,
    data_gaps_noted: false,
    photos_or_records_brought: false,
  });

  // Post-visit notes editor
  const [postVisitNotes, setPostVisitNotes] = useState('');
  const [testsOrdered, setTestsOrdered] = useState('');
  const [referrals, setReferrals] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments();
      setAppointments(data);
      if (data.length > 0 && !selectedApp) {
        selectAppointment(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const selectAppointment = (app: Appointment) => {
    setSelectedApp(app);
    setPostVisitNotes(app.post_visit_notes || '');
    setTestsOrdered(app.tests_ordered || '');
    setReferrals(app.referrals || '');
    setTreatmentPlan(app.treatment_plan || '');
    setFollowUpDate(app.follow_up_date || '');
    if (app.pre_visit_checklist) {
      setChecklist({ ...checklist, ...app.pre_visit_checklist });
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newApp = await api.createAppointment({
        clinician_name: clinicianName,
        specialty,
        appointment_date: appDate,
        location,
        top_concerns: topConcerns,
        questions_to_ask: questionsToAsk,
        pre_visit_checklist: checklist,
      });
      setShowAddModal(false);
      selectAppointment(newApp);
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePostVisit = async () => {
    if (!selectedApp) return;
    setSavingNotes(true);
    try {
      await api.updateAppointment(selectedApp.id, {
        post_visit_notes: postVisitNotes,
        tests_ordered: testsOrdered,
        referrals,
        treatment_plan: treatmentPlan,
        follow_up_date: followUpDate || undefined,
        pre_visit_checklist: checklist,
      });
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
      fetchAppointments();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  const toggleChecklistItem = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-600" />
            Appointment Preparation & Post-Visit Notes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Formulate targeted pre-visit agendas, checklist items, and maintain a longitudinal log of clinician advice.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Appointment</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Appointments Sidebar */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Consultations ({appointments.length})
          </h2>

          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading appointments...</div>
            ) : appointments.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-500">No appointments scheduled.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  + Add Next Doctor Visit
                </button>
              </div>
            ) : (
              appointments.map((a) => {
                const isSelected = selectedApp?.id === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => selectAppointment(a)}
                    className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                      isSelected
                        ? 'bg-brand-50/70 dark:bg-brand-950/60 border-brand-500 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {a.clinician_name}
                      </h4>
                      <span className="text-[10px] text-slate-400">{a.specialty}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-brand-600" />
                      <span>{a.appointment_date}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Appointment Details, Checklist & Post-Visit Form */}
        <div className="lg:col-span-2 space-y-6">
          {selectedApp ? (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              {/* Consultation Details */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedApp.clinician_name}
                  </h3>
                  <div className="text-xs text-brand-600 font-semibold mt-0.5">
                    {selectedApp.specialty} &bull; {selectedApp.location}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Scheduled: {selectedApp.appointment_date}</span>
                  </div>
                </div>
              </div>

              {/* Pre-Appointment Checklist Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  Pre-Appointment Preparation Checklist
                </h4>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'listed_questions', label: 'Top 3 questions finalized' },
                    { key: 'medication_list_ready', label: 'Medications and supplements verified' },
                    { key: 'printed_report', label: 'Generated consultation report' },
                    { key: 'data_gaps_noted', label: 'Unlogged gaps noted to doctor' },
                    { key: 'photos_or_records_brought', label: 'Photos or lab records prepared' },
                  ].map((item) => {
                    const isChecked = checklist[item.key] || false;
                    return (
                      <div
                        key={item.key}
                        onClick={() => toggleChecklistItem(item.key)}
                        className={`p-3 rounded-xl border cursor-pointer select-none transition flex items-center gap-2.5 ${
                          isChecked
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Concerns & Questions */}
              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="font-semibold text-slate-900 dark:text-white block">Top Clinical Concerns:</span>
                  <p className="text-slate-600 dark:text-slate-300">{selectedApp.top_concerns || 'None specified'}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="font-semibold text-slate-900 dark:text-white block">Prepared Questions:</span>
                  <p className="text-slate-600 dark:text-slate-300">{selectedApp.questions_to_ask || 'None specified'}</p>
                </div>
              </div>

              {/* Post-Visit Notes Form */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Post-Visit Clinical Debrief & Advice
                  </h4>
                  {savedFeedback && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Doctor Advice & Clinical Discussion Summary
                    </label>
                    <textarea
                      rows={3}
                      value={postVisitNotes}
                      onChange={(e) => setPostVisitNotes(e.target.value)}
                      placeholder="What did the clinician recommend? Any dietary or lifestyle suggestions?"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Diagnostic Tests Ordered
                      </label>
                      <input
                        type="text"
                        value={testsOrdered}
                        onChange={(e) => setTestsOrdered(e.target.value)}
                        placeholder="e.g. CBC, Ferritin, Pelvic Ultrasound"
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Referrals / Specialists
                      </label>
                      <input
                        type="text"
                        value={referrals}
                        onChange={(e) => setReferrals(e.target.value)}
                        placeholder="e.g. Pelvic Floor PT, Endocrinology"
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Agreed Treatment Plan
                      </label>
                      <input
                        type="text"
                        value={treatmentPlan}
                        onChange={(e) => setTreatmentPlan(e.target.value)}
                        placeholder="e.g. Trial magnesium 200mg, re-check in 8 weeks"
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Follow-Up Date
                      </label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSavePostVisit}
                      disabled={savingNotes}
                      className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
                    >
                      {savingNotes ? 'Saving Notes...' : 'Save Post-Visit Record'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
              Select an appointment or create a new one to prepare your checklist.
            </div>
          )}
        </div>
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Schedule Consultation</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAppointment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Clinician Name</label>
                <input
                  type="text"
                  required
                  value={clinicianName}
                  onChange={(e) => setClinicianName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Vance, MD"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Specialty</label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={appDate}
                  onChange={(e) => setAppDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Top Concern</label>
                <input
                  type="text"
                  value={topConcerns}
                  onChange={(e) => setTopConcerns(e.target.value)}
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
                  Save Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

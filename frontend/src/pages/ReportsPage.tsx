import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Download, Printer, Trash2, Eye, ShieldCheck,
  Calendar, Clock, CheckCircle2, AlertCircle, FileCode, Copy
} from 'lucide-react';
import { api } from '../api/client';
import { Report } from '../types';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);

  // Generator form
  const [title, setTitle] = useState('Comprehensive Symptom Summary for Doctor Visit');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [primaryConcerns, setPrimaryConcerns] = useState(
    'Recurrent abdominal bloating, pelvic cramps, and fatigue during the luteal phase.'
  );
  const [questionsForClinician, setQuestionsForClinician] = useState(
    '1. Are the observed clusters consistent with hormonal fluctuation?\n2. Should we evaluate ferritin levels?\n3. Would physical therapy or diet adjustments be beneficial?'
  );

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports();
      setReports(data);
      if (data.length > 0 && !previewReport) {
        setPreviewReport(data[0]);
      }
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const newReport = await api.generateReport({
        title,
        date_range_start: startDate,
        date_range_end: endDate,
        primary_concerns: primaryConcerns,
        questions_for_clinician: questionsForClinician,
        selected_sections: [
          'patient_summary', 'symptom_timeline', 'trends', 'medications', 'cycles', 'questions', 'evidence_appendix'
        ]
      });
      setShowGenerateModal(false);
      setPreviewReport(newReport);
      fetchReports();
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteReport(id);
      if (previewReport?.id === id) {
        setPreviewReport(null);
      }
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-600" />
            Clinical Consultation Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Generate verifiable, non-diagnostic clinician reports with frequency metrics, medication timelines, and doctor questions.
          </p>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Generate New Report</span>
        </button>
      </div>

      {/* Main Grid: Saved Reports Sidebar & Live Preview */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Saved Reports List (1 col) */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Saved Reports ({reports.length})
          </h2>

          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-500">No consultation reports generated yet.</p>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  + Create Your First Report
                </button>
              </div>
            ) : (
              reports.map((r) => {
                const isSelected = previewReport?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setPreviewReport(r)}
                    className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                      isSelected
                        ? 'bg-brand-50/70 dark:bg-brand-950/60 border-brand-500 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {r.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(r.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-brand-600" />
                      <span>{r.date_range_start} to {r.date_range_end}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Report Viewer & Export Actions (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {previewReport ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Report Header Bar */}
              <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {previewReport.title}
                  </h3>
                  <div className="text-xs text-slate-500">
                    Patient: {previewReport.generated_content?.patient_name || 'User'} &bull; Period: {previewReport.date_range_start} to {previewReport.date_range_end}
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="flex items-center gap-2">
                  <a
                    href={api.getExportUrl(`/reports/${previewReport.id}/export/pdf`)}
                    download
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </a>
                  <a
                    href={api.getExportUrl(`/reports/${previewReport.id}/export/html`)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-semibold text-xs transition flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Printable HTML</span>
                  </a>
                </div>
              </div>

              {/* Report Body Preview */}
              <div className="p-6 sm:p-8 space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-h-[70vh] overflow-y-auto">
                {/* Mandatory Disclaimer Box */}
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-l-4 border-rose-500 text-rose-900 dark:text-rose-200 text-xs leading-relaxed">
                  <span className="font-bold">MANDATORY NOTICE: </span>
                  {previewReport.generated_content?.disclaimer ||
                    'This report is based solely on information entered by the user. It is intended to support communication with a healthcare professional and does not constitute a diagnosis or medical advice.'}
                </div>

                {/* 1. Patient Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
                    1. Patient-Reported Primary Concerns
                  </h4>
                  <p className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    {previewReport.generated_content?.primary_concerns || previewReport.primary_concerns}
                  </p>
                </div>

                {/* 2. Questions for Clinician */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
                    2. Questions for Healthcare Provider
                  </h4>
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 whitespace-pre-line">
                    {previewReport.generated_content?.questions_for_clinician || previewReport.questions_for_clinician}
                  </div>
                </div>

                {/* 3. Observed Metrics Overview */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
                    3. Observed Frequency & Severity Metrics
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Average Severity</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {previewReport.generated_content?.severity_metrics?.average !== undefined
                          ? `${previewReport.generated_content.severity_metrics.average}/10`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Peak Severity</span>
                      <span className="text-base font-bold text-rose-600">
                        {previewReport.generated_content?.severity_metrics?.max !== undefined
                          ? `${previewReport.generated_content.severity_metrics.max}/10`
                          : 'None'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Analyzed Records</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {previewReport.generated_content?.evidence_appendix?.total_records_analyzed || 0}
                      </span>
                    </div>
                  </div>

                  {/* Most frequent table */}
                  {previewReport.generated_content?.frequency_summary && (
                    <table className="w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-800 mt-2">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Symptom</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Recorded Days</th>
                          <th className="px-3 py-2">Frequency Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {previewReport.generated_content.frequency_summary.map((item: any, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 font-semibold text-slate-900 dark:text-white">{item.symptom_name}</td>
                            <td className="px-3 py-1.5 text-slate-500">{item.category}</td>
                            <td className="px-3 py-1.5">{item.distinct_days_count} days</td>
                            <td className="px-3 py-1.5 font-medium">{item.frequency_percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* 4. Limitations */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
                    4. Data Limitations & Evidence Disclosures
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-500">
                    {previewReport.generated_content?.limitations?.map((lim: string, idx: number) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
              Select a report from the left sidebar or create a new one to preview.
            </div>
          )}
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Configure Consultation Report
            </h3>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Report Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
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
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Concerns & Symptoms of Note
                </label>
                <textarea
                  rows={2}
                  value={primaryConcerns}
                  onChange={(e) => setPrimaryConcerns(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Questions for the Clinician
                </label>
                <textarea
                  rows={3}
                  value={questionsForClinician}
                  onChange={(e) => setQuestionsForClinician(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow"
                >
                  {generating ? 'Compiling Report...' : 'Build Consultation Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

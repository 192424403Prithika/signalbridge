import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Layers, CheckCircle2, AlertCircle, Clock, Calendar,
  Tag, ShieldAlert, ArrowRight, X, Plus, Info, Edit3, Trash2
} from 'lucide-react';
import { api } from '../api/client';
import { SymptomTaxonomy, ContextItem, ExtractedProposal } from '../types';
import { useAuth } from '../context/AuthContext';

export const JournalPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSafetyAlert } = useAuth();

  const [activeTab, setActiveTab] = useState<'structured' | 'natural'>('structured');
  const [taxonomy, setTaxonomy] = useState<SymptomTaxonomy[]>([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState<boolean>(true);

  // Structured Form States
  const [selectedSymptomId, setSelectedSymptomId] = useState<number | ''>('');
  const [customSymptomName, setCustomSymptomName] = useState<string>('');
  const [onsetDate, setOnsetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [onsetTime, setOnsetTime] = useState<string>('12:00');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(120);
  const [severity, setSeverity] = useState<number | ''>(5);
  const [bodyLocation, setBodyLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [cyclePhase, setCyclePhase] = useState<string>('follicular');
  const [privacyCategory, setPrivacyCategory] = useState<string>('standard');
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Natural Language AI States
  const [nlpText, setNlpText] = useState<string>(
    'I had strong cramps and bloating yesterday evening. It lasted about four hours and made it hard to sleep.'
  );
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [proposals, setProposals] = useState<ExtractedProposal[] | null>(null);
  const [extractionDisclaimer, setExtractionDisclaimer] = useState<string | null>(null);

  useEffect(() => {
    api.getTaxonomy()
      .then((data) => {
        setTaxonomy(data);
        if (data.length > 0) setSelectedSymptomId(data[0].id);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingTaxonomy(false));
  }, []);

  // Quick context toggles
  const handleToggleContext = (type: string, val: string) => {
    const existing = contextItems.find((c) => c.context_type === type && c.value === val);
    if (existing) {
      setContextItems(contextItems.filter((c) => !(c.context_type === type && c.value === val)));
    } else {
      setContextItems([...contextItems, { context_type: type, value: val }]);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  // Structured Submit
  const handleStructuredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const payload: any = {
        symptom_id: selectedSymptomId ? Number(selectedSymptomId) : undefined,
        symptom_name: !selectedSymptomId && customSymptomName ? customSymptomName : undefined,
        onset_date: onsetDate,
        onset_time: onsetTime || undefined,
        duration_minutes: durationMinutes !== '' ? Number(durationMinutes) : undefined,
        severity: severity !== '' ? Number(severity) : undefined,
        body_location: bodyLocation || undefined,
        notes: notes || undefined,
        cycle_phase: cyclePhase || undefined,
        privacy_category: privacyCategory,
        source_type: 'structured',
        ai_extracted: false,
        user_confirmed: true,
        contexts: contextItems,
        tag_names: tags,
      };

      const res = await api.createEntry(payload);

      if (res.safety_urgency_alert && res.safety_notice) {
        setSafetyAlert(res.safety_notice);
      }

      setStatusMessage({ type: 'success', text: `Symptom entry for ${res.symptom_name} logged successfully.` });
      // Reset some fields
      setNotes('');
      setTimeout(() => {
        navigate('/timeline');
      }, 1000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save symptom entry.' });
    } finally {
      setSaving(false);
    }
  };

  // Natural Language Extract
  const handleNlpExtract = async () => {
    if (!nlpText.trim()) return;
    setIsExtracting(true);
    setProposals(null);
    setStatusMessage(null);

    try {
      const res = await api.extractNlp(nlpText);
      setProposals(res.proposals);
      setExtractionDisclaimer(res.disclaimer);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Extraction failed.' });
    } finally {
      setIsExtracting(false);
    }
  };

  // Confirm single proposal from AI
  const handleConfirmProposal = async (prop: ExtractedProposal, index: number) => {
    try {
      const payload: any = {
        symptom_name: prop.symptom_name,
        onset_date: prop.onset_date,
        onset_time: prop.onset_time || '18:00',
        duration_minutes: prop.duration_minutes,
        severity: prop.severity !== undefined ? prop.severity : 5,
        body_location: prop.body_location,
        notes: `AI-extracted & confirmed. Impact: ${prop.impact || 'None noted'}. Snippet: "${prop.original_snippet}"`,
        source_type: 'natural_language',
        ai_extracted: true,
        user_confirmed: true,
        contexts: prop.context_factors || [],
        tag_names: prop.suggested_tags || [],
      };

      const res = await api.createEntry(payload);
      if (res.safety_urgency_alert && res.safety_notice) {
        setSafetyAlert(res.safety_notice);
      }

      // Remove from proposals list
      const updated = proposals ? [...proposals] : [];
      updated.splice(index, 1);
      setProposals(updated.length > 0 ? updated : null);

      setStatusMessage({
        type: 'success',
        text: `Confirmed and saved ${res.symptom_name} as a verified record.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to confirm entry.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-brand-600" />
          Symptom Journal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Record symptoms via structured forms or write in natural language with user-confirmed AI extraction.
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('structured')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'structured'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Structured Entry
        </button>
        <button
          onClick={() => setActiveTab('natural')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'natural'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Natural-Language Assistant
        </button>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-center gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* TAB 1: STRUCTURED FORM */}
      {activeTab === 'structured' && (
        <form onSubmit={handleStructuredSubmit} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Symptom Selection */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="journal-symptom-select">
                Symptom Selection
              </label>
              <select
                id="journal-symptom-select"
                value={selectedSymptomId}
                onChange={(e) => setSelectedSymptomId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
              >
                {taxonomy.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category}) {s.urgency_flag ? '⚠️ [Urgent Care Alert]' : ''}
                  </option>
                ))}
                <option value="">+ Add Custom Symptom</option>
              </select>
            </div>

            {selectedSymptomId === '' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Symptom Name
                </label>
                <input
                  type="text"
                  required
                  value={customSymptomName}
                  onChange={(e) => setCustomSymptomName(e.target.value)}
                  placeholder="e.g. Vulvodynia or Costochondritis"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            {/* Date & Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Onset Date
              </label>
              <input
                type="date"
                required
                value={onsetDate}
                onChange={(e) => setOnsetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Onset Time (Optional)
              </label>
              <input
                type="time"
                value={onsetTime}
                onChange={(e) => setOnsetTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Severity Rating (0 - 10) */}
            <div className="sm:col-span-2 space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Severity Rating: <span className="text-base text-brand-600 font-bold">{severity !== '' ? `${severity}/10` : 'Unrated'}</span>
                </label>
                <span className="text-xs text-slate-500">
                  {severity === 0 && '0 - None'}
                  {Number(severity) >= 1 && Number(severity) <= 3 && 'Mild (noticeable, does not stop tasks)'}
                  {Number(severity) >= 4 && Number(severity) <= 6 && 'Moderate (disrupts regular activities)'}
                  {Number(severity) >= 7 && Number(severity) <= 9 && 'Severe (disabling, rest needed)'}
                  {severity === 10 && '10 - Maximum imaginable'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={severity !== '' ? severity : 5}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full accent-brand-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>0 Mild</span>
                <span>5 Moderate</span>
                <span>10 Severe</span>
              </div>
            </div>

            {/* Duration (minutes) & Body Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration in Minutes (Optional)
              </label>
              <input
                type="number"
                min="5"
                step="15"
                placeholder="e.g. 120"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Body Location (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Lower pelvis, Left temple, Upper back"
                value={bodyLocation}
                onChange={(e) => setBodyLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Menstrual Cycle Phase Context */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Menstrual Cycle Phase (Optional)
              </label>
              <select
                value={cyclePhase}
                onChange={(e) => setCyclePhase(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
              >
                <option value="menstrual">Menstrual Phase (Bleeding days)</option>
                <option value="follicular">Follicular Phase</option>
                <option value="ovulation">Ovulation Phase (~Mid-cycle)</option>
                <option value="luteal">Luteal Phase (Pre-menstrual)</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>

            {/* Privacy Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Privacy Category
              </label>
              <select
                value={privacyCategory}
                onChange={(e) => setPrivacyCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
              >
                <option value="standard">Standard (Included in general reports)</option>
                <option value="sensitive">Sensitive (Explicit opt-in required)</option>
                <option value="confidential">Confidential (Excluded from exports)</option>
              </select>
            </div>
          </div>

          {/* Quick Context & Trigger Tags */}
          <div className="space-y-2 pt-2">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Context Factors & Triggers (Optional)
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { type: 'stress', val: 'high', label: '⚡ High Stress' },
                { type: 'sleep', val: 'poor', label: '🌙 Poor Sleep' },
                { type: 'caffeine', val: 'present', label: '☕ High Caffeine' },
                { type: 'alcohol', val: 'present', label: '🍷 Alcohol' },
                { type: 'exercise', val: 'intense', label: '🏃 Intense Workout' },
                { type: 'diet', val: 'dairy_or_sugar', label: '🥗 Dietary Trigger' },
                { type: 'travel', val: 'flight', label: '✈️ Travel / Jetlag' },
                { type: 'medication_change', val: 'new_dose', label: '💊 Medication Adjustment' },
              ].map((btn) => {
                const isSelected = contextItems.some((c) => c.context_type === btn.type && c.value === btn.val);
                return (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => handleToggleContext(btn.type, btn.val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      isSelected
                        ? 'bg-brand-100 dark:bg-brand-950/80 border-brand-500 text-brand-800 dark:text-brand-200'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tags
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Type tag and press Add"
                className="flex-1 max-w-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-semibold"
              >
                Add Tag
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs border border-brand-200 dark:border-brand-800"
                  >
                    #{t}
                    <button type="button" onClick={() => handleRemoveTag(t)}>
                      <X className="w-3 h-3 hover:text-brand-900" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Personal Notes & Observations
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What were you doing when it started? What relief methods did you try?"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow transition flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Logging Entry...' : 'Save Structured Entry'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: NATURAL LANGUAGE ASSISTANT WITH MANDATORY USER REVIEW */}
      {activeTab === 'natural' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">AI Extraction Policy: </span>
              Write freely in your own words. The system extracts proposed structured records for your review.
              <strong> AI entries are NEVER saved automatically.</strong> You must explicitly review, adjust, and confirm every item before it is recorded in your journal.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="nlp-description-textarea">
              Describe how you felt:
            </label>
            <textarea
              id="nlp-description-textarea"
              rows={4}
              value={nlpText}
              onChange={(e) => setNlpText(e.target.value)}
              placeholder="e.g. I had strong cramps and bloating yesterday evening. It lasted about four hours and made it hard to sleep."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNlpExtract}
              disabled={isExtracting || !nlpText.trim()}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow transition flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isExtracting ? 'Analyzing Text...' : 'Extract Proposed Fields'}</span>
            </button>
          </div>

          {/* AI Extracted Candidate Proposals */}
          {proposals && (
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-600" />
                  Proposed Records for Your Review ({proposals.length}):
                </h3>
                <span className="text-[11px] text-slate-500">
                  Review & Confirm below before saving
                </span>
              </div>

              <div className="space-y-4">
                {proposals.map((prop, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider block">
                          AI Candidate #{idx + 1}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {prop.symptom_name} ({prop.category})
                        </h4>
                      </div>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        {Math.round(prop.confidence_score * 100)}% Match Confidence
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px]">Estimated Date</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{prop.onset_date}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px]">Time of Day</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{prop.onset_time || 'Unspecified'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px]">Duration</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {prop.duration_minutes ? `~${prop.duration_minutes} mins` : 'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px]">Suggested Severity</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {prop.severity !== undefined && prop.severity !== null ? `${prop.severity}/10` : 'Not specified'}
                        </span>
                      </div>
                    </div>

                    {prop.impact && (
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Recorded Impact:</span> {prop.impact}
                      </div>
                    )}

                    {prop.suggested_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span className="text-slate-400 mr-1 text-[11px]">Tags:</span>
                        {prop.suggested_tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400 italic">
                        {prop.disclaimer}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...proposals];
                            updated.splice(idx, 1);
                            setProposals(updated.length > 0 ? updated : null);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmProposal(prop, idx)}
                          className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm & Save Entry
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

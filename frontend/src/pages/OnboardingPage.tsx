import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake, CheckCircle2, ArrowRight, ShieldCheck, Calendar, Pill, AlertTriangle, Sparkles } from 'lucide-react';
import { api } from '../api/client';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [preferredName, setPreferredName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [ageRange, setAgeRange] = useState('25-34');
  const [cycleTrackingEnabled, setCycleTrackingEnabled] = useState(true);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [currentMeds, setCurrentMeds] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        preferred_name: preferredName || undefined,
        pronouns: pronouns || undefined,
        age_range: ageRange,
        cycle_tracking_enabled: cycleTrackingEnabled,
        average_cycle_length: Number(cycleLength),
        typical_period_duration: Number(periodDuration),
        allergies: allergies || undefined,
        long_term_conditions: conditions || undefined,
        consent_acknowledged: true
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to save profile during onboarding', err);
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
        {/* Progress Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs">
              {step}/3
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {step === 1 && 'Identity & Preferences'}
              {step === 2 && 'Cycle & Rhythm Tracking'}
              {step === 3 && 'Clinical Context'}
            </span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Skip for now &rarr;
          </button>
        </div>

        {/* Step 1: Identity & Pronouns */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                How should we address you?
              </h2>
              <p className="text-xs text-slate-500">
                All fields are fully optional. You can update these anytime in Settings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Name
                </label>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="e.g. Maya"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pronouns
                </label>
                <input
                  type="text"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  placeholder="e.g. she/her, they/them"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Age Range (Optional)
              </label>
              <select
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
              >
                <option value="18-24">18–24</option>
                <option value="25-34">25–34</option>
                <option value="35-44">35–44</option>
                <option value="45-54">45–54</option>
                <option value="55+">55 and above</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Cycle Tracking */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Menstrual Cycle & Hormonal Context
              </h2>
              <p className="text-xs text-slate-500">
                Cycle tracking is optional. It helps highlight symptom clustering across cycle phases.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cycleTrackingEnabled}
                  onChange={(e) => setCycleTrackingEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 block">
                    Enable Menstrual Cycle Tracking
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Calculates approximate cycle phases (menstrual, follicular, ovulation, luteal)
                  </span>
                </div>
              </label>
            </div>

            {cycleTrackingEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Typical Cycle Length (Days)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={50}
                    value={cycleLength}
                    onChange={(e) => setCycleLength(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Standard average is 28 days</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Typical Period Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={periodDuration}
                    onChange={(e) => setPeriodDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Usually between 3 to 7 days</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Clinical Context */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Existing Conditions & Allergies
              </h2>
              <p className="text-xs text-slate-500">
                Helps populate consultation reports so doctors have your background readily available.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Known Allergies (Optional)
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, NSAIDs, seasonal pollen"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Long-Term or Prior Diagnosed Conditions (Optional)
              </label>
              <input
                type="text"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="e.g. Migraine, IBS, Hashimoto's thyroiditis"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow flex items-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Finish Setup & Open Dashboard'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

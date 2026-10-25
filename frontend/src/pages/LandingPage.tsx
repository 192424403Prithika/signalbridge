import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartHandshake, ShieldCheck, BarChart3, FileText, Sparkles,
  ArrowRight, CheckCircle2, Lock, Eye, AlertCircle, Calendar, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { loginDemo, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleDemoClick = async () => {
    try {
      await loginDemo();
      navigate('/dashboard');
    } catch (err) {
      console.error('Demo login failed', err);
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-8">
          {/* Evidence-First Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Evidence-First &bull; Strict Non-Diagnostic Principles</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Turning Women’s Health Experiences into{' '}
            <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-plum-600 dark:from-brand-400 dark:to-plum-300 bg-clip-text text-transparent">
              Evidence-Backed Insights
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Scattered notes, forgotten severity levels, and hurried doctor visits make chronic or episodic health concerns hard to communicate.
            SignalBridge organizes your personal symptom records into transparent timelines, detects data gaps, and creates consultation-ready clinical summaries.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <button
              onClick={handleDemoClick}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-sm border border-slate-300 dark:border-slate-700 shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4 text-brand-600" />
              <span>{isLoading ? 'Loading Demo...' : 'Explore 90-Day Demo'}</span>
            </button>
          </div>

          {/* Prominent Mandatory Non-Diagnostic Disclaimer */}
          <div className="max-w-3xl mx-auto p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm text-left flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Core Non-Diagnostic Disclosure: </span>
              SignalBridge is not a diagnostic tool and does not replace professional medical advice, diagnosis, or treatment recommendations. All analytics and observations are calculated directly from user entries with mathematical transparency.
            </div>
          </div>
        </div>
      </section>

      {/* The Problem & Solution Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm">
              Problem
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              The Consultation Communication Gap
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              When symptoms are episodic—like migraine, pelvic pain, bloating, or fatigue—appointments often feel rushed.
              Patients are forced to recall severity from memory, temporal context is lost, and clinicians receive incomplete snapshots rather than longitudinal patterns.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Difficulty demonstrating symptom frequency across cycle phases
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Subjective memory bias during 15-minute clinical visits
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Diagnostic delays averaging years for conditions like endometriosis or PCOS
              </li>
            </ul>
          </div>

          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-brand-200/80 dark:border-brand-900/60 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
              Solution
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Evidence-First Health Journaling
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              SignalBridge replaces guesswork with verifiable data. Log structured records or natural language notes,
              audit data completeness, observe mathematical frequencies, and generate doctor-ready consultation reports in one click.
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Traceable source entries behind every chart and trend
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Data Quality Center catches missing ratings, reversed dates & gaps
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Printable HTML and PDF reports structured for clinical consultation
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Core Product Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Engineered on Transparent Principles
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Unlike apps that use black-box AI to guess diagnoses, SignalBridge adheres to strict scientific integrity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">Evidence-Linked Insights</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every trend reveals contributing records, sample sizes, formulas, and data limitations. No hidden algorithms.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">Zero Diagnosis Policy</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We never state that you have or may have a disease. Your records empower you and your doctor to make medical decisions.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">User-Confirmed AI</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Natural language extraction only proposes candidates. You explicitly review, edit, or reject every entry before it saves.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">Privacy & Portability</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Export all your data in JSON or CSV at any time. Permanent deletion removes all records immediately.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-brand-600 to-plum-700 text-white shadow-xl space-y-6">
          <h2 className="text-3xl font-extrabold">Ready to take control of your health story?</h2>
          <p className="text-brand-100 max-w-xl mx-auto text-sm sm:text-base">
            Start logging in minutes with structured forms or natural language. Or jump right into our 90-day synthetic demo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white text-brand-900 font-bold text-sm shadow hover:bg-slate-100 transition"
            >
              Create Account
            </Link>
            <button
              onClick={handleDemoClick}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-brand-800/60 hover:bg-brand-800 text-white font-semibold text-sm border border-brand-400/30 transition"
            >
              Explore Demo Account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

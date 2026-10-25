import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartHandshake, ShieldCheck, BarChart3, FileText, Sparkles,
  ArrowRight, Lock, Eye, AlertCircle, Calendar, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { loginDemo, isLoading } = useAuth();
  const navigate = useNavigate();

  // Dynamic Animated Text states
  const rotatingPhrases = [
    'Evidence-Backed Insights',
    'Clear Clinical Timelines',
    'Doctor-Ready Summaries',
    'Empowered Conversations',
    'Actionable Health Patterns'
  ];
  const [phraseIndex, setPhraseIndex] = useState<number>(0);
  const [displayText, setDisplayText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [typingSpeed, setTypingSpeed] = useState<number>(90);

  // Typewriter effect loop
  useEffect(() => {
    const currentPhrase = rotatingPhrases[phraseIndex];
    let timer: any;

    if (!isDeleting && displayText === currentPhrase) {
      timer = setTimeout(() => {
        setIsDeleting(true);
        setTypingSpeed(45);
      }, 2400);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % rotatingPhrases.length);
      setTypingSpeed(90);
    } else {
      timer = setTimeout(() => {
        const nextText = isDeleting
          ? currentPhrase.substring(0, displayText.length - 1)
          : currentPhrase.substring(0, displayText.length + 1);
        setDisplayText(nextText);
      }, typingSpeed);
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex, typingSpeed]);

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
      {/* Hero Section with Mild Ambient Background Video */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16">
        {/* Mild Ambient Background Video Layer */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/videos/hero-poster.jpg"
            className="w-full h-full object-cover opacity-35 dark:opacity-20 filter blur-[0.5px] scale-105 transition-opacity duration-1000"
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>

          {/* Gentle translucent atmospheric gradient overlays ensuring crystal-clear text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 via-slate-50/70 to-slate-50 dark:from-slate-950/80 dark:via-slate-950/75 dark:to-slate-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-100/30 via-plum-100/10 to-transparent dark:from-brand-950/40 dark:via-plum-950/20 dark:to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-8 relative z-10">
          {/* Evidence-First Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-brand-950/80 backdrop-blur-sm border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold shadow-xs animate-float-gentle">
            <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>Evidence-First &bull; Strict Non-Diagnostic Principles</span>
          </div>

          {/* Animated Hero Headline with Typewriter Text */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15] min-h-[140px] sm:min-h-[160px] lg:min-h-[180px] flex flex-col justify-center">
            <span>Turning Women’s Health Experiences into</span>
            <span className="inline-block mt-2">
              <span className="bg-gradient-to-r from-brand-600 via-rose-500 to-plum-600 dark:from-brand-400 dark:via-rose-300 dark:to-plum-300 bg-clip-text text-transparent animate-gradient-flow font-black tracking-tight">
                {displayText || 'Evidence-Backed Insights'}
              </span>
              <span className="inline-block w-1 sm:w-1.5 h-8 sm:h-10 lg:h-12 ml-1.5 align-middle bg-brand-500 dark:bg-brand-400 animate-cursor-blink rounded-sm"></span>
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
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <button
              onClick={handleDemoClick}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-sm border border-slate-300 dark:border-slate-700 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>{isLoading ? 'Loading Demo...' : 'Explore 90-Day Demo'}</span>
            </button>
          </div>

          {/* Prominent Mandatory Non-Diagnostic Disclaimer */}
          <div className="max-w-3xl mx-auto p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/60 backdrop-blur-sm border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm text-left flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Core Non-Diagnostic Disclosure: </span>
              SignalBridge is not a diagnostic tool and does not replace professional medical advice, diagnosis, or treatment recommendations. All analytics and observations are calculated directly from user entries with mathematical transparency.
            </div>
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

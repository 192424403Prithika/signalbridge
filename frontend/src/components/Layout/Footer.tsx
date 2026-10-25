import React from 'react';
import { ShieldCheck, HeartHandshake, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Prominent Non-Diagnostic Disclaimer Box */}
        <div className="rounded-xl p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                Core Medical Non-Diagnostic Disclaimer:
              </span>
              <p>
                SignalBridge is strictly an evidence-first personal health journal and consultation preparation tool.
                It does <strong>not</strong> diagnose medical conditions, predict clinical outcomes, or prescribe treatments.
                All trends, averages, and correlations are transparent descriptive calculations derived solely from entries
                you record. Always consult a qualified physician or healthcare professional for medical evaluation and clinical diagnosis.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Meta & Navigation */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-brand-500" />
            <span>&copy; {new Date().getFullYear()} SignalBridge Health. Privacy-by-design & evidence-first.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link to="/settings" className="hover:text-slate-800 dark:hover:text-slate-200 transition">
              Privacy & Consent
            </Link>
            <Link to="/data-quality" className="hover:text-slate-800 dark:hover:text-slate-200 transition">
              Data Quality Rules
            </Link>
            <Link to="/reports" className="hover:text-slate-800 dark:hover:text-slate-200 transition">
              Clinician Reports
            </Link>
            <a
              href="https://www.womenshealth.gov"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline"
            >
              Health Resources <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

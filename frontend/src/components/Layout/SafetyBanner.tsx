import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SafetyBanner: React.FC = () => {
  const { safetyAlert, setSafetyAlert } = useAuth();

  if (!safetyAlert) return null;

  return (
    <div className="bg-rose-50 dark:bg-rose-950/70 border-b border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100 px-4 py-3 transition-all duration-200">
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold">Neutral Medical Safety Notice: </span>
            {safetyAlert}
          </div>
        </div>
        <button
          onClick={() => setSafetyAlert(null)}
          className="p-1 rounded-md text-rose-600 hover:text-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50"
          title="Dismiss notice"
          aria-label="Dismiss safety notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

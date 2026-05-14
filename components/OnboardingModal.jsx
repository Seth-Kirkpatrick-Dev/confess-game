'use client';

import { useState } from 'react';
import { completeOnboarding } from '@/lib/api';

const SCREENS = [
  {
    icon: '🤫',
    title: 'Real or Fake?',
    body: 'Every confession is written by a real person — but is it actually true? Vote on whether you believe it. After 48 hours, the truth is revealed.',
  },
  {
    icon: '🏆',
    title: 'Vote, Post, Earn',
    body: '+5 points for correct guesses. -2 for wrong ones. Posters earn up to +30 by fooling voters. Keep voting to climb tiers: Newbie → Skeptic → Truth Hunter → Lie Detector → Oracle.',
  },
  {
    icon: '📌',
    title: 'Daily Themes',
    body: 'Each day has a theme — Workplace, Family, Travel, and more. Post a confession matching the theme for a 1.5× bonus on your points at resolution.',
  },
];

export function OnboardingModal({ onDone }) {
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const screen = SCREENS[step];
  const isLast = step === SCREENS.length - 1;

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await completeOnboarding();
    } catch {
      // non-blocking — don't prevent user from continuing
    } finally {
      onDone();
    }
  };

  const handleSkip = async () => {
    setFinishing(true);
    try { await completeOnboarding(); } catch {}
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">

        {/* Progress dots */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex gap-1.5">
            {SCREENS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-violet-500' : i < step ? 'w-3 bg-violet-500/50' : 'w-3 bg-border'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            disabled={finishing}
            className="text-xs text-textSecondary hover:text-textPrimary transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center space-y-4">
          <div className="text-6xl">{screen.icon}</div>
          <h2 className="text-xl font-bold text-textPrimary">{screen.title}</h2>
          <p className="text-textSecondary text-sm leading-relaxed">{screen.body}</p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl border border-border text-textSecondary hover:text-textPrimary text-sm transition-colors"
            >
              ← Back
            </button>
          )}
          {isLast ? (
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {finishing ? 'Starting…' : 'Start Confessing →'}
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

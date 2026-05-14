'use client';

import { useState } from 'react';
import { reportConfession } from '@/lib/api';
import { MIN_VOTES_TO_REPORT } from '@/lib/config';

const REASONS = [
  { value: 'spam',           label: 'Spam' },
  { value: 'harassment',     label: 'Harassment' },
  { value: 'explicit',       label: 'Explicit content' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other',          label: 'Other' },
];

export function ReportModal({ confessionId, resolvedVotes, onClose, showToast }) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canReport = (resolvedVotes || 0) >= MIN_VOTES_TO_REPORT;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return;
    setSubmitting(true);
    try {
      await reportConfession(confessionId, reason, notes);
      showToast('Report submitted — thank you', 'success');
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to submit report', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4 border-b border-border flex items-center justify-between">
          <p className="font-semibold text-textPrimary text-sm">Report Confession</p>
          <button onClick={onClose} className="text-textSecondary hover:text-textPrimary transition-colors text-lg leading-none">✕</button>
        </div>

        {!canReport ? (
          <div className="px-5 py-8 text-center space-y-2">
            <p className="text-2xl">🔒</p>
            <p className="text-textPrimary text-sm font-medium">Reporting requires {MIN_VOTES_TO_REPORT}+ resolved votes</p>
            <p className="text-textSecondary text-xs">Keep voting on confessions to unlock this feature. This prevents abuse from new accounts.</p>
            <button onClick={onClose} className="mt-4 btn-ghost text-sm px-6">Got it</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-textSecondary font-medium uppercase tracking-wide">Reason</p>
              <div className="space-y-1.5">
                {REASONS.map(r => (
                  <label key={r.value} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-surfaceHover transition-colors">
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-violet-500"
                    />
                    <span className="text-sm text-textPrimary">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-textSecondary font-medium uppercase tracking-wide mb-1.5">Additional context <span className="normal-case">(optional)</span></p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Anything that helps the review…"
                className="input resize-none text-sm"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 btn-ghost text-sm">Cancel</button>
              <button
                type="submit"
                disabled={!reason || submitting}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

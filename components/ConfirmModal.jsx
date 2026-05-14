'use client';

export function ConfirmModal({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2 space-y-2">
          <h2 className="text-base font-semibold text-textPrimary">{title}</h2>
          {message && <p className="text-sm text-textSecondary">{message}</p>}
        </div>
        <div className="flex gap-2 px-6 py-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-textSecondary hover:text-textPrimary text-sm transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              danger
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                : 'bg-violet-600 text-white hover:bg-violet-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

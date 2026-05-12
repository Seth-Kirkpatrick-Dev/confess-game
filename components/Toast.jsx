'use client';

import { useEffect, useState } from 'react';

export function Toast({ message, type = 'success', onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  const colors = {
    success: 'bg-green-500/20 border-green-500/40 text-green-300',
    error: 'bg-red-500/20 border-red-500/40 text-red-300',
    info: 'bg-violet-500/20 border-violet-500/40 text-violet-300',
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl border text-sm font-medium shadow-xl transition-all duration-300 ${colors[type]} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {message}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const ToastContainer = () => (
    <div className="fixed bottom-6 left-0 right-0 flex flex-col items-center gap-2 z-50 pointer-events-none">
      {toasts.map((t, i) => (
        <div
          key={t.id}
          style={{ bottom: `${i * 56 + 24}px` }}
          className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
        >
          <Toast message={t.message} type={t.type} onDone={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );

  return { showToast, ToastContainer };
}

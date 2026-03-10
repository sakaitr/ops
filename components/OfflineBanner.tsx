"use client";

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-reload to refresh stale data
      if (wasOffline) {
        setTimeout(() => window.location.reload(), 1000);
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [wasOffline]);

  if (isOnline && !wasOffline) return null;

  if (!isOnline) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pb-safe pointer-events-none">
        <div className="max-w-md mx-auto bg-amber-950 border border-amber-800 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl pointer-events-auto">
          <span className="text-lg">📡</span>
          <div className="flex-1 min-w-0">
            <p className="text-amber-200 text-sm font-semibold">Çevrimdışı</p>
            <p className="text-amber-400 text-xs truncate">İnternet bağlantısı yok. Veriler güncellenmiyor.</p>
          </div>
        </div>
      </div>
    );
  }

  if (wasOffline && isOnline) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pointer-events-none">
        <div className="max-w-md mx-auto bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl pointer-events-auto">
          <span className="text-lg">✅</span>
          <div className="flex-1 min-w-0">
            <p className="text-emerald-200 text-sm font-semibold">Bağlantı Sağlandı</p>
            <p className="text-emerald-400 text-xs">Veriler yenileniyor…</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

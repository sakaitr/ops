"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="text-2xl font-bold text-white mb-2">Bağlantı Yok</h1>
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
          İnternet bağlantısı bulunamadı. Bağlantı sağlandığında uygulama otomatik olarak güncellenecek.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-white text-zinc-950 font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-zinc-100 transition-colors"
        >
          Yeniden Dene
        </button>
        <div className="mt-8 text-xs text-zinc-600">
          <span className="font-bold text-zinc-400">Aycan</span> – Operasyon Yönetim Sistemi
        </div>
      </div>
    </div>
  );
}

"use client";

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  submitted: "Gönderildi",
  returned: "İade",
  approved: "Onaylandı",
  open: "Açık",
  in_progress: "Devam Ediyor",
  waiting: "Beklemede",
  solved: "Çözüldü",
  closed: "Kapandı",
  todo: "Yapılacak",
  doing: "Yapılıyor",
  blocked: "Engellendi",
  done: "Tamamlandı",
  P1: "Kritik",
  P2: "Yüksek",
  P3: "Normal",
  high: "Yüksek",
  med: "Orta",
  low: "Düşük",
  personel: "Personel",
  yetkili: "Yetkili",
  yonetici: "Yönetici",
  admin: "Admin",
  // Vehicle statuses
  active: "Aktif",
  maintenance: "Bakımda",
  inactive: "Pasif",
  // Trip statuses
  planned: "Planlandı",
  departed: "Kalktı",
  arrived: "Ulaştı",
  delayed: "Gecikmeli",
  cancelled: "İptal",
  // Inspection results
  pass: "Geçti",
  fail: "Başarısız",
  conditional: "Koşullu",
  pending: "Bekliyor",
  // Entry control
  on_time: "Zamanında",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-800 text-zinc-300 border border-zinc-700",
  submitted: "bg-blue-950 text-blue-300 border border-blue-800",
  returned: "bg-orange-950 text-orange-300 border border-orange-800",
  approved: "bg-emerald-950 text-emerald-300 border border-emerald-800",
  open: "bg-blue-950 text-blue-300 border border-blue-800",
  in_progress: "bg-amber-950 text-amber-300 border border-amber-800",
  waiting: "bg-orange-950 text-orange-300 border border-orange-800",
  solved: "bg-emerald-950 text-emerald-300 border border-emerald-800",
  closed: "bg-zinc-800 text-zinc-400 border border-zinc-700",
  todo: "bg-zinc-800 text-zinc-300 border border-zinc-700",
  doing: "bg-blue-950 text-blue-300 border border-blue-800",
  blocked: "bg-red-950 text-red-300 border border-red-800",
  done: "bg-emerald-950 text-emerald-300 border border-emerald-800",
  P1: "bg-red-950 text-red-300 border border-red-800",
  P2: "bg-orange-950 text-orange-300 border border-orange-800",
  P3: "bg-zinc-800 text-zinc-300 border border-zinc-700",
  high: "bg-orange-950 text-orange-300 border border-orange-800",
  med: "bg-zinc-800 text-zinc-300 border border-zinc-700",
  low: "bg-zinc-900 text-zinc-500 border border-zinc-800",
  personel: "bg-zinc-800 text-zinc-300 border border-zinc-700",
  yetkili: "bg-blue-950 text-blue-300 border border-blue-800",
  yonetici: "bg-violet-950 text-violet-300 border border-violet-800",
  admin: "bg-red-950 text-red-300 border border-red-800",
  // Vehicle
  active: "bg-emerald-950 text-emerald-300 border border-emerald-800",
  maintenance: "bg-amber-950 text-amber-300 border border-amber-800",
  inactive: "bg-zinc-800 text-zinc-500 border border-zinc-700",
  // Trip
  planned: "bg-zinc-800 text-zinc-300 border border-zinc-700",
  departed: "bg-blue-950 text-blue-300 border border-blue-800",
  arrived: "bg-emerald-950 text-emerald-300 border border-emerald-800",
  delayed: "bg-amber-950 text-amber-300 border border-amber-800",
  cancelled: "bg-red-950 text-red-400 border border-red-900",
  // Inspection
  pass: "bg-emerald-950 text-emerald-300 border border-emerald-800",
  fail: "bg-red-950 text-red-300 border border-red-800",
  conditional: "bg-amber-950 text-amber-300 border border-amber-800",
  pending: "bg-zinc-800 text-zinc-400 border border-zinc-700",
  // Entry control
  on_time: "bg-emerald-950 text-emerald-300 border border-emerald-800",
};

export default function Badge({
  status,
  children,
  showLabel,
}: {
  status?: string;
  children?: React.ReactNode;
  showLabel?: boolean;
}) {
  const style = status
    ? STATUS_STYLES[status] || "bg-zinc-800 text-zinc-300 border border-zinc-700"
    : "bg-zinc-800 text-zinc-300 border border-zinc-700";

  const label = showLabel && status ? STATUS_LABELS[status] || status : children;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${style}`}>
      {label}
    </span>
  );
}

export function statusLabel(code: string) {
  return STATUS_LABELS[code] || code;
}

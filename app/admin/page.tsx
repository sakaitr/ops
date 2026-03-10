"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok || d.data?.role !== "admin") { router.replace("/"); return; }
      setUser(d.data);
    }).catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/users").then(r => r.json()),
      fetch("/api/companies").then(r => r.json()),
      fetch("/api/vehicles").then(r => r.json()),
      fetch("/api/departments").then(r => r.json()),
    ]).then(([u, c, v, d]) => {
      setStats({
        users: u.ok ? u.data.length : 0,
        activeUsers: u.ok ? u.data.filter((x: any) => x.is_active).length : 0,
        companies: c.ok ? c.data.length : 0,
        vehicles: v.ok ? v.data.length : 0,
        departments: d.ok ? d.data.length : 0,
      });
    });
  }, [user]);

  if (!user) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><p className="text-zinc-500">Yükleniyor...</p></div>;

  const cards = [
    {
      href: "/admin/kullanicilar",
      icon: "👤",
      title: "Kullanıcılar",
      desc: "Kullanıcı ekleme, rol/departman değiştirme, sayfa ve firma izinleri",
      stat: stats ? `${stats.activeUsers} aktif / ${stats.users} toplam` : "...",
      color: "border-blue-800/50 hover:border-blue-700",
    },
    {
      href: "/admin/departmanlar",
      icon: "🏗",
      title: "Departmanlar",
      desc: "Departman ekleme, düzenleme ve silme",
      stat: stats ? `${stats.departments} departman` : "...",
      color: "border-purple-800/50 hover:border-purple-700",
    },
    {
      href: "/admin/firmalar",
      icon: "🏢",
      title: "Firmalar",
      desc: "Firma ekleme, düzenleme ve silme",
      stat: stats ? `${stats.companies} firma` : "...",
      color: "border-emerald-800/50 hover:border-emerald-700",
    },
    {
      href: "/admin/araclar",
      icon: "🚗",
      title: "Araçlar",
      desc: "Servis araçları silme (düzenleme için Araçlar sayfası)",
      stat: stats ? `${stats.vehicles} araç` : "...",
      color: "border-amber-800/50 hover:border-amber-700",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav user={user} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Sistem Yönetimi</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Tüm sistem bileşenlerini buradan yönetebilirsiniz</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map(card => (
            <Link
              key={card.href}
              href={card.href}
              className={`bg-zinc-900 border ${card.color} rounded-2xl p-6 flex flex-col gap-3 transition-colors group`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{card.icon}</span>
                <div>
                  <p className="text-white font-semibold group-hover:text-white">{card.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{card.stat}</p>
                </div>
              </div>
              <p className="text-sm text-zinc-500">{card.desc}</p>
              <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">Yönet →</span>
            </Link>
          ))}
        </div>

        {/* Quick info + backup */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Oturum Bilgisi</p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div><span className="text-zinc-500">Kullanıcı: </span><span className="text-white">{user.full_name}</span></div>
            <div><span className="text-zinc-500">Rol: </span><span className="text-white">Admin</span></div>
            <div><span className="text-zinc-500">Kullanıcı adı: </span><span className="text-zinc-300 font-mono">{user.username}</span></div>
            <div className="ml-auto">
              <a
                href="/api/admin/backup"
                download
                className="inline-flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                ↓ Veritabanı Yedeği Al
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

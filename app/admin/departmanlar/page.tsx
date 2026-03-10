"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

export default function DepartmanlarPage() {
  const [user, setUser] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok || d.data?.role !== "admin") { router.replace("/"); return; }
      setUser(d.data);
    }).catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/departments");
      const d = await r.json();
      if (d.ok) setDepartments(d.data);
    } finally { setLoading(false); }
  }

  async function addDept() {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/departments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName }),
      });
      const d = await r.json();
      if (d.ok) { setShowAdd(false); setAddName(""); load(); }
      else alert(d.error);
    } finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!editId || !editName.trim()) return;
    setSavingEdit(true);
    try {
      const r = await fetch(`/api/departments/${editId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const d = await r.json();
      if (d.ok) { setEditId(null); load(); }
      else alert(d.error);
    } finally { setSavingEdit(false); }
  }

  async function deleteDept(id: string) {
    if (!confirm("Bu departmanı silmek istediğinize emin misiniz?")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.ok) load();
      else alert(d.error);
    } finally { setDeletingId(null); }
  }

  if (!user) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><p className="text-zinc-500">Yükleniyor...</p></div>;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav user={user} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <a href="/admin" className="text-zinc-500 hover:text-white text-sm transition-colors">Yönetim</a>
              <span className="text-zinc-700">/</span>
              <span className="text-white text-sm">Departmanlar</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Departmanlar</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{departments.length} departman kayıtlı</p>
          </div>
          <button onClick={() => { setShowAdd(true); setAddName(""); }}
            className="bg-white text-zinc-950 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors whitespace-nowrap">
            + Departman Ekle
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-zinc-600 text-sm">Yükleniyor...</div>
        ) : departments.length === 0 ? (
          <div className="py-16 text-center text-zinc-600 text-sm">Henüz departman eklenmedi</div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-5 py-3">Departman Adı</th>
                  <th className="text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Kullanıcı</th>
                  <th className="px-4 py-3 w-36"></th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20">
                    <td className="px-5 py-3.5">
                      {editId === dept.id ? (
                        <div className="flex gap-2">
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditId(null); }}
                            autoFocus
                            className="flex-1 bg-zinc-800 border border-zinc-600 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-zinc-400"
                          />
                          <button onClick={saveEdit} disabled={savingEdit || !editName.trim()}
                            className="bg-white text-zinc-950 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors">
                            {savingEdit ? "..." : "Kaydet"}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-zinc-500 hover:text-white px-2 transition-colors">✕</button>
                        </div>
                      ) : (
                        <span className="text-white font-medium">{dept.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 rounded-full">{dept.user_count} kişi</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {editId !== dept.id && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setEditId(dept.id); setEditName(dept.name); }}
                            className="text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2.5 py-1 rounded-lg transition-colors">
                            Düzenle
                          </button>
                          <button onClick={() => deleteDept(dept.id)} disabled={deletingId === dept.id}
                            className="text-xs text-zinc-600 hover:text-red-400 border border-zinc-700 hover:border-red-800 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40">
                            {deletingId === dept.id ? "..." : "Sil"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Departman Ekle</h2>
              <button onClick={() => setShowAdd(false)} className="text-zinc-600 hover:text-white text-xl">×</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Departman Adı *</label>
              <input
                value={addName} onChange={e => setAddName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addDept()}
                placeholder="Örn: Muhasebe" autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-zinc-800 text-zinc-300 text-sm font-medium py-2.5 rounded-lg hover:bg-zinc-700 transition-colors">İptal</button>
              <button onClick={addDept} disabled={saving || !addName.trim()}
                className="flex-1 bg-white text-zinc-950 text-sm font-semibold py-2.5 rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors">
                {saving ? "Kaydediliyor..." : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

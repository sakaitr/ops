"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Badge from "@/components/Badge";

const STATUS_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "draft", label: "Taslak" },
  { value: "submitted", label: "Onay Bekliyor" },
  { value: "returned", label: "İade" },
  { value: "approved", label: "Onaylandı" },
];

const DAYS_TR = ["Paz", "Pzt", "Sal", "Çrş", "Per", "Cum", "Cmt"];
const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function todayStr() { return new Date().toISOString().split("T")[0]; }
function nDaysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function formatDate(s: string) {
  const d = new Date(s + "T00:00:00");
  return `${DAYS_TR[d.getDay()]} ${d.getDate()} ${MONTHS_TR[d.getMonth()]}`;
}
function isLate(w: any) {
  return w.submitted_at && new Date(w.submitted_at).getHours() >= 22;
}

function buildEvaluation(data: any) {
  const { totalUsers, submitted, approved, returned, notStarted, issueCount, lateCount } = data;
  const sentTotal = submitted + approved + returned;
  const parts: string[] = [];
  if (notStarted > 0)  parts.push(`${notStarted} kişi henüz göndermedi`);
  if (returned > 0)    parts.push(`${returned} günlük iade edildi`);
  if (issueCount > 0)  parts.push(`${issueCount} sorun bildirimi var`);
  if (lateCount > 0)   parts.push(`${lateCount} geç gönderim`);
  if (parts.length === 0) {
    if (totalUsers === 0) return "Bugün kayıt yok.";
    return `Bugün ${sentTotal}/${totalUsers} günlük sorunsuz tamamlandı — genel durum iyi.`;
  }
  return `Bugün ${sentTotal}/${totalUsers} günlük gönderildi; ${parts.join(", ")}.`;
}

export default function GunlukListPage() {
  const [user, setUser] = useState<any>(null);
  const [worklogs, setWorklogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(nDaysAgo(1));
  const [dateTo, setDateTo] = useState(todayStr());
  const [statusFilter, setStatusFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showNotSubmitted, setShowNotSubmitted] = useState(false);

  const today = todayStr();
  const isManager = user?.role === "yonetici" || user?.role === "admin";
  const isAtLeastYetkili = user && ["yetkili", "yonetici", "admin"].includes(user.role);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.ok) setUser(d.data); }).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set("status", statusFilter);
      if (dateFrom)     p.set("startDate", dateFrom);
      if (dateTo)       p.set("endDate", dateTo);
      if (userFilter)   p.set("userId", userFilter);
      const res = await fetch(`/api/worklogs?${p}`);
      const d = await res.json();
      if (d.ok) setWorklogs(d.data);
    } finally { setLoading(false); }
  }, [user, dateFrom, dateTo, statusFilter, userFilter]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/worklogs/today-summary");
      const d = await res.json();
      if (d.ok) setSummary(d.data);
    } finally { setSummaryLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (isManager) loadSummary(); }, [isManager, loadSummary]);

  async function deleteWorklog(w: any) {
    if (!confirm(`${w.user_name ? `"${w.user_name}" kullanıcısının ` : ""}${formatDate(w.work_date)} günlüğü silinsin mi?`)) return;
    setDeleting(w.id);
    try {
      const qs = (isAtLeastYetkili && w.user_id !== user.id) ? `?userId=${w.user_id}` : "";
      const res = await fetch(`/api/worklogs/${w.work_date}${qs}`, { method: "DELETE" });
      const d = await res.json();
      if (d.ok) {
        setWorklogs(prev => prev.filter(x => x.id !== w.id));
        if (isManager) loadSummary();
      } else { alert(d.error || "Silme başarısız"); }
    } finally { setDeleting(null); }
  }

  async function bulkApprove() {
    const pending = worklogs.filter(w => w.status_code === "submitted");
    if (pending.length === 0) return;
    if (!confirm(`${pending.length} günlük onaylansın mı?`)) return;
    setBulkApproving(true);
    try {
      await Promise.all(pending.map(w =>
        fetch(`/api/worklogs/${w.work_date}?userId=${w.user_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status_code: "approved" }),
        })
      ));
      await loadData();
      if (isManager) loadSummary();
    } finally { setBulkApproving(false); }
  }

  function resetFilters() {
    setDateFrom(nDaysAgo(1));
    setDateTo(todayStr());
    setStatusFilter("");
    setUserFilter("");
  }

  const todayWorklog = worklogs.find(w => w.work_date === today && w.user_id === user?.id);
  const pendingCount = worklogs.filter(w => w.status_code === "submitted").length;

  const dropdownUsers: { id: string; full_name: string }[] = summary?.allUsers
    ?? Array.from(
      new Map(worklogs.map(w => [w.user_id, { id: w.user_id, full_name: w.user_name }])).values()
    );

  const statusBadgeColor = summary
    ? (summary.notStarted === 0 && summary.returned === 0
        ? "bg-emerald-950 border-emerald-800 text-emerald-300"
        : (summary.notStarted > 2 || summary.returned > 1)
          ? "bg-red-950 border-red-800 text-red-300"
          : "bg-amber-950 border-amber-800 text-amber-300")
    : "";
  const statusBadgeLabel = summary
    ? (summary.notStarted === 0 && summary.returned === 0 ? "✓ İyi" : summary.notStarted > 2 ? "⚠ Dikkat" : "~ Normal")
    : "";

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav user={user} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Günlük İşler</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{worklogs.length} kayıt</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isManager && pendingCount > 0 && (
              <button
                onClick={bulkApprove}
                disabled={bulkApproving}
                className="bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-sm font-semibold px-4 py-2 rounded-lg border border-emerald-800 transition-colors disabled:opacity-50"
              >
                {bulkApproving ? "Onaylanıyor..." : `Tümünü Onayla (${pendingCount})`}
              </button>
            )}
            <Link
              href={`/gunluk/${today}`}
              className="bg-white text-zinc-950 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              {todayWorklog ? "Bugünü Düzenle" : "Bugün Oluştur"}
            </Link>
          </div>
        </div>

        {/* Today Summary — manager only */}
        {isManager && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
            {summaryLoading || !summary ? (
              <div className="text-zinc-600 text-sm">Bugünün özeti yükleniyor...</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Bugün &mdash;{" "}
                    {new Date(summary.date + "T00:00:00").toLocaleDateString("tr-TR", {
                      weekday: "long", day: "numeric", month: "long",
                    })}
                  </p>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadgeColor}`}>
                    {statusBadgeLabel}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                  {[
                    { label: "Gönderilen", value: summary.submitted + summary.approved + summary.returned, suffix: `/${summary.totalUsers}`, color: "text-blue-300" },
                    { label: "Onaylanan",  value: summary.approved,    color: "text-emerald-300" },
                    { label: "Bekliyor",   value: summary.submitted,   color: "text-zinc-300" },
                    { label: "Sorun",  value: summary.issueCount, color: summary.issueCount > 0 ? "text-amber-300" : "text-zinc-600" },
                    { label: "Geç",    value: summary.lateCount,  color: summary.lateCount  > 0 ? "text-orange-300" : "text-zinc-600" },
                  ].map((s: any) => (
                    <div key={s.label} className="bg-zinc-800/60 rounded-lg px-3 py-2.5 text-center">
                      <p className={`text-xl font-bold tabular-nums ${s.color}`}>
                        {s.value}
                        {s.suffix && <span className="text-zinc-600 text-sm font-normal">{s.suffix}</span>}
                      </p>
                      <p className="text-zinc-600 text-xs mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <p className="text-zinc-300 text-sm italic mb-3">
                  &ldquo;{buildEvaluation(summary)}&rdquo;
                </p>

                {summary.notSubmittedUsers?.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowNotSubmitted(v => !v)}
                      className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                      {summary.notSubmittedUsers.length} kişi henüz göndermedi
                      <span className="text-zinc-700">{showNotSubmitted ? "▲" : "▼"}</span>
                    </button>
                    {showNotSubmitted && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {summary.notSubmittedUsers.map((u: any) => (
                          <span key={u.id} className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2.5 py-1 rounded-full">
                            {u.full_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Başlangıç</label>
              <input
                type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Bitiş</label>
              <input
                type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 [color-scheme:dark]"
              />
            </div>
            {isAtLeastYetkili && dropdownUsers.length > 0 && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Kişi</label>
                <select
                  value={userFilter} onChange={e => setUserFilter(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500"
                >
                  <option value="">Tümü</option>
                  {dropdownUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Durum</label>
              <div className="flex gap-1 flex-wrap">
                {STATUS_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setStatusFilter(o.value)}
                    className={`text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                      statusFilter === o.value
                        ? "bg-white text-zinc-950"
                        : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={resetFilters}
              className="text-xs text-zinc-600 hover:text-white transition-colors pb-2"
            >
              Sıfırla
            </button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-600 text-sm">Yükleniyor...</div>
        ) : worklogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-zinc-600 text-sm mb-4">Bu aralıkta kayıt bulunamadı</p>
            <Link
              href={`/gunluk/${today}`}
              className="bg-white text-zinc-950 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Bugün Oluştur
            </Link>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {worklogs.map((w, i) => {
              const canDelete = isManager || (w.user_id === user?.id && w.status_code === "draft");
              const detailHref = `/gunluk/${w.work_date}${(isAtLeastYetkili && w.user_id !== user?.id) ? `?userId=${w.user_id}` : ""}`;
              return (
                <div
                  key={w.id}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-800/40 transition-colors ${
                    i < worklogs.length - 1 ? "border-b border-zinc-800/50" : ""
                  }`}
                >
                  <div className="w-20 flex-shrink-0">
                    <p className={`text-sm font-semibold ${w.work_date === today ? "text-white" : "text-zinc-300"}`}>
                      {formatDate(w.work_date)}
                    </p>
                    {w.work_date === today && <p className="text-xs text-blue-400 font-medium">Bugün</p>}
                  </div>

                  {isAtLeastYetkili && (
                    <div className="w-28 flex-shrink-0 hidden sm:block">
                      <p className="text-zinc-400 text-xs truncate">{w.user_name}</p>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {!w.summary?.trim() && (w.status_code === "submitted" || w.status_code === "approved") ? (
                      <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">✓ Sorunsuz</span>
                    ) : w.summary?.trim() ? (
                      <p className="text-zinc-300 text-sm truncate">{w.summary}</p>
                    ) : (
                      <p className="text-zinc-600 text-sm italic">Açıklama yok</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isLate(w) && (
                      <span className="hidden sm:inline text-xs font-semibold text-amber-400 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded">
                        Geç
                      </span>
                    )}
                    <Badge status={w.status_code} showLabel />
                    <Link
                      href={detailHref}
                      className="text-zinc-600 hover:text-white text-sm transition-colors px-1"
                      title="Görüntüle"
                    >
                      →
                    </Link>
                    {canDelete && (
                      <button
                        onClick={() => deleteWorklog(w)}
                        disabled={deleting === w.id}
                        className="text-zinc-700 hover:text-red-400 text-sm transition-colors disabled:opacity-40 px-1"
                        title="Sil"
                      >
                        {deleting === w.id ? "···" : "✕"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

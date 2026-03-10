"use client";

export default function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "blue" | "red" | "green" | "amber";
}) {
  const accentColor = {
    blue: "text-blue-400",
    red: "text-red-400",
    green: "text-emerald-400",
    amber: "text-amber-400",
  }[accent || "blue"];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">{title}</p>
      <p className={`text-3xl font-bold ${accentColor}`}>{value}</p>
      {subtitle && <p className="text-xs text-zinc-600 mt-2">{subtitle}</p>}
    </div>
  );
}

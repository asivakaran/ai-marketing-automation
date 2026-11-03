"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

const COLORS = ["#0f172a", "#0d9488", "#d97706", "#64748b", "#dc2626", "#65a30d", "#7c3aed", "#db2777"];

export function LeadsBarChart({ data }: { data: Array<{ label: string; leads: number; won: number }> }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
          <Tooltip cursor={{ fill: "rgba(15,23,42,0.04)" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="leads" name="New leads" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="won" name="Jobs won" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourceDonut({ data }: { data: Array<{ source: string; count: number }> }) {
  const labelMap: Record<string, string> = {
    WEBSITE_CHAT: "Website chat",
    WEBSITE: "Website",
    GOOGLE: "Google",
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    SMS: "SMS",
    REFERRAL: "Referral",
    MANUAL: "Manual",
  };
  const shaped = data.map((d, i) => ({ ...d, label: labelMap[d.source] ?? d.source, fill: COLORS[i % COLORS.length] }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={shaped} dataKey="count" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={0}>
            {shaped.map((entry) => (
              <Cell key={entry.source} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

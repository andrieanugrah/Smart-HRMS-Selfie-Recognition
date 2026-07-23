'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CHART_DATA = [
  { day: 'Sen', hadir: 38, telat: 4 },
  { day: 'Sel', hadir: 42, telat: 2 },
  { day: 'Rab', hadir: 40, telat: 5 },
  { day: 'Kam', hadir: 44, telat: 1 },
  { day: 'Jum', hadir: 39, telat: 3 },
];

export function AttendanceTrendChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={CHART_DATA}>
        <defs>
          <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.45} />
            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorTelat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            fontSize: 12,
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)',
          }}
        />
        <Area type="monotone" dataKey="hadir" stroke="#0d9488" fill="url(#colorHadir)" strokeWidth={2.5} />
        <Area type="monotone" dataKey="telat" stroke="#f59e0b" fill="url(#colorTelat)" strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

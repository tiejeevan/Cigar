'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { InventoryItem } from '@/lib/db';

interface OverviewChartProps {
  items: InventoryItem[];
}

export function OverviewChart({ items }: OverviewChartProps) {
  const data = useMemo(() => {
    const brandCounts: Record<string, number> = {};
    
    items.forEach(item => {
      brandCounts[item.brand] = (brandCounts[item.brand] || 0) + item.quantity;
    });

    return Object.entries(brandCounts)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#888] text-[10px] uppercase tracking-widest">
        No data available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#888', fontSize: 10 }}
            tickFormatter={(value) => value.toString().toUpperCase()}
            dy={10}
            interval={0}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#888', fontSize: 10 }}
          />
          <Tooltip 
            cursor={{ fill: '#1A1C23' }}
            contentStyle={{ backgroundColor: '#0D0F13', border: '1px solid #2A2A2A', borderRadius: 0 }}
            itemStyle={{ color: '#D4AF37', fontSize: 12, fontWeight: 'bold' }}
            labelStyle={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}
          />
          <Bar dataKey="value" fill="#D4AF37" radius={[2, 2, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

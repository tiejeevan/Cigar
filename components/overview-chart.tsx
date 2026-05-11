'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { InventoryItem } from '@/lib/db';

interface OverviewChartProps {
  items: InventoryItem[];
}

export function OverviewChart({ items }: OverviewChartProps) {
  if (!items || items.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-[#888] bg-[#14161C] border border-[#2A2A2A] text-[10px] uppercase tracking-widest">
        No analytical data
      </div>
    );
  }

  // Group by brand
  const chartData = items.reduce((acc, item) => {
    const existing = acc.find(d => d.name === item.brand);
    if (existing) {
      existing.stock += item.quantity;
    } else {
      acc.push({ name: item.brand, stock: item.quantity });
    }
    return acc;
  }, [] as { name: string; stock: number }[]).sort((a, b) => b.stock - a.stock);

  return (
    <div className="h-64 w-full p-6 bg-[#14161C] border border-[#2A2A2A]">
      <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] mb-6 font-bold">Stock Distribution</h3>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={chartData}>
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
            hide
          />
          <Tooltip 
            cursor={{ fill: '#1F2127' }}
            contentStyle={{ backgroundColor: '#0D0F13', border: '1px solid #2A2A2A', borderRadius: '0', color: '#E5E1DA', fontSize: '12px' }}
            itemStyle={{ color: '#D4AF37' }}
          />
          <Bar dataKey="stock" radius={[0, 0, 0, 0]}>
            {
              chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#D4AF37' : '#888'} fillOpacity={index === 0 ? 1 : 0.6} />
              ))
            }
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

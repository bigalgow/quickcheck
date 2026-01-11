// src/components/ProjectionCharts.jsx
import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../utils/money';

const formatYAxis = (value) => {
  if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `£${(value / 1000).toFixed(0)}K`;
  return formatCurrency(value);
};

const tooltipFormatter = (value) => formatCurrency(value);

export default function ProjectionCharts({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-slate-600">No chart data available</div>;
  }

  // Prepare chart data
  const chartData = data.map((row) => ({
    age: row.age,
    DC: Math.max(0, row.closingDC), // Don't show negative on chart
    ISA: Math.max(0, row.closingISA),
    Taxable: Math.max(0, row.closingTaxable),
    TotalNominal: row.totalNominal,
    TotalReal: row.totalReal,
    Income: row.totalTaxableIncome - row.tax + row.isaGrowth + Math.max(0, row.lifeEvents),
    Spend: row.annualSpend + Math.abs(Math.min(0, row.lifeEvents)),
    NetFlow: row.netFlow,
  }));

  return (
    <div className="space-y-6">
      {/* Asset Evolution Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 print-avoid-break">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Asset Evolution (25 Years)</h2>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="age" label={{ value: 'Age', position: 'insideBottom', offset: -5 }} />
            <YAxis tickFormatter={formatYAxis} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <Line
              type="monotone"
              dataKey="DC"
              stroke="#3b82f6"
              strokeWidth={2}
              name="DC Pot"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ISA"
              stroke="#10b981"
              strokeWidth={2}
              name="ISA Savings"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Taxable"
              stroke="#f97316"
              strokeWidth={2}
              name="Taxable Savings"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="TotalNominal"
              stroke="#000000"
              strokeWidth={3}
              name="Total (Nominal)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="TotalReal"
              stroke="#6b7280"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Total (Real)"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Income vs Expenditure Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 print-avoid-break">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Income vs Expenditure (25 Years)</h2>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="age" label={{ value: 'Age', position: 'insideBottom', offset: -5 }} />
            <YAxis tickFormatter={formatYAxis} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <Bar dataKey="Income" fill="#10b981" name="Total Income (after tax)" />
            <Bar dataKey="Spend" fill="#ef4444" name="Annual Spend" />
            <Bar dataKey="NetFlow" fill="#3b82f6" name="Net Flow" />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

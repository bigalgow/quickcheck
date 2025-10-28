// src/components/ProjectionTable.jsx
import React from 'react';
import { formatCurrency } from '../utils/money';

function exportToCSV(data) {
  const headers = [
    'Age',
    'Opening DC',
    'Opening ISA',
    'Opening Taxable',
    'DC Drawdown',
    'ISA Drawdown',
    'Taxable Drawdown',
    'ISA Investments',
    'DB Income',
    'Annuity Income',
    'State Pension',
    'Other Income',
    'DC Growth',
    'ISA Growth',
    'Taxable Growth',
    'Life Events',
    'Annual Spend',
    'Total Taxable Income',
    'Tax',
    'Net Flow',
    'Closing DC',
    'Closing ISA',
    'Closing Taxable',
    'Total Assets (Nominal)',
    'Total Assets (Real)',
  ];

  const rows = data.map((row) => [
    row.age,
    row.openingDC.toFixed(0),
    row.openingISA.toFixed(0),
    row.openingTaxable.toFixed(0),
    row.dcDrawdown.toFixed(0),
    row.isaDrawdown.toFixed(0),
    row.taxableDrawdown.toFixed(0),
    row.isaInvestments.toFixed(0),
    row.dbIncome.toFixed(0),
    row.annuityIncome.toFixed(0),
    row.statePension.toFixed(0),
    row.otherIncome.toFixed(0),
    row.dcGrowth.toFixed(0),
    row.isaGrowth.toFixed(0),
    row.taxableGrowth.toFixed(0),
    row.lifeEvents.toFixed(0),
    row.annualSpend.toFixed(0),
    row.totalTaxableIncome.toFixed(0),
    row.tax.toFixed(0),
    row.netFlow.toFixed(0),
    row.closingDC.toFixed(0),
    row.closingISA.toFixed(0),
    row.closingTaxable.toFixed(0),
    row.totalNominal.toFixed(0),
    row.totalReal.toFixed(0),
  ]);

  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `retirement-projection-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function ProjectionTable({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-slate-600">No projection data available</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-800">25-Year Projection Table</h2>
        <button
          onClick={() => exportToCSV(data)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
        >
          📥 Export to CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="border px-2 py-2 text-left font-semibold">Age</th>
              <th className="border px-2 py-2 text-right font-semibold">Opening DC</th>
              <th className="border px-2 py-2 text-right font-semibold">Opening ISA</th>
              <th className="border px-2 py-2 text-right font-semibold">Opening Taxable</th>
              <th className="border px-2 py-2 text-right font-semibold">DC Draw</th>
              <th className="border px-2 py-2 text-right font-semibold">ISA Draw</th>
              <th className="border px-2 py-2 text-right font-semibold">Taxable Draw</th>
              <th className="border px-2 py-2 text-right font-semibold">ISA Invest</th>
              <th className="border px-2 py-2 text-right font-semibold">DB Income</th>
              <th className="border px-2 py-2 text-right font-semibold">Annuity</th>
              <th className="border px-2 py-2 text-right font-semibold">State Pension</th>
              <th className="border px-2 py-2 text-right font-semibold">Other</th>
              <th className="border px-2 py-2 text-right font-semibold">DC Growth</th>
              <th className="border px-2 py-2 text-right font-semibold">ISA Growth</th>
              <th className="border px-2 py-2 text-right font-semibold">Taxable Growth</th>
              <th className="border px-2 py-2 text-right font-semibold">Life Events</th>
              <th className="border px-2 py-2 text-right font-semibold">Spend</th>
              <th className="border px-2 py-2 text-right font-semibold">Total Taxable Income</th>
              <th className="border px-2 py-2 text-right font-semibold">Tax</th>
              <th className="border px-2 py-2 text-right font-semibold">Net Flow</th>
              <th className="border px-2 py-2 text-right font-semibold">Closing DC</th>
              <th className="border px-2 py-2 text-right font-semibold">Closing ISA</th>
              <th className="border px-2 py-2 text-right font-semibold">Closing Taxable</th>
              <th className="border px-2 py-2 text-right font-semibold bg-sky-50">Total (Nominal)</th>
              <th className="border px-2 py-2 text-right font-semibold bg-sky-50">Total (Real)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.age} className={row.warnings.length > 0 ? 'bg-red-50' : ''}>
                <td className="border px-2 py-2">
                  {row.age}
                  {row.warnings.length > 0 && <span className="ml-1 text-red-600">⚠️</span>}
                </td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.openingDC)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.openingISA)}</td>
                <td className={`border px-2 py-2 text-right ${row.openingTaxable < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(row.openingTaxable)}
                </td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.dcDrawdown)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.isaDrawdown)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.taxableDrawdown)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.isaInvestments)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.dbIncome)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.annuityIncome)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.statePension)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.otherIncome)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.dcGrowth)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.isaGrowth)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.taxableGrowth)}</td>
                <td className={`border px-2 py-2 text-right ${row.lifeEvents < 0 ? 'text-red-600' : row.lifeEvents > 0 ? 'text-green-600' : ''}`}>
                  {formatCurrency(row.lifeEvents)}
                </td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.annualSpend)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.totalTaxableIncome)}</td>
                <td className="border px-2 py-2 text-right">{formatCurrency(row.tax)}</td>
                <td className={`border px-2 py-2 text-right ${row.netFlow < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(row.netFlow)}
                </td>
                <td className={`border px-2 py-2 text-right ${row.closingDC < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(row.closingDC)}
                </td>
                <td className={`border px-2 py-2 text-right ${row.closingISA < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(row.closingISA)}
                </td>
                <td className={`border px-2 py-2 text-right ${row.closingTaxable < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(row.closingTaxable)}
                </td>
                <td className={`border px-2 py-2 text-right font-semibold bg-sky-50 ${row.totalNominal < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(row.totalNominal)}
                </td>
                <td className={`border px-2 py-2 text-right font-semibold bg-sky-50 ${row.totalReal < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(row.totalReal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

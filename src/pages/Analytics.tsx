import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '../components/Card';
import { revenueData } from '../data/mockData';
import { useLanguage } from '../i18n/LanguageContext';

export const Analytics: React.FC = () => {
  const { t } = useLanguage();

  const statusData = [
    { name: t.completedChart, value: 65, color: '#10b981' },
    { name: t.processingChart, value: 20, color: '#3b82f6' },
    { name: t.pendingChart, value: 10, color: '#f59e0b' },
    { name: t.cancelledChart, value: 5, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.analytics}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Bar Chart */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">{t.ordersPerMonth}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status Pie Chart */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">{t.orderStatusDistribution}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};
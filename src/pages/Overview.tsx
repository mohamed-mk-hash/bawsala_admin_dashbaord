import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatsCard } from '../components/StatsCard';
import { Card } from '../components/Card';
import { getStats, revenueData, recentOrders } from '../data/mockData';
import { useLanguage } from '../i18n/LanguageContext';

export const Overview: React.FC = () => {
  const { t } = useLanguage();
  const stats = getStats(t);

  const translateStatus = (status: string) => {
    return t[status as keyof typeof t] || status;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.overview}</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} stat={stat} />
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">{t.revenueOverview}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent Orders */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">{t.recentOrders}</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{t.orderId}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{t.customer}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{t.product}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{t.amount}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{t.status}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{t.date}</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="py-3 px-4 text-sm">{order.id}</td>
                  <td className="py-3 px-4 text-sm">{order.customer}</td>
                  <td className="py-3 px-4 text-sm">{order.product}</td>
                  <td className="py-3 px-4 text-sm font-medium">${order.amount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {translateStatus(order.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
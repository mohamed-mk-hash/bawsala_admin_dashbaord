import React from 'react';
import { Card } from '../components/Card';
import { recentOrders } from '../data/mockData';
import { useLanguage } from '../i18n/LanguageContext';

export const Orders: React.FC = () => {
  const { t } = useLanguage();

  const translateStatus = (status: string) => {
    return t[status as keyof typeof t] || status;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.orders}</h1>
      
      <Card>
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
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium">{order.id}</td>
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
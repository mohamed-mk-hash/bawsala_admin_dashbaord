import React from 'react';
import { Card } from '../components/Card';
import { useLanguage } from '../i18n/LanguageContext';

export const Settings: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.settings}</h1>
      
      <Card>
        <h2 className="text-lg font-semibold mb-4">{t.profileSettings}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.name}</label>
            <input
              type="text"
              defaultValue="John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.email}</label>
            <input
              type="email"
              defaultValue="john.doe@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            {t.saveChanges}
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">{t.notifications}</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="mr-3" />
            <span className="text-sm">{t.emailNotifications}</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="mr-3" />
            <span className="text-sm">{t.pushNotifications}</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-3" />
            <span className="text-sm">{t.smsNotifications}</span>
          </label>
        </div>
      </Card>
    </div>
  );
};
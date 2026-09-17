import React, { useState } from 'react';

import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { isArabic } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      const success = await login(
        email,
        password
      );

      if (!success) {
        /*
         * Generic error intentionally.
         * We don't tell the visitor whether:
         *
         * - email is wrong
         * - password is wrong
         * - account exists but isn't admin
         */
        setError(
          isArabic
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            : 'Invalid email or password'
        );

        setPassword('');
      }
    } catch (error) {
      console.error('Login error:', error);

      setError(
        isArabic
          ? 'حدث خطأ أثناء تسجيل الدخول'
          : 'An error occurred while signing in'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md p-8 w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isArabic
            ? 'تسجيل الدخول'
            : 'Admin Login'}
        </h1>

        {error && (
          <div className="mb-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isArabic
              ? 'البريد الإلكتروني'
              : 'Email'}
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            autoComplete="email"
            className="
              w-full
              px-4
              py-2
              border
              border-gray-300
              rounded-lg
              focus:ring-2
              focus:ring-blue-500
              focus:border-transparent
            "
            required
          />
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isArabic
              ? 'كلمة المرور'
              : 'Password'}
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            autoComplete="current-password"
            className="
              w-full
              px-4
              py-2
              border
              border-gray-300
              rounded-lg
              focus:ring-2
              focus:ring-blue-500
              focus:border-transparent
            "
            required
          />
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="
            w-full
            px-6
            py-2
            bg-blue-600
            text-white
            rounded-lg
            hover:bg-blue-700
            transition-colors
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {isSubmitting
            ? isArabic
              ? 'جاري تسجيل الدخول...'
              : 'Signing in...'
            : isArabic
              ? 'دخول'
              : 'Login'}
        </button>
      </form>
    </div>
  );
};
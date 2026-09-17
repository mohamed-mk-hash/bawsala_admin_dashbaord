import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { auth } from '../firebase';

interface AuthContextType {
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/*
 * ضع هنا UID الكامل الخاص بحساب الـ Admin.
 *
 * Firebase Console
 * Authentication
 * Users
 * admin account
 * User UID
 */
const ADMIN_UID = '7H2flpiQ2pWW5cG8xLjGDdk5H3n1';

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // No logged-in user
      if (!user) {
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }

      /*
       * Only the Firebase account with this exact UID
       * is allowed to access the admin dashboard.
       */
      if (user.uid === ADMIN_UID) {
        setIsAuthenticated(true);
        setAuthLoading(false);
        return;
      }

      /*
       * Another valid Firebase user logged in.
       * Sign them out immediately.
       */
      setIsAuthenticated(false);

      try {
        await signOut(auth);
      } catch (error) {
        console.error('Error signing out unauthorized user:', error);
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      /*
       * Firebase first checks the email + password.
       */
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      /*
       * Firebase credentials were correct,
       * but now we verify that this is THE admin account.
       */
      if (userCredential.user.uid !== ADMIN_UID) {
        await signOut(auth);

        setIsAuthenticated(false);

        return false;
      }

      setIsAuthenticated(true);

      return true;
    } catch (error) {
      console.error('Firebase login error:', error);

      setIsAuthenticated(false);

      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase logout error:', error);
    } finally {
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
};
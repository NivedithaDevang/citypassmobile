
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

import {
  saveToken,
  getToken,
  removeToken,
} from '../services/tokenStorage';

interface AuthContextType {
  isAuthenticated: boolean;
  userToken: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userToken: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check saved token whenever the app starts
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await getToken('citypass_user_token');

        if (token) {
          setUserToken(token);
          setIsAuthenticated(true);
        } else {
          setUserToken(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login and save token
  const login = async (token: string) => {
    await saveToken('citypass_user_token', token);

    setUserToken(token);
    const saved = await getToken('citypass_user_token');
    console.log('Saved token: ', saved)
    setIsAuthenticated(true);
  };

  // Logout and remove token
  const logout = async () => {
    await removeToken('citypass_user_token');

    setUserToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userToken,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

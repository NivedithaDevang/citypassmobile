import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { tokenStorage } from '../services/tokenStorage';

interface AuthContextType {
  isAuthenticated: boolean;
  userToken: string | null;
  isLoading: boolean;
  login: (token: string, expiresAt?: number) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userToken: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check stored token and validity on app startup
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await tokenStorage.getToken();
        if (token) {
          setUserToken(token);
          setIsAuthenticated(true);
        } else {
          setUserToken(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error verifying auth status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (token: string, expiresAt?: number) => {
    await tokenStorage.setToken(token, expiresAt);
    setUserToken(token);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await tokenStorage.removeToken();
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

export const useAuth = () => useContext(AuthContext);
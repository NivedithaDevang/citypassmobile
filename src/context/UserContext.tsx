import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import type { User } from '../types/auth';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface UserContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  profileImage: string | null;
  setProfileImage: (image: string | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileImage, setProfileImageState] = useState<string | null>(null);
  const sessionRequestVersion = useRef(0);

  const getImageUrl = useCallback((image: string | null | undefined) => {
    if (!image) return null;
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL ?? '';
    return `${apiBaseUrl.replace(/\/$/, '')}/${image.replace(/^\/+/, '')}`;
  }, []);

  const setUser = useCallback(
    (newUser: User | null) => {
      sessionRequestVersion.current += 1;
      setUserState(newUser);
      setProfileImageState(getImageUrl(newUser?.profile_image));
    },
    [getImageUrl]
  );

  const clearUser = useCallback(() => {
    sessionRequestVersion.current += 1;
    setUserState(null);
    setProfileImageState(null);
  }, []);

  // Sync profile fetch with authentication state
  useEffect(() => {
    if (!isAuthenticated) {
      clearUser();
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      const requestVersion = sessionRequestVersion.current;
      setLoading(true);

      try {
        const response = await api.get('/v1/auth/profile');
        if (requestVersion !== sessionRequestVersion.current) return;
        setUser(response.data?.user || response.data);
      } catch (error: any) {
        if (requestVersion === sessionRequestVersion.current) {
          clearUser();
          if (error.response?.status === 401) {
            await logout();
          }
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [isAuthenticated, setUser, clearUser, logout]);

  const setProfileImage = useCallback(
    (image: string | null) => {
      const fullImageUrl = getImageUrl(image);
      setProfileImageState(fullImageUrl);

      setUserState((currentUser) => {
        if (!currentUser) return currentUser;
        return {
          ...currentUser,
          profile_image: image ?? undefined,
        };
      });
    },
    [getImageUrl]
  );

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        setUser,
        clearUser,
        profileImage,
        setProfileImage,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
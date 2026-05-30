import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import FullPageLoader from './FullPageLoader';
import { SERVER_URL, authenticatedFetch, clearAuthToken } from '../utils';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authenticatedFetch(
          `${SERVER_URL}/auth/me`,
          { method: 'GET' }
        );
        
        if (response.ok) {
          setIsAuthenticated(true);
        } else if (response.status === 401) {
          // Token expired or invalid
          clearAuthToken();
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoaded(true);
      }
    };

    checkAuth();
  }, []);

  if (!isLoaded) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 
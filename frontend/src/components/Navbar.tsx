import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart2, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SERVER_URL, authenticatedFetch, clearAuthToken } from '../utils';
import { toast } from 'sonner';

const Navbar = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authenticatedFetch(
          `${SERVER_URL}/auth/me`,
          { method: 'GET' }
        );
        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await authenticatedFetch(
        `${SERVER_URL}/auth/logout`,
        { method: 'POST' }
      );
      clearAuthToken();
      toast.success('Logged out successfully');
      setIsAuthenticated(false);
      navigate('/');
    } catch (error) {
      clearAuthToken(); // Clear token even if logout API fails
      toast.error('Logout failed');
      console.error(error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-lg backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <BarChart2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">BudgetIQ</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {!loading && (
              isAuthenticated ? (
                <>
                  <Link to="/portfolio" className="btn-primary">
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/sign-in" className="btn-primary">Sign In</Link>
                  <Link to="/sign-up" className="btn-secondary">Sign Up</Link>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
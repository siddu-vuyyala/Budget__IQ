import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getAuthToken } from '../utils';

const AuthComponent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has JWT token, if so redirect to portfolio
    const token = getAuthToken();
    if (token) {
      navigate('/portfolio');
    }
  }, [navigate]);

  return null;
};

export default AuthComponent; 
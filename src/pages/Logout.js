import React from 'react';
import { authService } from '../services/authService';

const Logout = () => {
  React.useEffect(() => {
    handleLogout();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.removeUser();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div>Logging out...</div>
    </div>
  );
};

export default Logout;

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Callback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = React.useState(null);
  const hasProcessedRef = React.useRef(false);

  const handleCallback = React.useCallback(async () => {
    try {
      if (hasProcessedRef.current) {
        return;
      }
      hasProcessedRef.current = true;

      const params = new URLSearchParams(location.search);
      const hasCode = params.has('code');
      const hasState = params.has('state');

      if (hasCode && hasState) {
        await authService.signInCallback();
        console.log('Stored access token:', authService.getStoredAccessToken());
        console.log('Stored authorization:', authService.getStoredAuthorization());
        console.log('Stored token endpoint:', authService.getStoredTokenEndpoint());
        navigate('/dashboard', { replace: true });
        return;
      }

      const authenticated = await authService.isAuthenticated();
      if (authenticated) {
        navigate('/dashboard', { replace: true });
        return;
      }

      await authService.signIn();
    } catch (err) {
      console.error('Callback error:', err);
      setError(`Authentication failed: ${err?.message || 'Please try again.'}`);
    }
  }, [location.search, navigate]);

  React.useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: '20px'
      }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => authService.signIn()}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div>Processing authentication...</div>
    </div>
  );
};

export default Callback;

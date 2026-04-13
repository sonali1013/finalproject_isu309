import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const justLoggedOut = authService.consumeJustLoggedOutFlag();
        if (justLoggedOut) {
          setIsCheckingAuth(false);
          return;
        }

        const authenticated = await authService.isAuthenticated();
        if (authenticated) {
          navigate('/dashboard', { replace: true });
          return;
        }
        // Not authenticated — redirect directly to Authentik
        const fromPath = location.state?.from?.pathname;
        if (fromPath) {
          window.sessionStorage.setItem('auth:returnPath', fromPath);
        }
        await authService.signIn();
      } catch (authError) {
        console.error('Error checking login state:', authError);
        setIsCheckingAuth(false);
      }
    };

    checkAuthentication();
  }, [navigate, location]);

  const handleLogin = async () => {
    try {
      setError('');
      setIsSigningIn(true);
      const fromPath = location.state?.from?.pathname;
      if (fromPath) {
        window.sessionStorage.setItem('auth:returnPath', fromPath);
      }
      await authService.signIn();
    } catch (signInError) {
      console.error('Error starting login flow:', signInError);
      setError(signInError?.message || 'Unable to start login.');
      setIsSigningIn(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {error ? (
          <>
            <p className="login-error">{error}</p>
            <button
              type="button"
              className="login-button"
              onClick={handleLogin}
              disabled={isSigningIn}
            >
              {isSigningIn ? 'Redirecting...' : 'Retry Login'}
            </button>
          </>
        ) : !isCheckingAuth ? (
          <>
            <p className="login-copy">You are logged out.</p>
            <button
              type="button"
              className="login-button"
              onClick={handleLogin}
              disabled={isSigningIn}
            >
              {isSigningIn ? 'Redirecting...' : 'Login Again'}
            </button>
          </>
        ) : (
          <p className="login-copy">Redirecting to login...</p>
        )}
      </div>
    </div>
  );
};

export default Login;
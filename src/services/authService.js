import { userManager } from '../config/authConfig';

let signInInProgress = false;
const AUTH_REDIRECT_LOCK_KEY = 'auth:redirecting';
const AUTH_REDIRECT_LOCK_TS_KEY = 'auth:redirecting:ts';
const AUTH_REDIRECT_LOCK_MAX_AGE_MS = 2 * 60 * 1000;
const AUTH_ACCESS_TOKEN_KEY = 'auth:access_token';
const AUTH_AUTHORIZATION_KEY = 'auth:authorization';
const AUTH_ID_TOKEN_KEY = 'auth:id_token';
const AUTH_TOKEN_ENDPOINT_KEY = 'auth:token_endpoint';
const AUTH_PROFILE_KEY = 'auth:profile';
const AUTH_PREFERRED_USERNAME_KEY = 'auth:preferred_username';
const AUTH_JUST_LOGGED_OUT_KEY = 'auth:just_logged_out';
const SHOULD_LOG_AUTH_TOKEN = process.env.NODE_ENV !== 'production';

const decodeJwtPayload = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const tokenParts = token.split('.');
    if (tokenParts.length < 2) {
      return null;
    }

    const payload = tokenParts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const normalizedPayload = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const decodedPayload = window.atob(normalizedPayload);

    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Error decoding JWT payload:', error);
    return null;
  }
};

const getAuthorizationFromUser = (user) => {
  if (!user) {
    return '';
  }

  const existingAuthorization = user.profile?.authorization || user.profile?.Authorization;
  if (typeof existingAuthorization === 'string' && existingAuthorization.trim().length > 0) {
    return existingAuthorization.trim();
  }

  return typeof user.access_token === 'string' ? user.access_token.trim() : '';
};

const clearPersistedAuthSession = () => {
  window.sessionStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_AUTHORIZATION_KEY);
  window.sessionStorage.removeItem(AUTH_ID_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_TOKEN_ENDPOINT_KEY);
  window.sessionStorage.removeItem(AUTH_PROFILE_KEY);
  window.sessionStorage.removeItem(AUTH_PREFERRED_USERNAME_KEY);
};

const persistAuthSession = async (user) => {
  if (!user) {
    clearPersistedAuthSession();
    return;
  }

  const accessToken = typeof user.access_token === 'string' ? user.access_token.trim() : '';
  const idToken = typeof user.id_token === 'string' ? user.id_token.trim() : '';
  const authorization = getAuthorizationFromUser(user);
  const decodedAccessToken = decodeJwtPayload(accessToken);
  const preferredUsername = decodedAccessToken?.preferred_username || user.profile?.preferred_username || '';

  if (accessToken) {
    window.sessionStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
  }
  if (authorization) {
    window.sessionStorage.setItem(AUTH_AUTHORIZATION_KEY, authorization);
  } else {
    window.sessionStorage.removeItem(AUTH_AUTHORIZATION_KEY);
  }
  if (idToken) {
    window.sessionStorage.setItem(AUTH_ID_TOKEN_KEY, idToken);
  }
  if (user.profile) {
    window.sessionStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(user.profile));
  }
  if (preferredUsername) {
    window.sessionStorage.setItem(AUTH_PREFERRED_USERNAME_KEY, preferredUsername);
  }

  try {
    const metadata = await userManager.metadataService.getMetadata();
    const tokenEndpoint = metadata?.token_endpoint;
    if (tokenEndpoint) {
      window.sessionStorage.setItem(AUTH_TOKEN_ENDPOINT_KEY, tokenEndpoint);
    }
  } catch (metadataError) {
    console.error('Error reading token endpoint metadata:', metadataError);
  }

  if (SHOULD_LOG_AUTH_TOKEN) {
    console.log('Authentik token generated successfully');
    console.log('Access token:', accessToken);
    console.log('Authorization:', authorization);
    console.log('ID token:', idToken);
    console.log('Preferred username:', preferredUsername || 'N/A');
    console.log('Token endpoint:', window.sessionStorage.getItem(AUTH_TOKEN_ENDPOINT_KEY) || 'N/A');
  }
};

export const authService = {
  // Get current user
  getUser: async () => {
    try {
      const user = await userManager.getUser();
      await persistAuthSession(user);
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Sign in redirect
  signIn: async () => {
    const redirectLock = window.sessionStorage.getItem(AUTH_REDIRECT_LOCK_KEY);
    const redirectLockTs = Number(window.sessionStorage.getItem(AUTH_REDIRECT_LOCK_TS_KEY) || '0');
    const isValidLock = redirectLock === '1' && Number.isFinite(redirectLockTs) && (Date.now() - redirectLockTs) < AUTH_REDIRECT_LOCK_MAX_AGE_MS;

    if (!isValidLock) {
      window.sessionStorage.removeItem(AUTH_REDIRECT_LOCK_KEY);
      window.sessionStorage.removeItem(AUTH_REDIRECT_LOCK_TS_KEY);
    }

    if (signInInProgress) {
      return;
    }
    if (isValidLock) {
      return;
    }

    try {
      signInInProgress = true;
      window.sessionStorage.setItem(AUTH_REDIRECT_LOCK_KEY, '1');
      window.sessionStorage.setItem(AUTH_REDIRECT_LOCK_TS_KEY, Date.now().toString());
      await userManager.signinRedirect();
    } catch (error) {
      console.error('Error signing in:', error);
      window.sessionStorage.removeItem(AUTH_REDIRECT_LOCK_KEY);
      window.sessionStorage.removeItem(AUTH_REDIRECT_LOCK_TS_KEY);
      throw error;
    } finally {
      signInInProgress = false;
    }
  },

  // Handle sign in callback
  signInCallback: async () => {
    try {
      const user = await userManager.signinRedirectCallback();
      await persistAuthSession(user);
      return user;
    } catch (error) {
      console.error('Error in signin callback:', error);
      throw error;
    } finally {
      signInInProgress = false;
      window.sessionStorage.removeItem(AUTH_REDIRECT_LOCK_KEY);
      window.sessionStorage.removeItem(AUTH_REDIRECT_LOCK_TS_KEY);
    }
  },

  // Sign out
  signOut: async () => {
    try {
      window.sessionStorage.setItem(AUTH_JUST_LOGGED_OUT_KEY, '1');
      clearPersistedAuthSession();
      await userManager.signoutRedirect();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Remove user
  removeUser: async () => {
    try {
      await userManager.removeUser();
      clearPersistedAuthSession();
      window.sessionStorage.removeItem(AUTH_REDIRECT_LOCK_KEY);
      window.sessionStorage.removeItem(AUTH_REDIRECT_LOCK_TS_KEY);
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const user = await userManager.getUser();
      return user !== null && !user.expired;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },

  getStoredAuthorization: () => window.sessionStorage.getItem(AUTH_AUTHORIZATION_KEY) || '',

  getStoredAccessToken: () => window.sessionStorage.getItem(AUTH_ACCESS_TOKEN_KEY) || '',

  getStoredIdToken: () => window.sessionStorage.getItem(AUTH_ID_TOKEN_KEY) || '',

  getStoredPreferredUsername: () => window.sessionStorage.getItem(AUTH_PREFERRED_USERNAME_KEY) || '',

  consumeJustLoggedOutFlag: () => {
    const value = window.sessionStorage.getItem(AUTH_JUST_LOGGED_OUT_KEY) === '1';
    window.sessionStorage.removeItem(AUTH_JUST_LOGGED_OUT_KEY);
    return value;
  },

  getStoredTokenEndpoint: () => window.sessionStorage.getItem(AUTH_TOKEN_ENDPOINT_KEY) || ''
};

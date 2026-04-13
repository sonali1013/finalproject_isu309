import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const getEnv = (key, fallback = '') => (process.env[key] || fallback).trim();
const redirectUri = getEnv('REACT_APP_REDIRECT_URI', `${window.location.origin}/callback`);

const authConfig = {
  authority: getEnv('REACT_APP_AUTH_URL'),
  client_id: getEnv('REACT_APP_CLIENT_ID'),
  redirect_uri: redirectUri,
  post_logout_redirect_uri: window.location.origin + '/sso/logout',
  response_type: 'code',
  scope: 'openid profile email offline_access authorities privileges user_name created adminName bankCode goauthentik.io/api',
  automaticSilentRenew: true,
  loadUserInfo: true,
  monitorSession: true,
  filterProtocolClaims: true,
  userStore: new WebStorageStateStore({
    store: window.sessionStorage,
    sync: true
  })
};

export const userManager = new UserManager(authConfig);

export default authConfig;

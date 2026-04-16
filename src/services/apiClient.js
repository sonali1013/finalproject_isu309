import axios from 'axios';
import CryptoJS from 'crypto-js';
import { authService } from './authService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const AES_KEY = process.env.REACT_APP_AES_KEY;
const PASS_KEY = process.env.REACT_APP_PASS_KEY;

const getDecodedKey = () => CryptoJS.enc.Base64.parse(AES_KEY);

const getAccessTokenFromUser = (user, options = {}) => {
  const { preferStored = true } = options;
  if (preferStored) {
    const storedAccessToken = authService.getStoredAccessToken();
    if (storedAccessToken) {
      return storedAccessToken;
    }
  }

  if (!user) {
    return '';
  }

  return typeof user.access_token === 'string' ? user.access_token.trim() : '';
};

const getAuthorizationFromUser = (user, options = {}) => {
  const { preferStored = true } = options;
  if (preferStored) {
    const storedAuthorization = authService.getStoredAuthorization();
    if (storedAuthorization) {
      return toBearerToken(storedAuthorization);
    }
  }

  if (!user) {
    return '';
  }

  const existingAuthorization = user.profile?.authorization || user.profile?.Authorization;
  if (typeof existingAuthorization === 'string' && existingAuthorization.trim().length > 0) {
    return toBearerToken(existingAuthorization.trim());
  }

  const accessToken = getAccessTokenFromUser(user, { preferStored });
  if (!accessToken) {
    return '';
  }

  return accessToken.toLowerCase().startsWith('bearer ')
    ? accessToken
    : `Bearer ${accessToken}`;
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    if (config.headers?.Authorization) {
      return config;
    }

    const user = await authService.getUser();
    const authorization = getAuthorizationFromUser(user);
    if (authorization) {
      config.headers.Authorization = authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Keep the user on the current page and let page-level code handle the 401 message.
      // Auto sign-in on every 401 can cause infinite auth loops if backend rejects the API token.
      console.error('API returned 401 Unauthorized for:', error.config?.url || 'unknown endpoint');
    }
    return Promise.reject(error);
  }
);

// Encryption utility (if needed)
export const encryptData = (data) => {
  try {
    return encryptRequestData(data);
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

export const encryptRequestData = (body) => {
  const serializedBody = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  const iv = CryptoJS.lib.WordArray.random(16);
  const decodedKey = getDecodedKey();
  const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(serializedBody), decodedKey, {
    iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC
  });
  const combined = iv.concat(encrypted.ciphertext);

  if (process.env.NODE_ENV !== 'production') {
    console.log('fetchById plaintext before encryption:', serializedBody);
  }

  return CryptoJS.enc.Base64.stringify(combined);
};

// Decryption utility (if needed)
export const decryptData = (encryptedData) => {
  try {
    return decryptResponseData(encryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};

export const decryptResponseData = (responseBody) => {
  if (!responseBody || typeof responseBody !== 'string') {
    return responseBody;
  }

  const byteCipherText = CryptoJS.enc.Base64.parse(responseBody);
  const iv = CryptoJS.lib.WordArray.create(byteCipherText.words.slice(0, 4), 16);
  const cipherText = CryptoJS.lib.WordArray.create(
    byteCipherText.words.slice(4),
    byteCipherText.sigBytes - 16
  );
  const decodedKey = getDecodedKey();
  const decrypted = CryptoJS.AES.decrypt({ ciphertext: cipherText }, decodedKey, {
    iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC
  });
  const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

  return decryptedString;
};

export const getAuthorizationValue = async () => {
  const user = await authService.getUser();
  const liveAuthorization = getAuthorizationFromUser(user, { preferStored: false });
  if (liveAuthorization) {
    return liveAuthorization;
  }

  return authService.getStoredAuthorization();
};

function stripBearerPrefix(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/^Bearer\s+/i, '').trim();
}

export const getRawAuthorizationValue = async () => {
  const authorization = await getAuthorizationValue();
  if (authorization) {
    return stripBearerPrefix(authorization);
  }

  return stripBearerPrefix(authService.getStoredAuthorization());
};

export const getAccessTokenValue = async () => {
  const user = await authService.getUser();
  const liveAccessToken = getAccessTokenFromUser(user, { preferStored: false });
  if (liveAccessToken) {
    return liveAccessToken;
  }

  return authService.getStoredAccessToken();
};

export const getIdTokenValue = async () => {
  const user = await authService.getUser();
  const liveIdToken = typeof user?.id_token === 'string' ? user.id_token.trim() : '';
  if (liveIdToken) {
    return liveIdToken;
  }

  return authService.getStoredIdToken();
};

async function resolveAuthorizationValue(options = {}) {
  const { authMode = 'gateway-jwt' } = options;
  const idToken = await getIdTokenValue();
  const authorizationFromService = await getAuthorizationValue();
  const accessToken = await getAccessTokenValue();

  if (authMode === 'raw-authorization-token') {
    return stripBearerPrefix(authorizationFromService);
  }

  if (authMode === 'authorization-token') {
    return authorizationFromService || toBearerToken(accessToken) || toBearerToken(idToken);
  }

  // API gateway VerifyJWT policy expects the id_token (signed OIDC JWT).
  // access_token from Authentik is scoped for goauthentik.io/api, not the backend gateway.
  return toBearerToken(idToken) || authorizationFromService || toBearerToken(accessToken);
}

function toBearerToken(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.toLowerCase().startsWith('bearer ')
    ? trimmed
    : `Bearer ${trimmed}`;
}

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    try {
      const text = await response.text();
      if (!text || !text.trim()) {
        return null;
      }
      return safeJsonParse(text);
    } catch {
      return null;
    }
  }
}

function shouldEncryptBody(options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  return method !== 'GET' && method !== 'HEAD' && options.body != null;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const decodeApiResponse = (rawData) => {
  if (typeof rawData === 'string' && rawData.trim()) {
    const decrypted = decryptResponseData(rawData.trim());
    return safeJsonParse(decrypted);
  }

  if (!rawData || typeof rawData !== 'object') {
    return rawData;
  }

  if (typeof rawData.RequestData === 'string' && rawData.RequestData.trim()) {
    const decrypted = decryptResponseData(rawData.RequestData.trim());
    return safeJsonParse(decrypted);
  }

  if (typeof rawData.ResponseData === 'string' && rawData.ResponseData.trim()) {
    const decrypted = decryptResponseData(rawData.ResponseData.trim());
    return safeJsonParse(decrypted);
  }

  if (typeof rawData.responseData === 'string' && rawData.responseData.trim()) {
    const decrypted = decryptResponseData(rawData.responseData.trim());
    return safeJsonParse(decrypted);
  }

  if (typeof rawData.data === 'string' && rawData.data.trim()) {
    const decrypted = decryptResponseData(rawData.data.trim());
    return safeJsonParse(decrypted);
  }

  return rawData;
};

function getAuthorizationHeader(authorization) {
  if (authorization) {
    return { Authorization: authorization };
  }

  return {};
}

function getStaticPassKeyHeader() {
  return PASS_KEY ? { pass_key: PASS_KEY } : {};
}

async function buildRequestOptions(options = {}) {
  const headers = new Headers(options.headers || {});
  const providedAuthorization = headers.get('Authorization');
  const authorization = providedAuthorization || await resolveAuthorizationValue(options);
  const authHeader = getAuthorizationHeader(authorization);
  const passKeyHeader = getStaticPassKeyHeader();

  const body = shouldEncryptBody(options)
    ? JSON.stringify({
      RequestData: encryptRequestData(options.body)
    })
    : options.body;

  Object.entries(authHeader).forEach(([key, value]) => headers.set(key, value));
  Object.entries(passKeyHeader).forEach(([key, value]) => headers.set(key, value));

  if (!headers.has('Content-Type') && shouldEncryptBody(options)) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    ...options,
    body,
    headers
  };
}

function resolveRequestUrl(url) {
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  if (url.startsWith('/')) {
    return url;
  }

  return API_BASE_URL ? `${API_BASE_URL}${url}` : url;
}

export async function apiRequest(url, options = {}) {
  const requestOptions = await buildRequestOptions(options);
  const requestUrl = resolveRequestUrl(url);

  if (process.env.NODE_ENV !== 'production' && requestUrl.includes('/fetch/fetchById')) {
    const headerEntries = Object.fromEntries(requestOptions.headers.entries());
    console.log('fetchById request URL:', requestUrl);
    console.log('fetchById request headers:', headerEntries);
    console.log('fetchById request body:', requestOptions.body);
  }

  const response = await fetch(requestUrl, requestOptions);
  const rawData = await parseJsonSafely(response);
  const data = decodeApiResponse(rawData);

  if (process.env.NODE_ENV !== 'production' && requestUrl.includes('/fetch/fetchById')) {
    console.log('fetchById raw response:', rawData);
    console.log('fetchById decoded response:', data);
    console.log('fetchById response status:', response.status);
  }

  if (!response.ok) {
    const errorMessage = data?.statusDesc || data?.statusdesc || data?.statusDescription ||
      data?.data?.statusDesc || data?.data?.statusdesc ||
      data?.status || data?.message ||
      `API request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

export async function apiRequestBlob(url, options = {}) {
  const requestOptions = await buildRequestOptions(options);
  const requestUrl = resolveRequestUrl(url);
  const response = await fetch(requestUrl, requestOptions);
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }
  return response.blob();
}

export default apiClient;

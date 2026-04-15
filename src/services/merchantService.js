import apiClient, { apiRequest } from './apiClient';
import { mockVPAs, mockTransactions, mockLanguages, mockCurrentLanguage } from './mockData';

const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true';

// Helper to simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const FETCH_BY_VPA_ID_URL = process.env.REACT_APP_FETCH_BY_ID_URL
  || '/api/preprod/encrV4/CBOI/fetch/fetchById';
const DEFAULT_REPORT_QUERY_URL = 'https://services-cboi-uat.isupay.in/CBOI/reports/querysubmit_username';
const LEGACY_REPORT_QUERY_URL = 'https://services-cboiuat.isupay.in/CBOI/reports/querysubmit_username';
const configuredReportUrl = (process.env.REACT_APP_REPORT_QUERY_URL || '').trim();
const REPORT_QUERY_URL = !configuredReportUrl || configuredReportUrl === LEGACY_REPORT_QUERY_URL
  ? DEFAULT_REPORT_QUERY_URL
  : configuredReportUrl;
const QR_CONVERT_TO_BASE64_URL = process.env.REACT_APP_QR_CONVERT_TO_BASE64_URL
  || '/api/preprod/encrV4/CBOI/merchant/qr_convert_to_base64';
const CURRENT_LANGUAGE_URL = process.env.REACT_APP_CURRENT_LANGUAGE_URL
  || '/api/preprod/encrV4/CBOI/isu_soundbox/user_api/current_language';
const FETCH_ALL_LANGUAGE_URL = process.env.REACT_APP_FETCH_ALL_LANGUAGE_URL
  || '/api/preprod/encrV4/CBOI/isu_soundbox/lang/fetch_language';
const UPDATE_LANGUAGE_URL = process.env.REACT_APP_UPDATE_LANGUAGE_URL
  || '/api/preprod/encrV4/CBOI/isu_soundbox/lang/update_language';
const RAISE_TICKET_FORM_URL = process.env.REACT_APP_RAISE_TICKET_FORM_URL
  || '/api/services/isu/elastic/fetch';
const CREATE_TICKET_URL = process.env.REACT_APP_CREATE_TICKET_URL
  || '/api/preprod/encrV4/CBOI/zendesk/v2/createTicket';

const parseJsonOrText = async (response) => {
  try {
    return await response.json();
  } catch {
    try {
      const text = await response.text();
      if (!text || !text.trim()) {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch {
      return null;
    }
  }
};

const normalizeVpaRecord = (item, index) => ({
  id: item.id || item.vpa_id || item.terminal_id || item.merchant_id || index,
  vpaId: item.vpaId || item.vpa_id || item.upiId || item.vpaAddress || '',
  vpaAddress: item.vpaAddress || item.upiId || item.vpa_id || '',
  upiId: item.upiId || item.vpaAddress || item.vpa_id || '',
  merchantName: item.merchantName || item.merchant_name || '',
  bankCode: item.bankCode || item.bank_code || '',
  status: item.status || item.merchant_status || 'Active',
  merchantId: item.merchantId || item.merchant_id || '',
  merchantMobile: item.merchantMobile || item.merchant_mobile || '',
  merchantAccountNo: item.merchantAccountNo || item.merchant_account_no || '',
  serialNumber: item.serialNumber || item.serial_number || '',
  terminalId: item.terminalId || item.terminal_id || '',
  state: item.state || '',
  qrString: item.qrString || item.qr_string || '',
  createdDate: item.createdDate || item.created_date || ''
});

const buildFetchByIdPayload = (username) => {
  const normalizedUsername = typeof username === 'string' ? username.trim() : '';

  if (!normalizedUsername) {
    throw new Error('preferred_username was not found in the Authentik token.');
  }

  return { mobile_number: normalizedUsername };
};

const buildReportPayload = ({ startDate, endDate, vpaId, mode }) => {
  const normalizedStartDate = typeof startDate === 'string' ? startDate.trim() : '';
  const normalizedEndDate = typeof endDate === 'string' ? endDate.trim() : '';
  const normalizedVpaId = typeof vpaId === 'string' ? vpaId.trim() : '';
  const normalizedMode = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
  const allowedModes = new Set(['both', 'excel', 'stream']);

  if (!normalizedStartDate || !normalizedEndDate || !normalizedVpaId) {
    throw new Error('startDate, endDate and vpa_id are required for report API call.');
  }

  if (!allowedModes.has(normalizedMode)) {
    throw new Error('mode must be one of: both, excel, stream.');
  }

  return {
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    vpa_id: normalizedVpaId,
    mode: normalizedMode
  };
};

const postNoAuthReport = async ({ startDate, endDate, vpaId, mode, expectBlob = false }) => {
  let response;
  try {
    response = await fetch(REPORT_QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*'
      },
      body: JSON.stringify(buildReportPayload({ startDate, endDate, vpaId, mode }))
    });
  } catch (error) {
    const message = (error && error.message) || '';
    if (message.toLowerCase().includes('failed to fetch')) {
      throw new Error('Unable to reach report service. The server may be down (503) or CORS may be blocked.');
    }
    throw error;
  }

  if (!response.ok) {
    let message = `Report API failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      message = errorData?.message || errorData?.error || message;
    } catch { }
    throw new Error(message);
  }

  if (expectBlob) {
    return response.blob();
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (!text || !text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { data: [] };
  }
};

export const merchantService = {
  // Fetch merchant details using preferred_username decoded from the Authentik token
  fetchById: async (username) => {
    if (USE_MOCK_DATA) {
      console.log('🔄 Using mock data for VPAs');
      await delay(500); // Simulate network delay
      return { data: mockVPAs.map((item, index) => normalizeVpaRecord(item, index)) };
    }

    try {
      const payload = buildFetchByIdPayload(username);
      const token = sessionStorage.getItem('auth:access_token'); // For debugging
      const responseData = await apiRequest("https://api-preprod.txninfra.com/encrV4/CBOI/fetch/fetchById", {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'pass_key': 'c0CKRG7yNFY3OIxY92izqj0YeMk6JPqdOlGgqsv3mhicXmAv',
          'Authorization': `${token}`
        }
      });
      const records = Array.isArray(responseData.data) ? responseData.data : [];

      return {
        ...responseData,
        data: records.map((item, index) => normalizeVpaRecord(item, index))
      };
    } catch (error) {
      console.error('Error fetching VPAs:', error);
      throw error;
    }
  },

  // Fetch merchant details using vpa_id
  fetchByVpaId: async (vpaId) => {
    if (USE_MOCK_DATA) {
      console.log('🔄 Using mock data for VPA details');
      await delay(500); // Simulate network delay
      return {
        message: `VPA details for ${vpaId} fetched successfully`,
        data: { vpa_id: vpaId }
      };
    }

    try {
      if (!vpaId || typeof vpaId !== 'string') {
        throw new Error('Valid vpa_id is required.');
      }

      const payload = { vpa_id: vpaId.trim() };
      console.log('Fetching VPA details with vpa_id:', vpaId);

      const responseData = await apiRequest(FETCH_BY_VPA_ID_URL, {
        method: 'POST',
        authMode: 'raw-authorization-token',
        body: payload
      });

      console.log('VPA details API response:', responseData);
      return responseData;
    } catch (error) {
      console.error('Error fetching VPA details by vpa_id:', error);
      throw error;
    }
  },

  // Query transaction report (display)
  queryReport: async ({ startDate, endDate, vpaId, mode = 'both' }) => {
    if (USE_MOCK_DATA) {
      console.log('🔄 Using mock data for transactions');
      await delay(500);
      return { data: mockTransactions };
    }
    return postNoAuthReport({ startDate, endDate, vpaId, mode, expectBlob: false });
  },

  // Download transaction report as Excel blob
  downloadReport: async ({ startDate, endDate, vpaId }) => {
    if (USE_MOCK_DATA) {
      throw new Error('Excel download is not available in mock mode.');
    }
    return postNoAuthReport({ startDate, endDate, vpaId, mode: 'excel', expectBlob: true });
  },

  // Fetch transaction report (legacy)
  report: async (params) => {
    if (USE_MOCK_DATA) {
      console.log('🔄 Using mock data for transactions');
      await delay(500);
      // Filter by VPA if specified
      let filteredTransactions = mockTransactions;
      if (params.vpaId && params.vpaId !== 'all') {
        const selectedVpa = mockVPAs.find(vpa => vpa.id === parseInt(params.vpaId));
        if (selectedVpa) {
          filteredTransactions = mockTransactions.filter(
            txn => txn.vpaAddress === selectedVpa.vpaAddress
          );
        }
      }
      return { data: filteredTransactions };
    }

    try {
      const response = await apiClient.get(`/merchant/report`, {
        params: {
          startDate: params.startDate,
          endDate: params.endDate,
          vpaId: params.vpaId
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
  },

  // Convert QR string to Base64
  convertToQRBase64: async (qrString) => {
    if (USE_MOCK_DATA) {
      console.log('🔄 Using mock data for QR conversion');
      await delay(300);
      // Return null to use the QR string directly with QRCodeSVG
      return { data: null, qrBase64: null };
    }

    try {
      const normalizedQrString = typeof qrString === 'string' ? qrString.trim() : '';

      if (!normalizedQrString) {
        throw new Error('QR string is required for conversion.');
      }
      const token = sessionStorage.getItem('auth:access_token');
      const response = await apiRequest(QR_CONVERT_TO_BASE64_URL, {
        method: 'POST',
        body: { qrString: normalizedQrString },
        headers: {
          'Content-Type': 'application/json',
          'pass_key': 'c0CKRG7yNFY3OIxY92izqj0YeMk6JPqdOlGgqsv3mhicXmAv',
          'Authorization': `${token}`
        }
      });

      return response;
    } catch (error) {
      console.error('Error converting QR:', error);
      throw error;
    }
  },

  // Get current language
  currentLanguage: async (tid) => {
    if (USE_MOCK_DATA) {
      console.log('🔄 Using mock data for current language');
      await delay(300);
      return { data: mockCurrentLanguage };
    }

    try {
      const normalizedTid = typeof tid === 'string' ? tid.trim() : String(tid || '').trim();
      if (!normalizedTid) {
        throw new Error('Device serial number (tid) is required to fetch current language.');
      }
      const token = sessionStorage.getItem('auth:access_token');
      return await apiRequest(`${CURRENT_LANGUAGE_URL}/${encodeURIComponent(normalizedTid)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'pass_key': 'c0CKRG7yNFY3OIxY92izqj0YeMk6JPqdOlGgqsv3mhicXmAv',
          'Authorization': `${token}`
        }

      });
    } catch (error) {
      console.error('Error fetching current language:', error);
      throw error;
    }
  },

  // Fetch all available languages
  fetchAllLanguage: async () => {
    if (USE_MOCK_DATA) {
      console.log('🔄 Using mock data for languages');
      await delay(300);
      return { data: mockLanguages };
    }
    const token = sessionStorage.getItem('auth:access_token');
    try {
      return await apiRequest(FETCH_ALL_LANGUAGE_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'pass_key': 'c0CKRG7yNFY3OIxY92izqj0YeMk6JPqdOlGgqsv3mhicXmAv',
          'Authorization': `${token}`
        }
      });
    } catch (error) {
      console.error('Error fetching languages:', error);
      throw error;
    }
  },

  // Update language
  updateLanguage: async ({ tid, updateLanguage }) => {
    if (USE_MOCK_DATA) {
      console.log('🔄 Using mock data for language update');
      await delay(500);
      const selectedLanguage = mockLanguages.find((lang) => {
        const languageName = (lang.languageName || lang.name || '').toUpperCase();
        return languageName === String(updateLanguage || '').toUpperCase();
      });
      return {
        data: { success: true, message: 'Language updated successfully' },
        language: selectedLanguage
      };
    }

    try {
      const normalizedTid = typeof tid === 'string' ? tid.trim() : String(tid || '').trim();
      const normalizedLanguage = typeof updateLanguage === 'string' ? updateLanguage.trim().toUpperCase() : '';

      if (!normalizedTid) {
        throw new Error('Device serial number (tid) is required to update language.');
      }

      if (!normalizedLanguage) {
        throw new Error('Selected update language is required.');
      }
      const token = sessionStorage.getItem('auth:access_token');
      return await apiRequest(UPDATE_LANGUAGE_URL, {
        method: 'POST',
        body: {
          tid: normalizedTid,
          update_language: normalizedLanguage
        },
        headers: {
          'Content-Type': 'application/json',
          'pass_key': 'c0CKRG7yNFY3OIxY92izqj0YeMk6JPqdOlGgqsv3mhicXmAv',
          'Authorization': `${token}`
        }
      });
    } catch (error) {
      console.error('Error updating language:', error);
      throw error;
    }
  },

  // Fetch Raise Ticket form schema/details
  fetchRaiseTicketForm: async () => {
    if (USE_MOCK_DATA) {
      await delay(200);
      return { data: [] };
    }

    const requestBody = {
      index: 'zendesk_form',
      type: 'em',
      query: {
        query: {
          nested: {
            path: 'forms',
            query: {
              bool: {
                must: [
                  {
                    match: {
                      'forms.id': 47501075391257
                    }
                  }
                ]
              }
            }
          }
        }
      }
    };

    try {
      const response = await fetch(RAISE_TICKET_FORM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await parseJsonOrText(response);
      if (!response.ok) {
        const message = responseData?.message || responseData?.error || `Raise Ticket API failed with status ${response.status}`;
        throw new Error(message);
      }

      return responseData;
    } catch (error) {
      console.error('Error fetching Raise Ticket form:', error);
      throw error;
    }
  },

  // Create Raise Ticket
  createTicket: async (payload) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { message: 'Ticket created successfully', data: { ticketId: 'MOCK-001' } };
    }
    const token = sessionStorage.getItem('auth:access_token');

    try {
      return await apiRequest(CREATE_TICKET_URL, {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'pass_key': 'c0CKRG7yNFY3OIxY92izqj0YeMk6JPqdOlGgqsv3mhicXmAv',
          'Authorization': `${token}`
        }
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  },

  // Filter Tickets
  filterTickets: async ({ status, created_after, created_before }) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { statusdesc: 'Tickets fetched successfully (mock)', data: [] };
    }
    const token = sessionStorage.getItem('auth:access_token');

    try {
      return await apiRequest('https://api-preprod.txninfra.com/encrV4/CBOI/zendesk/v2/filterTickets', {
        method: 'POST',
        body: {
          status: String(status).toLowerCase(),
          created_after,
          created_before
        },
        headers: {
          'Content-Type': 'application/json',
          'pass_key': 'c0CKRG7yNFY3OIxY92izqj0YeMk6JPqdOlGgqsv3mhicXmAv',
          'Authorization': `${token}`
        }
      });
    } catch (error) {
      console.error('Error filtering tickets:', error);
      throw error;
    }
  },

  // View Ticket Details
  viewTicket: async (ticketId) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { statusdesc: 'Ticket fetched successfully (mock)', data: { ticket_id: ticketId, history: [] } };
    }
    const token = sessionStorage.getItem('auth:access_token');

    try {
      return await apiRequest('https://api-preprod.txninfra.com/encrV4/CBOI/zendesk/v2/viewTicket', {
        method: 'POST',
        body: {
          ticket_id: parseInt(ticketId, 10)
        },
        headers: {
          'Content-Type': 'application/json',
          'pass_key': 'c0CKRG7yNFY3OIxY92izqj0YeMk6JPqdOlGgqsv3mhicXmAv',
          'Authorization': `${token}`
        }
      });
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      throw error;
    }
  },

  // Show Comments
  showComment: async (ticketId) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { statusdesc: 'Comments fetched successfully (mock)', data: { messages: [] } };
    }
    const token = sessionStorage.getItem('auth:access_token');

    try {
      return await apiRequest('https://api-preprod.txninfra.com/encrV4/CBOI/zendesk/v2/showComment', {
        method: 'POST',
        body: {
          ticket_id: parseInt(ticketId, 10)
        },
        headers: {
          'Content-Type': 'application/json',
          'pass_key': 'c0CKRG7yNFY3OIxY92izqj0YeMk6JPqdOlGgqsv3mhicXmAv',
          'Authorization': `${token}`
        }
      });
    } catch (error) {
      console.error('Error fetching ticket comments:', error);
      throw error;
    }
  },

  // Close Ticket
  closeTicketStatus: async (ticketId, remark) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { statusdesc: 'Ticket closed successfully (mock)', data: {} };
    }
    const token = sessionStorage.getItem('auth:access_token');

    try {
      return await apiRequest('https://api-preprod.txninfra.com/encrV4/CBOI/zendesk/v2/closeStatus', {
        method: 'POST',
        body: {
          ticket_id: parseInt(ticketId, 10),
          remark: remark
        },
        headers: {
          'Content-Type': 'application/json',
          'pass_key': 'c0CKRG7yNFY3OIxY92izqj0YeMk6JPqdOlGgqsv3mhicXmAv',
          'Authorization': `${token}`
        }
      });
    } catch (error) {
      console.error('Error closing ticket:', error);
      throw error;
    }
  },

  // Reopen Ticket
  reopenTicketStatus: async (ticketId, remark) => {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { statusdesc: 'Ticket reopened successfully (mock)', data: {} };
    }
    const token = sessionStorage.getItem('auth:access_token');

    try {
      return await apiRequest('https://api-preprod.txninfra.com/encrV4/CBOI/zendesk/v2/reopenStatus', {
        method: 'POST',
        body: {
          ticket_id: parseInt(ticketId, 10),
          remark: remark
        },
        headers: {
          'Content-Type': 'application/json',
          'pass_key': 'c0CKRG7yNFY3OIxY92izqj0YeMk6JPqdOlGgqsv3mhicXmAv',
          'Authorization': `${token}`
        }
      });
    } catch (error) {
      console.error('Error reopening ticket:', error);
      throw error;
    }
  }
};

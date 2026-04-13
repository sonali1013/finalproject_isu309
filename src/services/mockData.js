// Mock data for testing when API is not available
// Remove this file once real API is connected

export const mockVPAs = [
  {
    id: 1,
    vpaAddress: '9348781833@bank',
    upiId: '9348781833@bank',
    merchantName: 'Test Merchant Store',
    bankCode: 'CBOI',
    status: 'Active',
    merchantId: 'MERCH001',
    qrString: 'upi://pay?pa=9348781833@bank&pn=Test%20Merchant%20Store&am=0&cu=INR',
    createdDate: '2026-01-15T10:30:00Z'
  },
  {
    id: 2,
    vpaAddress: 'merchant.shop@cboi',
    upiId: 'merchant.shop@cboi',
    merchantName: 'Demo Shop',
    bankCode: 'CBOI',
    status: 'Active',
    merchantId: 'MERCH002',
    qrString: 'upi://pay?pa=merchant.shop@cboi&pn=Demo%20Shop&am=0&cu=INR',
    createdDate: '2026-02-10T14:20:00Z'
  },
  {
    id: 3,
    vpaAddress: 'store9348781833@upi',
    upiId: 'store9348781833@upi',
    merchantName: 'Sample Store',
    bankCode: 'CBOI',
    status: 'Inactive',
    merchantId: 'MERCH003',
    qrString: 'upi://pay?pa=store9348781833@upi&pn=Sample%20Store&am=0&cu=INR',
    createdDate: '2025-12-05T09:15:00Z'
  }
];

export const mockTransactions = [
  {
    id: 1,
    transactionId: 'TXN20260411001',
    txnId: 'TXN20260411001',
    vpaAddress: '9348781833@bank',
    merchantVpa: '9348781833@bank',
    amount: 500.00,
    status: 'Success',
    customerVpa: 'customer1@paytm',
    payerVpa: 'customer1@paytm',
    createdDate: '2026-04-11T09:30:00Z',
    timestamp: '2026-04-11T09:30:00Z'
  },
  {
    id: 2,
    transactionId: 'TXN20260411002',
    txnId: 'TXN20260411002',
    vpaAddress: '9348781833@bank',
    merchantVpa: '9348781833@bank',
    amount: 1200.00,
    status: 'Success',
    customerVpa: 'buyer@oksbi',
    payerVpa: 'buyer@oksbi',
    createdDate: '2026-04-11T10:15:00Z',
    timestamp: '2026-04-11T10:15:00Z'
  },
  {
    id: 3,
    transactionId: 'TXN20260411003',
    txnId: 'TXN20260411003',
    vpaAddress: 'merchant.shop@cboi',
    merchantVpa: 'merchant.shop@cboi',
    amount: 750.00,
    status: 'Success',
    customerVpa: 'user@ybl',
    payerVpa: 'user@ybl',
    createdDate: '2026-04-11T11:45:00Z',
    timestamp: '2026-04-11T11:45:00Z'
  },
  {
    id: 4,
    transactionId: 'TXN20260411004',
    txnId: 'TXN20260411004',
    vpaAddress: '9348781833@bank',
    merchantVpa: '9348781833@bank',
    amount: 300.00,
    status: 'Pending',
    customerVpa: 'test@paytm',
    payerVpa: 'test@paytm',
    createdDate: '2026-04-11T12:20:00Z',
    timestamp: '2026-04-11T12:20:00Z'
  },
  {
    id: 5,
    transactionId: 'TXN20260411005',
    txnId: 'TXN20260411005',
    vpaAddress: '9348781833@bank',
    merchantVpa: '9348781833@bank',
    amount: 150.00,
    status: 'Failed',
    customerVpa: 'failed@icici',
    payerVpa: 'failed@icici',
    createdDate: '2026-04-11T13:00:00Z',
    timestamp: '2026-04-11T13:00:00Z'
  }
];

export const mockLanguages = [
  {
    id: 1,
    languageName: 'Hindi',
    name: 'Hindi',
    languageCode: 'HI',
    code: 'HI'
  },
  {
    id: 2,
    languageName: 'English',
    name: 'English',
    languageCode: 'EN',
    code: 'EN'
  },
  {
    id: 3,
    languageName: 'Tamil',
    name: 'Tamil',
    languageCode: 'TA',
    code: 'TA'
  },
  {
    id: 4,
    languageName: 'Telugu',
    name: 'Telugu',
    languageCode: 'TE',
    code: 'TE'
  },
  {
    id: 5,
    languageName: 'Kannada',
    name: 'Kannada',
    languageCode: 'KN',
    code: 'KN'
  },
  {
    id: 6,
    languageName: 'Malayalam',
    name: 'Malayalam',
    languageCode: 'ML',
    code: 'ML'
  },
  {
    id: 7,
    languageName: 'Bengali',
    name: 'Bengali',
    languageCode: 'BN',
    code: 'BN'
  },
  {
    id: 8,
    languageName: 'Marathi',
    name: 'Marathi',
    languageCode: 'MR',
    code: 'MR'
  }
];

export const mockCurrentLanguage = mockLanguages[0]; // Default to Hindi

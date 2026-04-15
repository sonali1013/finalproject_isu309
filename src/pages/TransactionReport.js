import React, { useState, useEffect, useCallback } from 'react';
import { merchantService } from '../services/merchantService';
import Loader from '../components/Loader';
import './TransactionReport.css';

const STORED_VPA_KEY = 'dashboard:selected_vpa';

const MONTHLY_REPORT_OPTIONS = [
  { value: '1', label: 'Last Month Report' },
  { value: '3', label: 'Last 3 Months Report' },
  { value: '6', label: 'Last 6 Months Report' }
];

/** Format a Date object to DD/MM/YYYY (API date format) */
const toApiDate = (date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

/** Format a Date to YYYY-MM-DD (HTML input[type=date] value) */
const toInputDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Parse YYYY-MM-DD string as local date (avoids UTC off-by-one) */
const parseLocalDate = (str) => {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatAmount = (value) => {
  if (value == null) {
    return '-';
  }

  const numeric = Number(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  const hasDecimal = !Number.isInteger(numeric);
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: hasDecimal ? 2 : 0
  }).format(numeric);
};

const parseMaybeJson = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const toLookupKey = (key) => String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getFieldValue = (source, keys) => {
  if (!source || typeof source !== 'object') {
    return undefined;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] != null && source[key] !== '') {
      return source[key];
    }
  }

  const normalizedMap = new Map(
    Object.entries(source).map(([k, v]) => [toLookupKey(k), v])
  );

  for (const key of keys) {
    const normalized = normalizedMap.get(toLookupKey(key));
    if (normalized != null && normalized !== '') {
      return normalized;
    }
  }

  return undefined;
};

const extractTransactionRows = (apiResponse) => {
  const parsedRoot = parseMaybeJson(apiResponse);
  const candidates = [
    parsedRoot,
    parsedRoot?.data,
    parsedRoot?.transactions,
    parsedRoot?.result,
    parsedRoot?.data?.data,
    parsedRoot?.response?.data
  ];

  for (const candidate of candidates) {
    const parsedCandidate = parseMaybeJson(candidate);
    if (Array.isArray(parsedCandidate)) {
      return parsedCandidate;
    }
  }

  return [];
};

const normalizeTransactionRecord = (record, index) => {
  const merchantVpa = getFieldValue(record, ['merchantVpa', 'vpaAddress', 'vpa_id', 'merchant_vpa', 'merchantVPA', 'MERCHANT VPA', 'MERCHANT_VPA']);
  const customerVpa = getFieldValue(record, ['customerVpa', 'payerVpa', 'payer_vpa', 'customer_vpa', 'CUSTOMER VPA', 'CUSTOMER_VPA']);
  const amountValue = getFieldValue(record, ['amount', 'txnAmount', 'transactionAmount', 'amt', 'AMOUNT', 'AMOUNT (INR)', 'amount_inr']);
  const amountNumber = Number(amountValue);

  return {
    id: getFieldValue(record, ['id', 'txnId', 'transactionId']) || index,
    createdDate: getFieldValue(record, ['createdDate', 'timestamp', 'dateTime', 'transactionDate', 'txnDate', 'created_date', 'DATE & TIME', 'DATE_TIME']) || '-',
    transactionId: getFieldValue(record, ['transactionId', 'txnId', 'transaction_id', 'TRANSACTION ID', 'TRANSACTION_ID', 'rrn', 'RRN', 'utr', 'UTR']) || '-',
    merchantVpa: merchantVpa || '-',
    customerVpa: customerVpa || '-',
    amountDisplay: Number.isFinite(amountNumber)
      ? amountNumber.toFixed(2)
      : (amountValue != null && String(amountValue).trim() ? String(amountValue) : '-'),
    status: getFieldValue(record, ['status', 'txnStatus', 'transactionStatus', 'txn_status', 'STATUS']) || '-',
    raw: record
  };
};

const TransactionReport = () => {
  const today = new Date();

  const [filterType, setFilterType] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);
  const [selectedMonthlyReport, setSelectedMonthlyReport] = useState('1');

  const [storedVpa, setStoredVpa] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPageInput, setGoToPageInput] = useState('1');

  const doFetch = useCallback(async ({ startDate, endDate, vpa }) => {
    const vpaId = vpa?.vpaId || vpa?.vpaAddress || vpa?.upiId;
    if (!vpaId) {
      setError('No VPA selected. Please go to Dashboard and select a VPA first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiResponse = await merchantService.queryReport({ startDate, endDate, vpaId, mode: 'stream' });
      console.log('Transaction report API response:', apiResponse);
      console.log('Transaction report data param:', apiResponse?.data);

      const list = extractTransactionRows(apiResponse).map(normalizeTransactionRecord);
      console.log('Transaction report normalized rows:', list);
      setTransactions(list);
    } catch (err) {
      setError(err?.message || 'Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: load VPA from sessionStorage and auto-fetch today
  useEffect(() => {
    const raw = sessionStorage.getItem(STORED_VPA_KEY);
    if (!raw) return;
    try {
      const vpa = JSON.parse(raw);
      setStoredVpa(vpa);
      const t = new Date();
      doFetch({ startDate: toApiDate(t), endDate: toApiDate(t), vpa });
    } catch {}
  }, [doFetch]);

  const getDateRange = () => {
    if (filterType === 'today') {
      const t = new Date();
      return { startDate: toApiDate(t), endDate: toApiDate(t) };
    }
    if (filterType === 'monthly') {
      const monthsToInclude = Number(selectedMonthlyReport);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      const start = new Date(end.getFullYear(), end.getMonth() - (monthsToInclude - 1), 1);
      return { startDate: toApiDate(start), endDate: toApiDate(end) };
    }
    return { startDate: toApiDate(customStartDate), endDate: toApiDate(customEndDate) };
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    if (type === 'today') {
      const t = new Date();
      doFetch({ startDate: toApiDate(t), endDate: toApiDate(t), vpa: storedVpa });
    }
  };

  const handleApplyFilter = () => {
    const { startDate, endDate } = getDateRange();
    doFetch({ startDate, endDate, vpa: storedVpa });
  };

  const handleDownloadAll = async () => {
    const vpaId = storedVpa?.vpaId || storedVpa?.vpaAddress || storedVpa?.upiId;
    if (!vpaId) {
      alert('No VPA selected. Please go to Dashboard and select a VPA first.');
      return;
    }
    const { startDate, endDate } = getDateRange();
    setDownloading(true);
    try {
      const blob = await merchantService.downloadReport({ startDate, endDate, vpaId });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${startDate.replace(/\//g, '-')}_to_${endDate.replace(/\//g, '-')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  const filteredTransactions = transactions.filter((txn) => {
    if (!searchText.trim()) return true;
    const s = searchText.toLowerCase();
    return (
      (txn.transactionId || '').toLowerCase().includes(s) ||
      (txn.merchantVpa || '').toLowerCase().includes(s) ||
      (txn.customerVpa || '').toLowerCase().includes(s) ||
      String(txn.amountDisplay || '').includes(s) ||
      (txn.status || '').toLowerCase().includes(s)
    );
  });

  useEffect(() => {
    setCurrentPage(1);
    setGoToPageInput('1');
  }, [searchText, rowsPerPage, transactions]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * rowsPerPage;
  const paginatedTransactions = filteredTransactions.slice(pageStartIndex, pageStartIndex + rowsPerPage);

  const getVisiblePages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const pages = new Set([1, totalPages, safeCurrentPage, safeCurrentPage - 1, safeCurrentPage + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  };

  const visiblePages = getVisiblePages();

  const handleGoToPage = () => {
    const page = Number(goToPageInput);
    if (!Number.isFinite(page)) {
      return;
    }

    const nextPage = Math.min(Math.max(1, Math.trunc(page)), totalPages);
    setCurrentPage(nextPage);
    setGoToPageInput(String(nextPage));
  };

  const getFilterDescription = () => {
    if (filterType === 'today') return "Show today's transactions";
    if (filterType === 'monthly') {
      const selected = MONTHLY_REPORT_OPTIONS.find((item) => item.value === selectedMonthlyReport);
      return selected ? `Show ${selected.label}` : 'Show monthly transactions';
    }
    const sd = toApiDate(customStartDate).replace(/\//g, '-');
    const ed = toApiDate(customEndDate).replace(/\//g, '-');
    return `Show transactions from ${sd} to ${ed}`;
  };

  return (
    <div className="transaction-report">
      <h2 className="tr-page-title">Transaction Reports</h2>

      {/* Filter Card */}
      <div className="tr-card">
        <p className="tr-filter-label">Select a Report Filter</p>
        <div className="tr-radio-group">
          {[
            { value: 'today', label: 'Today' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'custom', label: 'Custom Range' }
          ].map(({ value, label }) => (
            <label key={value} className="tr-radio-option">
              <input
                type="radio"
                name="filterType"
                value={value}
                checked={filterType === value}
                onChange={() => handleFilterChange(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {filterType === 'monthly' && (
          <div className="tr-date-row tr-monthly-row">
            <div className="tr-date-group">
              <label>Select Month</label>
              <select
                className="tr-monthly-select"
                value={selectedMonthlyReport}
                onChange={(e) => setSelectedMonthlyReport(e.target.value)}
              >
                {MONTHLY_REPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <button className="tr-apply-btn" onClick={handleApplyFilter}>Submit</button>
          </div>
        )}

        {filterType === 'custom' && (
          <div className="tr-date-row">
            <div className="tr-date-group">
              <label>Start Date</label>
              <input
                type="date"
                max={toInputDate(today)}
                value={toInputDate(customStartDate)}
                onChange={(e) => setCustomStartDate(parseLocalDate(e.target.value))}
              />
            </div>
            <div className="tr-date-group">
              <label>End Date</label>
              <input
                type="date"
                min={toInputDate(customStartDate)}
                max={toInputDate(today)}
                value={toInputDate(customEndDate)}
                onChange={(e) => setCustomEndDate(parseLocalDate(e.target.value))}
              />
            </div>
            <button className="tr-apply-btn" onClick={handleApplyFilter}>Submit</button>
          </div>
        )}

        <p className="tr-filter-desc">{getFilterDescription()}</p>
      </div>

      <div className="tr-card tr-results-card">
        <div className="tr-results-header">
          <input
            type="text"
            className="tr-search-input"
            placeholder="Search here..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button
            className="tr-download-btn"
            onClick={handleDownloadAll}
            disabled={downloading || filteredTransactions.length === 0}
          >
            {downloading ? 'Downloading...' : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download All
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <Loader text="Loading transactions..." fullPage={false} />
        ) : error ? (
          <div className="tr-status-center">
            <p className="tr-error-msg">{error}</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <p className="tr-no-results">No results found</p>
        ) : (
          <div className="tr-table-wrap">
            <table className="tr-table">
              <thead>
                <tr>
                  <th>S. No.</th>
                  <th>Transaction ID</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((txn, rowIndex) => (
                  <tr key={txn.id || txn.transactionId || rowIndex}>
                    <td>{pageStartIndex + rowIndex + 1}</td>
                    <td className="tr-txn-id">{txn.transactionId}</td>
                    <td className="tr-amount">{formatAmount(txn.amountDisplay)}</td>
                    <td>{txn.createdDate}</td>
                    <td>
                      <span className={`tr-badge tr-badge--${(txn.status || '').toLowerCase()}`}>
                        {txn.status || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="tr-pagination">
              <div className="tr-pagination-left">
                <span>Row per page</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="tr-page-size"
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <span>Go to</span>
                <input
                  className="tr-goto-input"
                  type="number"
                  min="1"
                  max={totalPages}
                  value={goToPageInput}
                  onChange={(e) => setGoToPageInput(e.target.value)}
                  onBlur={handleGoToPage}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGoToPage();
                    }
                  }}
                />
              </div>

              <div className="tr-pagination-right">
                <button
                  type="button"
                  className="tr-page-btn"
                  disabled={safeCurrentPage === 1}
                  onClick={() => {
                    const nextPage = Math.max(1, safeCurrentPage - 1);
                    setCurrentPage(nextPage);
                    setGoToPageInput(String(nextPage));
                  }}
                >
                  {'<'}
                </button>

                {visiblePages.map((page, idx) => {
                  const prev = visiblePages[idx - 1];
                  const showEllipsis = idx > 0 && page - prev > 1;

                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="tr-ellipsis">...</span>}
                      <button
                        type="button"
                        className={`tr-page-btn ${page === safeCurrentPage ? 'is-active' : ''}`}
                        onClick={() => {
                          setCurrentPage(page);
                          setGoToPageInput(String(page));
                        }}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

                <button
                  type="button"
                  className="tr-page-btn"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => {
                    const nextPage = Math.min(totalPages, safeCurrentPage + 1);
                    setCurrentPage(nextPage);
                    setGoToPageInput(String(nextPage));
                  }}
                >
                  {'>'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionReport;

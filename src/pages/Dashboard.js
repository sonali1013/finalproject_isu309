import React, { useState, useEffect, useCallback } from 'react';
import { merchantService } from '../services/merchantService';
import { authService } from '../services/authService';
import Loader from '../components/Loader';
import './Dashboard.css';

const STORED_VPA_KEY = 'dashboard:selected_vpa';



const toNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '');
    if (!normalized) {
      return 0;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};



const mergeSelectedVpaDetails = (selectedVpa, response, metrics) => {
  const details = [response?.data, response?.body, response?.result, response]
    .find((value) => value && !Array.isArray(value) && typeof value === 'object');

  return {
    ...selectedVpa,
    ...(details || {}),
    totalTransactions: metrics.totalTransactions,
    totalAmount: metrics.totalAmount
  };
};

const Dashboard = () => {
  const [vpas, setVpas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVpa, setSelectedVpa] = useState(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [showMetrics, setShowMetrics] = useState(false);
  const [transactionMetrics, setTransactionMetrics] = useState({
    totalTransactions: 0,
    totalAmount: 0
  });

  const fetchVPAs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await authService.getUser();
      const preferredUsername = authService.getStoredPreferredUsername();

      if (!preferredUsername) {
        throw new Error('preferred_username was not found after decoding the Authentik token.');
      }

      console.log('Fetching VPAs with preferred_username:', preferredUsername);
      const response = await merchantService.fetchById(preferredUsername);
      console.log('VPA API response:', response);

      // Handle different response structures
      let vpaList = [];
      if (Array.isArray(response)) {
        vpaList = response;
      } else if (response?.data && Array.isArray(response.data)) {
        vpaList = response.data;
      } else if (response?.body && Array.isArray(response.body)) {
        vpaList = response.body;
      } else if (response?.result && Array.isArray(response.result)) {
        vpaList = response.result;
      }

      console.log('Dashboard decoded VPA list count:', vpaList.length);

      setVpas(vpaList);

      const storedVpa = sessionStorage.getItem(STORED_VPA_KEY);
      if (storedVpa) {
        try {
          const parsed = JSON.parse(storedVpa);
          setSelectedVpa(parsed);
          setTransactionMetrics({
            totalTransactions: 0,
            totalAmount: 0
          });
          setIsSelectorOpen(false);
          setShowMetrics(true);
        } catch {
          setSelectedVpa(null);
          setTransactionMetrics({ totalTransactions: 0, totalAmount: 0 });
          setIsSelectorOpen(vpaList.length > 0);
        }
      } else {
        setSelectedVpa(null);
        setTransactionMetrics({ totalTransactions: 0, totalAmount: 0 });
        setIsSelectorOpen(vpaList.length > 0);
      }
    } catch (err) {
      console.error('Error fetching VPAs:', err);
      console.error('Error details:', err.response?.data || err.message);

      let errorMessage = 'Failed to load VPA list. Please try again.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVPAs();
  }, [fetchVPAs]);

  useEffect(() => {
    if (!selectedVpa || !showMetrics) return;

    const fetchMetrics = async () => {
      try {
        const endDateObj = new Date();
        const startDateObj = new Date();
        if (dateFilter === 'week') {
          startDateObj.setDate(startDateObj.getDate() - 7);
        }

        const formatDate = (date) => {
          const d = String(date.getDate()).padStart(2, '0');
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const y = date.getFullYear();
          return `${d}/${m}/${y}`;
        };

        const startDate = formatDate(startDateObj);
        const endDate = formatDate(endDateObj);
        const vpaId = selectedVpa.vpaId || selectedVpa.vpaAddress || selectedVpa.upiId;

        const response = await merchantService.queryReport({
          startDate,
          endDate,
          vpaId,
          mode: 'both'
        });

        const rowCount = toNumber(response?.row_count ?? response?.data?.row_count) || 0;
        const totalAmt = toNumber(response?.total_amount ?? response?.data?.total_amount) || 0;

        setTransactionMetrics({
          totalTransactions: rowCount,
          totalAmount: totalAmt
        });
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
      }
    };

    fetchMetrics();
  }, [selectedVpa, dateFilter, showMetrics]);

  const handleRefresh = () => {
    fetchVPAs();
  };

  const handleCancelSelection = () => {
    const storedVpa = sessionStorage.getItem(STORED_VPA_KEY);
    if (storedVpa) {
      try {
        const parsed = JSON.parse(storedVpa);
        setSelectedVpa(parsed);
        setIsSelectorOpen(false);
        setTransactionMetrics({
          totalTransactions: toNumber(parsed.totalTransactions),
          totalAmount: toNumber(parsed.totalAmount)
        });
        setShowMetrics(true);
        return;
      } catch { }
    }
    setSelectedVpa(null);
    setIsSelectorOpen(false);
    setTransactionMetrics({ totalTransactions: 0, totalAmount: 0 });
    setShowMetrics(false);
  };

  const handleProceedSelection = async () => {
    if (!selectedVpa) {
      return;
    }

    try {
      const vpaId = selectedVpa.vpaId || selectedVpa.vpaAddress || selectedVpa.upiId;
      console.log('Fetching details for VPA ID:', vpaId);

      const response = await merchantService.fetchByVpaId(vpaId);
      const enrichedSelectedVpa = mergeSelectedVpaDetails(selectedVpa, response, { totalTransactions: 0, totalAmount: 0 });

      setSelectedVpa(enrichedSelectedVpa);
      setTransactionMetrics({ totalTransactions: 0, totalAmount: 0 });
      sessionStorage.setItem(STORED_VPA_KEY, JSON.stringify(enrichedSelectedVpa));
      setIsSelectorOpen(false);
      setShowMetrics(true);
    } catch (err) {
      console.error('Error fetching VPA details:', err);
    }
  };

  const handleVpaIdClick = () => {
    setTransactionMetrics({ totalTransactions: 0, totalAmount: 0 });
    setShowMetrics(false);
    setIsSelectorOpen(true);
  };

  if (loading) {
    return (
      <div className="dashboard">
        <Loader text="Loading VPAs..." fullPage={false} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={handleRefresh} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {!showMetrics ? (
        <>
          <div className="page-header">
            <h2>Dashboard</h2>
            <div className="page-actions">
              <button onClick={() => setIsSelectorOpen(true)} className="select-vpa-btn">
                Select VPA
              </button>
              <button onClick={handleRefresh} className="refresh-btn">
                Refresh
              </button>
            </div>
          </div>

          {vpas.length === 0 ? (
            <div className="empty-state">
              <p>No VPAs found</p>
            </div>
          ) : (
            <div className="dashboard-content">
              {isSelectorOpen && (
                <div className="vpa-modal-overlay">
                  <div className="vpa-modal">
                    <div className="vpa-modal-header">
                      <h3>Select VPA</h3>
                    </div>
                    <div className="vpa-modal-body">
                      <p className="vpa-subtitle">Select a VPA to proceed</p>
                      <div className="vpa-selector-list">
                        {vpas.map((vpa, index) => (
                          <div
                            key={vpa.id || index}
                            className={`vpa-option ${selectedVpa?.id === vpa.id ? 'selected' : ''}`}
                            onClick={() => setSelectedVpa(vpa)}
                          >
                            <div className="vpa-radio-indicator" aria-hidden="true">
                              <span className="vpa-radio-dot"></span>
                            </div>
                            <div className="vpa-option-content">
                              <h4>{vpa.vpaId || vpa.vpaAddress || vpa.upiId || 'N/A'}</h4>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="vpa-modal-footer">
                      <button type="button" className="cancel-btn" onClick={handleCancelSelection}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="proceed-btn"
                        onClick={handleProceedSelection}
                        disabled={!selectedVpa}
                      >
                        Proceed
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </>
      ) : (
        <div className="metrics-dashboard">
          <div className="dashboard-header">
            <div className="dashboard-title">
              <h2>Dashboard</h2>
              <p className="vpa-id-display">
                VPA ID : <span className="vpa-link" onClick={handleVpaIdClick}>{selectedVpa.vpaId || selectedVpa.vpaAddress || selectedVpa.upiId}</span>
              </p>
            </div>
            <div className="dashboard-filters">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="date-filter-select"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>

              </select>
            </div>
          </div>

          <div className="metrics-container">
            <div className="metric-card">
              <div className="metric-icon transaction-icon">
                <span>⇄</span>
              </div>
              <div className="metric-content">
                <p className="metric-label">Total No Of Transaction</p>
              </div>
              <p className="metric-value">
                {transactionMetrics?.totalTransactions || 0}
              </p>
            </div>

            <div className="metric-card">
              <div className="metric-icon amount-icon">
                <span>💵</span>
              </div>
              <div className="metric-content">
                <p className="metric-label">Total Amount</p>
              </div>
              <p className="metric-value">
                {transactionMetrics?.totalAmount ? transactionMetrics.totalAmount.toLocaleString('en-IN') : 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

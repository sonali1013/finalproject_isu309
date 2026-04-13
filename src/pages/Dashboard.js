import React, { useState, useEffect, useCallback } from 'react';
import { merchantService } from '../services/merchantService';
import { authService } from '../services/authService';
import './Dashboard.css';

const STORED_VPA_KEY = 'dashboard:selected_vpa';

const Dashboard = () => {
  const [vpas, setVpas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVpa, setSelectedVpa] = useState(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [showMetrics, setShowMetrics] = useState(false);
  const transactionMetrics = {
    totalTransactions: 0,
    totalAmount: 0
  };

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
          setIsSelectorOpen(false);
          setShowMetrics(true);
        } catch {
          setSelectedVpa(null);
          setIsSelectorOpen(vpaList.length > 0);
        }
      } else {
        setSelectedVpa(null);
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
        setShowMetrics(true);
        return;
      } catch {}
    }
    setSelectedVpa(null);
    setIsSelectorOpen(false);
    setShowMetrics(false);
  };

  const handleProceedSelection = async () => {
    if (!selectedVpa) {
      return;
    }

    try {
      const vpaId = selectedVpa.vpaId || selectedVpa.vpaAddress || selectedVpa.upiId;
      console.log('Fetching details for VPA ID:', vpaId);
      
      await merchantService.fetchByVpaId(vpaId);
      
      sessionStorage.setItem(STORED_VPA_KEY, JSON.stringify(selectedVpa));
      setIsSelectorOpen(false);
      setShowMetrics(true);
    } catch (err) {
      console.error('Error fetching VPA details:', err);
    }
  };

  const handleVpaIdClick = () => {
    setShowMetrics(false);
    setIsSelectorOpen(true);
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading VPAs...</p>
        </div>
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
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          <div className="metrics-container">
            <div className="metric-card">
              <div className="metric-icon transaction-icon">
                <span>↔</span>
              </div>
              <div className="metric-content">
                <p className="metric-label">Total No Of Transaction</p>
              </div>
              <p className="metric-value">{transactionMetrics.totalTransactions}</p>
            </div>

            <div className="metric-card">
              <div className="metric-icon amount-icon">
                <span>₹</span>
              </div>
              <div className="metric-content">
                <p className="metric-label">Total Amount</p>
              </div>
              <p className="metric-value">{transactionMetrics.totalAmount}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

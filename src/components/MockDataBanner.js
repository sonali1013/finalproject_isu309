import React from 'react';
import './MockDataBanner.css';

const MockDataBanner = () => {
  const useMockData = process.env.REACT_APP_USE_MOCK_DATA === 'true';

  if (!useMockData) {
    return null;
  }

  return (
    <div className="mock-data-banner">
      <div className="banner-content">
        <span className="banner-icon">⚠️</span>
        <div className="banner-text">
          <strong>Development Mode:</strong> Using mock data. 
          Real API at <code>api-uat.isupay.in</code> is not accessible.
        </div>
        <div className="banner-hint">
          To use real API, update <code>REACT_APP_API_BASE_URL</code> in <code>.env</code> 
          and set <code>REACT_APP_USE_MOCK_DATA=false</code>
        </div>
      </div>
    </div>
  );
};

export default MockDataBanner;

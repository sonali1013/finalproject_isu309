import React, { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { merchantService } from '../services/merchantService';
import { authService } from '../services/authService';
import './QRCode.css';

const LOADER_LOGO_URL = 'https://merchant-cboi-uat.isupay.in/images/loaderLogo-BvMsb5iC.png';

const QRCodePage = () => {
  const [qrType, setQrType] = useState('static');
  const [showQrPreview, setShowQrPreview] = useState(true);
  const [submitMessage, setSubmitMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVpa, setSelectedVpa] = useState(null);
  const [qrBase64, setQrBase64] = useState(null);
  const [qrValue, setQrValue] = useState('');
  const [dynamicAmount, setDynamicAmount] = useState('');

  const extractVpaList = (response) => {
    if (Array.isArray(response)) {
      return response;
    }
    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (response?.body && Array.isArray(response.body)) {
      return response.body;
    }
    if (response?.result && Array.isArray(response.result)) {
      return response.result;
    }
    return [];
  };

  const normalizeBase64Image = (value) => {
    if (!value || typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('data:image')) {
      return trimmed;
    }

    return `data:image/png;base64,${trimmed}`;
  };

  const generateQrFromVpa = async (vpa) => {
    const qrString = vpa?.qrString || vpa?.qr_string || '';
    if (!qrString) {
      throw new Error('QR string is not available for selected VPA.');
    }

    const conversionResponse = await merchantService.convertToQRBase64(qrString);
    console.log('convertToQRBase64 response:', conversionResponse);
    const base64Candidate = conversionResponse?.data
      || conversionResponse?.qrBase64
      || conversionResponse?.base64
      || conversionResponse?.qr_base64
      || conversionResponse?.imageBase64;

    setQrBase64(normalizeBase64Image(base64Candidate));
    setQrValue(qrString);
  };

  const initializeQrPage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await authService.getUser();
      const preferredUsername = authService.getStoredPreferredUsername();

      if (!preferredUsername) {
        throw new Error('preferred_username was not found after decoding the Authentik token.');
      }

      const vpaResponse = await merchantService.fetchById(preferredUsername);
      console.log('fetchById response:', vpaResponse);
      const vpaList = extractVpaList(vpaResponse);

      if (!vpaList.length) {
        throw new Error('No VPA found for this user.');
      }

      const initialVpa = vpaList.find((item) => item?.qrString || item?.qr_string) || vpaList[0];
      setSelectedVpa(initialVpa);
      await generateQrFromVpa(initialVpa);
    } catch (err) {
      console.error('Error initializing QR page:', err);
      setError(err.message || 'Failed to load QR details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeQrPage();
  }, [initializeQrPage]);

  const handleQrTypeChange = (event) => {
    const selectedType = event.target.value;
    setQrType(selectedType);
    setSubmitMessage('');

    if (selectedType === 'static') {
      setShowQrPreview(true);
      return;
    }

    setShowQrPreview(false);
  };

  const handleDynamicGenerate = (event) => {
    event.preventDefault();
    const amount = dynamicAmount.trim();
    const amountNumber = Number(amount);

    if (!amount || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      setSubmitMessage('Please enter a valid amount greater than 0.');
      return;
    }

    const vpaId = selectedVpa?.vpaId || selectedVpa?.vpaAddress || selectedVpa?.upiId;
    const merchantName = selectedVpa?.merchantName || 'Merchant';
    if (!vpaId) {
      setSubmitMessage('VPA is not available for this merchant.');
      return;
    }

    const dynamicQrString = `upi://pay?pa=${encodeURIComponent(vpaId)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR`;
    setQrBase64(null);
    setQrValue(dynamicQrString);
    setShowQrPreview(true);
    setSubmitMessage('Dynamic QR generated successfully.');
  };

  const handleDownloadQR = () => {
    const qrElement = document.querySelector('.qr-code-box');
    if (!qrElement) {
      alert('QR code is not available for download.');
      return;
    }

    const canvas = qrElement.querySelector('canvas') || qrElement.querySelector('img');
    if (!canvas) {
      alert('Unable to capture QR code.');
      return;
    }

    const link = document.createElement('a');
    if (canvas.tagName === 'IMG') {
      link.href = canvas.src;
    } else {
      link.href = canvas.toDataURL('image/png');
    }

    const vpaId = selectedVpa?.vpaId || selectedVpa?.vpaAddress || selectedVpa?.upiId || 'QR';
    link.download = `QR_${vpaId}_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = () => {
    if (!selectedVpa) {
      alert('Please select a VPA first.');
      return;
    }

    alert(`QR Code submitted for VPA: ${selectedVpa?.vpaId || selectedVpa?.vpaAddress || 'Unknown'}`);
  };

  return (
    <div className="qr-page">
      <h2 className="qr-page-title">QR Details</h2>

      <div className="qr-type-card">
        <div className="qr-type-left">
          <p className="qr-type-card-label">Select The Type of QR</p>
          <div className="qr-type-options-row">
            <div className="qr-type-options">
              <label className="qr-type-option">
                <input
                  type="radio"
                  name="qrType"
                  value="static"
                  checked={qrType === 'static'}
                  onChange={handleQrTypeChange}
                />
                <span>Static</span>
              </label>
              <label className="qr-type-option">
                <input
                  type="radio"
                  name="qrType"
                  value="dynamic"
                  checked={qrType === 'dynamic'}
                  onChange={handleQrTypeChange}
                />
                <span>Dynamic</span>
              </label>
            </div>
            <button className="qr-submit-top-btn" onClick={handleSubmit}>Submit</button>
          </div>

          {qrType === 'dynamic' && (
            <form className="qr-dynamic-form" onSubmit={handleDynamicGenerate}>
              <p className="qr-dynamic-help">Enter an amount to instantly generate your dynamic QR code</p>
              <div className="qr-dynamic-field">
                <label htmlFor="dynamicAmount">Amount to be collected</label>
                <div className="qr-dynamic-controls">
                  <input
                    id="dynamicAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={dynamicAmount}
                    onChange={(event) => setDynamicAmount(event.target.value)}
                    placeholder="Enter the amount to be collected"
                  />
                  <button type="submit" className="qr-submit-btn">Generate QR</button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="qr-preview-panel">
        <p className="qr-type-label">QR Preview</p>
        {!showQrPreview ? (
          <p className="qr-status-text">{submitMessage || 'Generate Dynamic QR to show preview.'}</p>
        ) : loading ? (
          <div className="qr-loader-wrap">
            <img src={LOADER_LOGO_URL} alt="Loading" className="qr-loader-image" />
            <p className="qr-status-text">Loading QR details...</p>
          </div>
        ) : error ? (
          <p className="qr-status-text error">{error}</p>
        ) : (
          <div className="qr-card-layout">
            <div className="qr-branded-card">
              <div className="qr-card-inner">
                <img src="/cboi-logo.svg" alt="Central Bank of India" className="qr-bank-logo" />
                <p className="qr-merchant-name">{(selectedVpa?.merchantName || 'Merchant Name').toUpperCase()}</p>
                <p className="qr-scan-pay">Scan &amp; Pay</p>

                <div className="qr-code-box">
                  {qrBase64 ? (
                    <img src={qrBase64} alt="Merchant QR" className="qr-image" />
                  ) : (
                    <QRCodeSVG value={qrValue} size={185} includeMargin={false} level="H" />
                  )}
                </div>

                <p className="qr-vpa-line">
                  UPI Id: {selectedVpa?.vpaId || selectedVpa?.vpaAddress || selectedVpa?.upiId || 'N/A'}
                </p>

                <p className="qr-payment-title">BHIM / UPI</p>
                <div className="qr-wallet-row">
                  <span>Cent mZ</span>
                  <span>PhonePe</span>
                  <span>G Pay</span>
                </div>
                <div className="qr-wallet-row">
                  <span>CRED</span>
                  <span>navi</span>
                  <span>paytm</span>
                </div>
              </div>
            </div>
            <button className="qr-download-btn" onClick={handleDownloadQR}>Download QR</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodePage;

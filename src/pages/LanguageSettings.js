import React, { useState, useEffect, useRef } from 'react';
import { merchantService } from '../services/merchantService';
import Loader from '../components/Loader';
import './LanguageSettings.css';

const STORED_VPA_KEY = 'dashboard:selected_vpa';

const extractCurrentLanguageFromResponse = (response) => {
  const payload = response?.data ?? response?.message ?? response;

  if (typeof payload === 'string') {
    return { id: '', languageName: payload, name: payload };
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const languageName = payload.languageName
    || payload.name
    || payload.currentLanguage
    || payload.current_language
    || payload.language
    || payload.update_language
    || '';

  if (!languageName) {
    return null;
  }

  return {
    id: payload.id || payload.languageId || payload.language_id || payload.code || '',
    languageName,
    name: languageName,
    code: payload.code || payload.languageCode || payload.language_code || ''
  };
};

const normalizeLanguageOptions = (response) => {
  const payload = response?.data ?? response?.languages ?? response?.message ?? response;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.languages)
      ? payload.languages
      : [];

  return list
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: String(index + 1),
          languageName: item,
          name: item,
          code: ''
        };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const languageName = item.languageName
        || item.name
        || item.language
        || item.update_language
        || item.label
        || '';

      if (!languageName) {
        return null;
      }

      return {
        id: String(item.id || item.languageId || item.language_id || item.code || item.value || index + 1),
        languageName,
        name: languageName,
        code: item.code || item.languageCode || item.language_code || ''
      };
    })
    .filter(Boolean);
};

const LanguageSettings = () => {
  const [currentLanguage, setCurrentLanguage] = useState(null);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Language update request Initiated Successfully');
  const [selectedVpa, setSelectedVpa] = useState(null);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef(null);

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!languageDropdownRef.current) {
        return;
      }

      if (!languageDropdownRef.current.contains(event.target)) {
        setIsLanguageDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const initialize = async () => {
    try {
      setLoading(true);
      setError(null);

      let parsedVpa = null;

      const rawVpa = sessionStorage.getItem(STORED_VPA_KEY);
      if (rawVpa) {
        try {
          parsedVpa = JSON.parse(rawVpa);
          setSelectedVpa(parsedVpa);
        } catch {
          parsedVpa = null;
          setSelectedVpa(null);
        }
      }
      
      const serialFromVpa = parsedVpa?.serialNumber || parsedVpa?.serial_number || parsedVpa?.terminalId || parsedVpa?.terminal_id;
      await fetchCurrentLanguage(serialFromVpa);
    } catch (err) {
      console.error('Error initializing:', err);
      setError(err?.message || 'Failed to load language settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentLanguage = async (tidParam) => {
    try {
      const normalizedTid = typeof tidParam === 'string' ? tidParam.trim() : String(tidParam || '').trim();
      if (!normalizedTid) {
        throw new Error('Device serial number not found for current language API call.');
      }

      const response = await merchantService.currentLanguage(normalizedTid);
      console.log('Step 1 currentLanguage response:', response);
      const language = extractCurrentLanguageFromResponse(response);
      if (!language) {
        throw new Error('Current language not found in API response.');
      }

      setCurrentLanguage(language);
    } catch (err) {
      console.error('Error fetching current language:', err);
      throw err;
    }
  };

  const ensureLanguagesLoaded = async () => {
    if (availableLanguages.length > 0 || languagesLoading) {
      return;
    }

    try {
      setLanguagesLoading(true);
      const response = await merchantService.fetchAllLanguage();
      const normalizedOptions = normalizeLanguageOptions(response);
      setAvailableLanguages(normalizedOptions);
    } catch (err) {
      console.error('Error fetching languages:', err);
      setError('Failed to fetch available languages. Please try again.');
    } finally {
      setLanguagesLoading(false);
    }
  };

  const handleUpdateLanguage = async () => {
    try {
      setUpdating(true);
      setError(null);
      setShowSuccessModal(false);

      if (!selectedLanguageId) {
        setError('Please select a language update option.');
        return;
      }

      const tid = selectedVpa?.serialNumber || selectedVpa?.serial_number || selectedVpa?.terminalId || selectedVpa?.terminal_id;
      const selectedLanguage = availableLanguages.find((item) => String(item.id) === String(selectedLanguageId));
      const languageName = selectedLanguage
        ? (selectedLanguage.languageName || selectedLanguage.name || '')
        : '';

      if (!tid) {
        setError('Device serial number not found.');
        return;
      }

      if (!languageName) {
        setError('Selected language name is missing.');
        return;
      }
      
      await merchantService.updateLanguage({
        tid: String(tid),
        updateLanguage: languageName
      });
      
      if (selectedLanguage) {
        setCurrentLanguage(selectedLanguage);
      }

      setSuccessMessage('Language update request Initiated Successfully');
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error updating language:', err);
      setError('Failed to update language. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setSelectedLanguageId('');
    setIsLanguageDropdownOpen(false);
    setError(null);
    setShowSuccessModal(false);
  };

  const getLanguageDisplayName = (language) => {
    if (typeof language === 'string') {
      return language;
    }

    if (!language) {
      return '';
    }

    return language.languageName || language.name || '';
  };

  const vpaDisplay = selectedVpa?.vpaId || selectedVpa?.vpaAddress || selectedVpa?.upiId || '-';
  const serialDisplay = selectedVpa?.serialNumber || selectedVpa?.serial_number || selectedVpa?.terminalId || selectedVpa?.terminal_id || '-';
  const selectedLanguage = availableLanguages.find((item) => String(item.id) === String(selectedLanguageId));
  const selectedLanguageLabel = selectedLanguage ? getLanguageDisplayName(selectedLanguage) : '';
  const currentLanguageLabel = getLanguageDisplayName(currentLanguage);
  const isSameLanguageSelected = !!selectedLanguageLabel
    && selectedLanguageLabel.toLowerCase() === currentLanguageLabel.toLowerCase();

  if (loading) {
    return (
      <div className="language-settings">
        <Loader text="Loading language settings..." fullPage={false} />
      </div>
    );
  }

  return (
    <div className="language-settings">
      <h2 className="lu-title">Language Update</h2>

      {error && (
        <div className="lu-error-banner">
          {error}
        </div>
      )}

      <div className="lu-card">
        <div className="lu-grid">
          <div className="lu-field">
            <label>VPA ID</label>
            <input type="text" value={vpaDisplay} readOnly />
          </div>

          <div className="lu-field">
            <label>Device Serial Number</label>
            <input type="text" value={serialDisplay} readOnly />
          </div>

          <div className="lu-field">
            <label>Current Language</label>
            <input type="text" value={getLanguageDisplayName(currentLanguage)} readOnly />
          </div>

          <div className="lu-field">
            <label>Language Update</label>
            <div className="lu-dropdown" ref={languageDropdownRef}>
              <button
                type="button"
                className={`lu-dropdown-trigger ${isLanguageDropdownOpen ? 'is-open' : ''}`}
                onClick={async () => {
                  await ensureLanguagesLoaded();
                  setIsLanguageDropdownOpen((prev) => !prev);
                }}
              >
                <span className={selectedLanguageLabel ? '' : 'is-placeholder'}>
                  {selectedLanguageLabel || 'Select Language Update'}
                </span>
                <span className="lu-dropdown-arrow">▾</span>
              </button>

              {isLanguageDropdownOpen && (
                <div className="lu-dropdown-menu" role="listbox" aria-label="Language Update options">
                  {languagesLoading && (
                    <div className="lu-dropdown-loading">Loading languages...</div>
                  )}
                  {availableLanguages.map((language) => {
                    const languageLabel = getLanguageDisplayName(language);
                    const isActive = selectedLanguageId
                      ? String(language.id) === String(selectedLanguageId)
                      : (
                        (currentLanguage?.id && String(language.id) === String(currentLanguage?.id))
                        || languageLabel.toLowerCase() === getLanguageDisplayName(currentLanguage).toLowerCase()
                      );

                    return (
                      <button
                        key={language.id}
                        type="button"
                        className={`lu-dropdown-option ${isActive ? 'is-active' : ''}`}
                        onClick={() => {
                          setSelectedLanguageId(String(language.id));
                          setShowSuccessModal(false);
                          setIsLanguageDropdownOpen(false);
                        }}
                      >
                        {languageLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lu-actions">
          <button
            type="button"
            className="lu-cancel-btn"
            onClick={handleCancel}
            disabled={updating}
          >
            Cancel
          </button>

          <button
            type="button"
            className="lu-update-btn"
            onClick={handleUpdateLanguage}
            disabled={updating || !selectedLanguageId || String(currentLanguage?.id) === String(selectedLanguageId) || isSameLanguageSelected}
          >
            {updating ? 'Updating...' : 'Update'}
          </button>
        </div>
      </div>

      {showSuccessModal && (
        <div className="lu-success-modal-overlay" role="dialog" aria-modal="true" aria-label="Language update success">
          <div className="lu-success-modal">
            <p className="lu-success-modal-message">{successMessage}</p>
            <div className="lu-success-icon-wrap">
              <span className="lu-success-check">✓</span>
            </div>
            <button
              type="button"
              className="lu-success-close-btn"
              onClick={() => setShowSuccessModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSettings;

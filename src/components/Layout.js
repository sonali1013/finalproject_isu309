import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { merchantService } from '../services/merchantService';
import MockDataBanner from './MockDataBanner';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [logoLoadError, setLogoLoadError] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileError, setProfileError] = React.useState('');
  const [deviceInfo, setDeviceInfo] = React.useState(null);
  const [supportOpen, setSupportOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    if (location.pathname.startsWith('/help-support')) {
      setSupportOpen(true);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    loadUser();
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setProfileModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authService.getUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    try {
      await authService.signOut();
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const getTokenPhone = () => {
    return user?.profile?.phone_number
      || user?.profile?.phone
      || user?.profile?.mobile_number
      || user?.profile?.mobile
      || '-';
  };

  const fetchDeviceInfo = async () => {
    const preferredUsername = authService.getStoredPreferredUsername()
      || user?.profile?.preferred_username
      || '';

    if (!preferredUsername) {
      setDeviceInfo(null);
      setProfileError('Preferred username not found in token.');
      return;
    }

    setProfileLoading(true);
    setProfileError('');

    try {
      const response = await merchantService.fetchById(preferredUsername);
      const firstRecord = Array.isArray(response?.data) ? response.data[0] : null;
      setDeviceInfo(firstRecord || null);
    } catch (error) {
      setDeviceInfo(null);
      setProfileError(error?.message || 'Unable to fetch profile details.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleViewProfile = async () => {
    setDropdownOpen(false);
    setProfileModalOpen(true);
    await fetchDeviceInfo();
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const fullNameFromParts = [user?.profile?.given_name, user?.profile?.family_name]
    .filter(Boolean)
    .join(' ');

  const displayName = user?.profile?.name
    || fullNameFromParts
    || user?.profile?.display_name
    || user?.profile?.nickname
    || user?.profile?.email
    || 'User';

  const usernameValue = authService.getStoredPreferredUsername()
    || user?.profile?.preferred_username
    || user?.profile?.user_name
    || user?.profile?.username
    || getTokenPhone();

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

  const avatarEmoji = user?.profile?.avatar_emoji || '🧑🏻';

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-bank-logo">
              {!logoLoadError ? (
                <img
                  src="/cboi-logo.svg"
                  alt="Central Bank of India"
                  className="bank-logo-image"
                  onError={() => setLogoLoadError(true)}
                />
              ) : (
                <>
                  <div className="bank-emblem" aria-hidden="true">?</div>
                  <div className="bank-text">
                    <p className="bank-hindi">सेन्ट्रल बैंक ऑफ इंडिया</p>
                    <p className="bank-english">Central Bank of India</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <button className="menu-toggle" type="button" aria-label="Menu">
            <span>☰</span>
          </button>
          <div className="top-right-user">
            <span className="username">{displayName}</span>
            <div className="avatar-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className="avatar-circle"
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-label="User menu"
              >
                {avatarEmoji || initials}
              </button>
              {dropdownOpen && (
                <div className="avatar-dropdown">
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={handleViewProfile}
                  >
                    View Profile
                  </button>
                  <button
                    type="button"
                    className="dropdown-item dropdown-item--logout"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <MockDataBanner />

      <div className="main-container">
        <nav className="sidebar">
          <ul className="nav-menu">
            <li className={isActive('/dashboard')}>
              <Link to="/dashboard"><span className="nav-icon">◷</span>Dashboard</Link>
            </li>
            <li className={isActive('/transactions')}>
              <Link to="/transactions"><span className="nav-icon">▤</span>Transaction Reports</Link>
            </li>
            <li className={isActive('/qr-code')}>
              <Link to="/qr-code"><span className="nav-icon">⌘</span>QR Details</Link>
            </li>
            <li className={isActive('/language')}>
              <Link to="/language"><span className="nav-icon">文</span>Language Update</Link>
            </li>
            <li className={`support-menu-item ${supportOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="support-item"
                onClick={() => setSupportOpen((prev) => !prev)}
                aria-expanded={supportOpen}
              >
                <span><span className="nav-icon">◌</span>Help &amp; Support</span>
                <span className="support-chevron">{supportOpen ? '⌃' : '⌄'}</span>
              </button>
              {supportOpen && (
                <ul className="support-submenu">
                  <li className={isActive('/help-support/raise-ticket')}>
                    <Link to="/help-support/raise-ticket" className="support-sub-item">
                      <span className="support-sub-icon">🎟</span>
                      <span>Raise Ticket</span>
                    </Link>
                  </li>
                  <li className={isActive('/help-support/view-tickets')}>
                    <Link to="/help-support/view-tickets" className="support-sub-item">
                      <span className="support-sub-icon">◔</span>
                      <span>View Tickets</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </nav>

        <main className="content">
          {children}
        </main>
      </div>

      {profileModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setProfileModalOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="profile-modal-title">View Profile Details</h2>

            <div className="profile-section">
              <h3>Basic Information</h3>
              <div className="profile-grid">
                <span className="profile-label">Name</span>
                <span className="profile-value">{displayName || '-'}</span>

                <span className="profile-label">Phone</span>
                <span className="profile-value">{usernameValue || '-'}</span>
              </div>
            </div>

            <div className="profile-section">
              <h3>Device Information</h3>
              {profileLoading ? (
                <p className="profile-status">Loading device details...</p>
              ) : profileError ? (
                <p className="profile-status profile-status-error">{profileError}</p>
              ) : (
                <div className="profile-grid">
                  <span className="profile-label">Device Serial Number</span>
                  <span className="profile-value">{deviceInfo?.serialNumber || '-'}</span>

                  <span className="profile-label">Linked Account Number</span>
                  <span className="profile-value">{deviceInfo?.merchantAccountNo || '-'}</span>

                  <span className="profile-label">UPI ID</span>
                  <span className="profile-value">{deviceInfo?.upiId || '-'}</span>

                  <span className="profile-label">IFSC Code</span>
                  <span className="profile-value">CBIN0200079</span>

                  <span className="profile-label">Device Mobile Number</span>
                  <span className="profile-value">{deviceInfo?.merchantMobile || '-'}</span>

                  <span className="profile-label">Network Type</span>
                  <span className="profile-value">-</span>

                  <span className="profile-label">Device Status</span>
                  <span className="profile-value">{deviceInfo?.status || '-'}</span>
                </div>
              )}
            </div>

            <div className="profile-modal-actions">
              <button type="button" className="profile-close-btn" onClick={() => setProfileModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;

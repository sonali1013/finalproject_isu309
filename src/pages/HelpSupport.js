import React from 'react';
import { useNavigate } from 'react-router-dom';
import { merchantService } from '../services/merchantService';
import './HelpSupport.css';
import Loader from '../components/Loader';

const RAISE_TICKET_CACHE_KEY = 'helpSupport:raiseTicketFormResponse';

const extractIssueTypeOptions = (response) => {
  const hits = response?.data?.hits
    || response?.hits
    || [];

  const formsFromHits = hits
    .flatMap((item) => item?._source?.forms || item?.forms || [])
    .filter(Boolean);

  const directForms = response?.data?.forms || response?.forms || [];
  const allForms = [...formsFromHits, ...(Array.isArray(directForms) ? directForms : [])];

  const ticketFields = allForms
    .flatMap((form) => form?.ticket_fields || form?.ticketFields || [])
    .filter(Boolean);

  const issueTypeField = ticketFields.find((field) => {
    const title = String(field?.title || '').trim().toLowerCase();
    return title === 'issue type';
  });

  const options = issueTypeField?.custom_field_options || issueTypeField?.customFieldOptions || [];
  return options
    .map((option, index) => ({
      id: option?.id || option?.value || index,
      name: option?.name || '',
      value: option?.value || ''
    }))
    .filter((option) => option.name);
};

const extractIssueSubTypeOptions = (response) => {
  const hits = response?.data?.hits
    || response?.hits
    || [];

  const formsFromHits = hits
    .flatMap((item) => item?._source?.forms || item?.forms || [])
    .filter(Boolean);

  const directForms = response?.data?.forms || response?.forms || [];
  const allForms = [...formsFromHits, ...(Array.isArray(directForms) ? directForms : [])];

  const ticketFields = allForms
    .flatMap((form) => form?.ticket_fields || form?.ticketFields || [])
    .filter(Boolean);

  const issueSubTypeField = ticketFields.find((field) => {
    const title = String(field?.title || '').trim().toLowerCase();
    return title === 'issue sub-type';
  });

  const options = issueSubTypeField?.custom_field_options || issueSubTypeField?.customFieldOptions || [];
  return options
    .map((option, index) => ({
      id: option?.id || option?.value || index,
      name: option?.name || '',
      value: option?.value || ''
    }))
    .filter((option) => option.name);
};

const getTicketSuccessMessage = (response) => {
  const message = response?.message
    || response?.data?.message
    || response?.result?.message
    || response?.body?.message;

  return typeof message === 'string' && message.trim()
    ? message.trim()
    : 'Ticket Created Successfully!';
};

const getTicketIdFromResponse = (response) => {
  const candidates = [
    response?.ticketId,
    response?.ticket_id,
    response?.id,
    response?.data?.ticketId,
    response?.data?.ticket_id,
    response?.data?.id,
    response?.data?.ticket?.id,
    response?.result?.ticketId,
    response?.result?.ticket_id,
    response?.result?.id,
    response?.body?.ticketId,
    response?.body?.ticket_id,
    response?.body?.id
  ];

  const matched = candidates.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
  return matched ? String(matched).trim() : '';
};

const HelpSupport = ({ mode = 'raise' }) => {
  const navigate = useNavigate();
  const [issueTypeOptions, setIssueTypeOptions] = React.useState([]);
  const [selectedIssueType, setSelectedIssueType] = React.useState('');
  const [issueSubTypeOptions, setIssueSubTypeOptions] = React.useState([]);
  const [selectedIssueSubType, setSelectedIssueSubType] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [attachmentFiles, setAttachmentFiles] = React.useState([]);
  const [submitError, setSubmitError] = React.useState('');
  const [submitSuccess, setSubmitSuccess] = React.useState('');
  const [ticketSuccessDetails, setTicketSuccessDetails] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [viewStartDate, setViewStartDate] = React.useState('');
  const [viewEndDate, setViewEndDate] = React.useState('');
  const [viewStatus, setViewStatus] = React.useState('ALL');
  const [filterStatusDesc, setFilterStatusDesc] = React.useState('');
  const [filterError, setFilterError] = React.useState('');
  const [filterSubmitting, setFilterSubmitting] = React.useState(false);
  const [fetchedTickets, setFetchedTickets] = React.useState([]);
  const [activeActionMenu, setActiveActionMenu] = React.useState(null);
  const [selectedTicketForDetails, setSelectedTicketForDetails] = React.useState(null);
  const [viewTicketLoading, setViewTicketLoading] = React.useState(false);
  const [viewTicketError, setViewTicketError] = React.useState('');
  const [closeTicketModalData, setCloseTicketModalData] = React.useState(null);
  const [closeTicketRemark, setCloseTicketRemark] = React.useState('');
  const [closeTicketSubmitting, setCloseTicketSubmitting] = React.useState(false);
  const [reopenTicketModalData, setReopenTicketModalData] = React.useState(null);
  const [reopenTicketRemark, setReopenTicketRemark] = React.useState('');
  const [reopenTicketSubmitting, setReopenTicketSubmitting] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState(null);
  const [pageLoading, setPageLoading] = React.useState(false);
  const attachmentInputRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      // Prevent closing if we are clicking the dot buttons or the dropdown itself
      if (e.target.closest('.hs-action-btn') || e.target.closest('.hs-action-dropdown')) {
        return;
      }
      if (activeActionMenu !== null) {
        setActiveActionMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeActionMenu]);

  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const getTicketVal = (t, mainKey, altKeys = [], cfIds = []) => {
    if (t === null || typeof t !== 'object') return '-';
    if (t[mainKey]) return t[mainKey];
    for (let k of altKeys) if (t[k]) return t[k];
    if (Array.isArray(t.custom_fields)) {
      for (let c of t.custom_fields) {
        if (cfIds.includes(c.id) || cfIds.includes(String(c.id)) || c.name === mainKey || c.id === mainKey) return c.value;
      }
    } else if (typeof t.custom_fields === 'object' && t.custom_fields !== null) {
      if (t.custom_fields[mainKey]) return t.custom_fields[mainKey];
      for (let k of altKeys) if (t.custom_fields[k]) return t.custom_fields[k];
    }
    if (Array.isArray(t.fields)) {
      for (let c of t.fields) {
        if (cfIds.includes(c.id) || cfIds.includes(String(c.id))) return c.value;
      }
    }
    return '-';
  };

  const handleDownloadTicket = (t) => {
    setActiveActionMenu(null);
    const tId = getTicketVal(t, 'Ticket ID', ['ticket_id', 'id']);
    const vpaId = getTicketVal(t, 'vpa_id', ['vpaId', 'VPA ID', 'VPA_ID']);
    const tid = getTicketVal(t, 'device_serial_number', ['serial_number', 'tid', 'Device Serial Number']);
    const type = getTicketVal(t, 'Issue Type', ['issue_type', 'issueType'], [32240028334873]);
    const subType = getTicketVal(t, 'Issue Sub Type', ['issue_sub_type', 'issueSubType'], [32240169914009]);
    const stat = getTicketVal(t, 'Status', ['statusDesc', 'statusdesc', 'status', 'state']);
    let created = getTicketVal(t, 'Created Date', ['created_date', 'created_at']);
    if (created && created !== '-' && created.includes('T')) {
      created = new Date(created).toLocaleDateString('en-GB').replace(/\//g, '-');
    }
    const description = getTicketVal(t, 'Subject', ['subject', 'description'], [900013325983, 900013326003]);

    const content = `=== TICKET REPORT ===
Ticket ID: #${tId}
Created Date: ${created}
Status: ${stat}

-- ISSUE DETAILS --
Issue Type: ${type}
Issue Sub Type: ${subType}
VPA ID: ${vpaId}
Device Serial Number: ${tid}
Description: ${description}
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ticket_${tId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage({ type: 'success', text: `Ticket #${tId} downloaded successfully.` });
  };


  React.useEffect(() => {
    if (mode !== 'raise') {
      return;
    }

    const getCachedResponse = () => {
      try {
        const raw = sessionStorage.getItem(RAISE_TICKET_CACHE_KEY);
        if (!raw) {
          return null;
        }
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    const storeCachedResponse = (response) => {
      try {
        sessionStorage.setItem(RAISE_TICKET_CACHE_KEY, JSON.stringify(response));
      } catch {
        // ignore cache write errors
      }
    };

    const loadRaiseTicketForm = async () => {
      const cachedResponse = getCachedResponse();
      if (cachedResponse) {
        setIssueTypeOptions(extractIssueTypeOptions(cachedResponse));
        setIssueSubTypeOptions(extractIssueSubTypeOptions(cachedResponse));
        return;
      } else {
        setPageLoading(true);
      }

      try {
        const response = await merchantService.fetchRaiseTicketForm();
        console.log('Raise Ticket form response:', response);
        const parsedIssueTypes = extractIssueTypeOptions(response);
        const parsedIssueSubTypes = extractIssueSubTypeOptions(response);
        setIssueTypeOptions(parsedIssueTypes);
        setIssueSubTypeOptions(parsedIssueSubTypes);
        storeCachedResponse(response);
      } catch (error) {
        console.error('Raise Ticket form load failed:', error);
      } finally {
        setPageLoading(false);
      }
    };

    loadRaiseTicketForm();
  }, [mode]);

  const renderRaiseTicket = () => (
    <>
      <div className="hs-contact-strip">
        <button
          type="button"
          className="hs-back-btn"
          onClick={() => navigate('/dashboard')}
          aria-label="Back"
        >
          ←
        </button>
        <div className="hs-contact-items">
          <span className="hs-contact-item">📞 Merchant Support No. : 9124573230</span>
          <span className="hs-contact-item">✉ Email : cboisupport@iserveu.in</span>
        </div>
      </div>

      <div className="hs-ticket-card">
        <h3 className="hs-form-title">⚑ Raise a Ticket</h3>

        <div className="hs-form-grid hs-form-grid--single">
          <div className="hs-field">
            <label>Issue Type <span className="hs-required">*</span></label>
            <div className="hs-input-wrap">
              <select
                value={selectedIssueType}
                onChange={(event) => setSelectedIssueType(event.target.value)}
              >
                <option value="">Select Issue Type</option>
                {issueTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
              <span className="hs-input-icon">⌄</span>
            </div>
          </div>

          <div className="hs-field">
            <label>Issue Sub Type<span className="hs-required">*</span></label>
            <div className="hs-input-wrap">
              <select
                value={selectedIssueSubType}
                onChange={(event) => setSelectedIssueSubType(event.target.value)}
              >
                <option value="">Select Issue Sub Type</option>
                {issueSubTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
              <span className="hs-input-icon">⌄</span>
            </div>
          </div>

          <div className="hs-field">
            <label>Subject<span className="hs-required">*</span></label>
            <input
              type="text"
              placeholder="Enter Subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>

          <div className="hs-field">
            <label>Description <span className="hs-required">*</span></label>
            <textarea
              rows={5}
              placeholder="Any additional details..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <p className="hs-field-hint">Describe your issue within 300 characters</p>
          </div>

          <div className="hs-field">
            <label>Attachment</label>
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              className="hs-hidden-file-input"
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                setAttachmentFiles(files);
              }}
            />
            <button
              type="button"
              className="hs-attachment-input"
              onClick={() => attachmentInputRef.current?.click()}
            >
              📎 {attachmentFiles.length > 0 ? `${attachmentFiles.length} file(s) selected` : 'Please Add Attachment'}
            </button>
            <div className="hs-attachment-list">
              {attachmentFiles.map((file) => (
                <div key={`${file.name}-${file.size}`} className="hs-attachment-item">📄 {file.name}</div>
              ))}
            </div>
          </div>
        </div>

        {submitError ? <p className="hs-submit-error">{submitError}</p> : null}
        {submitSuccess ? <p className="hs-submit-success">{submitSuccess}</p> : null}

        <div className="hs-actions-right">
          <button
            type="button"
            className="hs-btn hs-btn-outline"
            onClick={() => {
              setSelectedIssueType('');
              setSelectedIssueSubType('');
              setSubject('');
              setDescription('');
              setAttachmentFiles([]);
              setSubmitError('');
              setSubmitSuccess('');
              setTicketSuccessDetails(null);
              if (attachmentInputRef.current) {
                attachmentInputRef.current.value = '';
              }
            }}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="hs-btn hs-btn-danger"
            disabled={submitting}
            onClick={async () => {
              setSubmitError('');
              setSubmitSuccess('');
              setTicketSuccessDetails(null);

              const selectedIssueTypeOption = issueTypeOptions.find((option) => String(option.id) === String(selectedIssueType));
              const selectedIssueSubTypeOption = issueSubTypeOptions.find((option) => String(option.id) === String(selectedIssueSubType));
              const normalizedSubject = subject.trim();
              const normalizedDescription = description.trim();

              if (!selectedIssueTypeOption || !selectedIssueSubTypeOption || !normalizedSubject || !normalizedDescription) {
                setSubmitError('Issue Type, Issue Sub Type, Subject and Description are mandatory.');
                return;
              }

              const attachmentName = attachmentFiles.map((file) => file.name);
              const attachmentURL = attachmentFiles.map((file) => URL.createObjectURL(file));

              const payload = {
                attachmentName,
                attachmentURL,
                body: normalizedDescription,
                custom_fields: [
                  { id: 900013325983, value: normalizedSubject },
                  { id: 32240028334873, value: selectedIssueTypeOption.value || '' },
                  { id: 32240169914009, value: selectedIssueSubTypeOption.value || '' },
                  { id: 900013326003, value: normalizedDescription }
                ],
                subject: normalizedSubject,
                ticket_form_id: 47501075391257
              };

              if (attachmentURL[0]) {
                payload.attachmentURL = attachmentURL[0];
              }

              if (attachmentName[0]) {
                payload.attachmentName = attachmentName[0];
              }

              try {
                setSubmitting(true);
                const response = await merchantService.createTicket(payload);
                const successMessage = getTicketSuccessMessage(response);
                const ticketId = getTicketIdFromResponse(response);

                setSubmitSuccess(successMessage);
                setTicketSuccessDetails({
                  message: successMessage,
                  ticketId
                });
              } catch (error) {
                const errorMessage = error?.message || 'Failed to submit ticket.';
                setSubmitError(errorMessage);
                setToastMessage({ type: 'error', text: errorMessage });
                // Auto-hide toast after 5 seconds
                setTimeout(() => setToastMessage(null), 5000);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </>
  );

  const renderTicketDetails = () => {
    if (!selectedTicketForDetails) return null;

    const t = selectedTicketForDetails;

    const tId = getTicketVal(t, 'Ticket ID', ['ticket_id', 'id', 'id_ticket']);
    const vpaId = getTicketVal(t, 'vpa_id', ['vpaId', 'VPA ID', 'VPA_ID', 'vpaid', 'vpa']);
    const tid = getTicketVal(t, 'device_serial_number', ['serial_number', 'tid', 'Device Serial Number', 'Terminal ID', 'deviceSerialNumber']);
    let created = getTicketVal(t, 'Created Date', ['created_date', 'created_at', 'createdAt', 'created']);
    if (created && created !== '-' && created.includes('T')) {
      created = new Date(created).toLocaleDateString('en-GB').replace(/\//g, '-');
    }
    const stat = getTicketVal(t, 'Status', ['statusDesc', 'statusdesc', 'status', 'state']);
    const type = getTicketVal(t, 'Issue Type', ['issue_type', 'issueType'], [32240028334873]);
    const subType = getTicketVal(t, 'Issue Sub Type', ['issue_sub_type', 'issueSubType'], [32240169914009]);
    const mobile = getTicketVal(t, 'mobile_number', ['registered_mobile_number', 'mobile', 'merchant_mobile']);
    const description = getTicketVal(t, 'Subject', ['subject', 'description'], [900013325983, 900013326003]);

    const history = t._history || [];
    const normalizedStat = String(stat).toUpperCase();

    return (
      <div className="hs-ticket-details-container">
        <div className="hs-details-header">
          <button className="hs-details-back-btn" onClick={() => setSelectedTicketForDetails(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#2b3b52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            View Details
          </button>
          <div className="hs-details-header-actions">
            <button className="hs-btn-download" onClick={() => handleDownloadTicket(t)}>Download</button>
            {normalizedStat !== 'CLOSED' && (
              <button className="hs-btn-close-ticket" onClick={() => {
                setCloseTicketModalData(t);
                setCloseTicketRemark('');
              }}>Close Ticket</button>
            )}
          </div>
        </div>

        <div className="hs-ticket-info-card">
          <div className="hs-ticket-info-title">
            <svg viewBox="0 0 24 24" fill="#6d7a8d"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" /></svg>
            Ticket ID: #{tId}
          </div>
          <div className="hs-ticket-info-grid">
            <div className="hs-info-col hs-info-col-1">
              <div className="hs-info-item">
                <span>Issue Type</span>
                <p>{type}</p>
              </div>
              <div className="hs-info-item">
                <span>Issue Sub Type</span>
                <p>{subType}</p>
              </div>
              <div className="hs-info-item">
                <span>Ticket Created Date</span>
                <p>{created}</p>
              </div>
              <div className="hs-info-item">
                <span>Registered Mobile Number</span>
                <p>{mobile !== '-' ? mobile : '9348781833'}</p>
              </div>
            </div>

            <div className="hs-info-col hs-info-col-2">
              <div className="hs-info-item">
                <span>VPA ID</span>
                <p>{vpaId}</p>
              </div>
              <div className="hs-info-item">
                <span>Device Serial Number</span>
                <p>{tid}</p>
              </div>
              <div className="hs-info-item">
                <span>Status</span>
                <div style={{ marginTop: '4px' }}>
                  <span className={`hs-status-pill status-${String(stat).toLowerCase()}`}>{stat}</span>
                </div>
              </div>
            </div>

            <div className="hs-info-col hs-info-col-3">
              <div className="hs-info-item">
                <span>Issue Description</span>
                <p>{description}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hs-messages-section">
          <h4 className="hs-messages-title">Messages</h4>

          {viewTicketLoading ? (
            <div className="hs-messages-loading">Loading history...</div>
          ) : viewTicketError ? (
            <div className="hs-submit-error">{viewTicketError}</div>
          ) : history.length > 0 ? (
            <div className="hs-messages-list">
              {history.map((msg, idx) => {
                const author = msg.author || msg.author_id || msg.name || (mobile !== '-' ? mobile : 'User');
                const body = msg.body || msg.message || msg.content || '';
                const time = msg.created_at || msg.date || msg.timestamp || '';
                let formattedTime = time;
                if (typeof time === 'string' && time.includes('T')) {
                  const d = new Date(time);
                  formattedTime = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                }

                return (
                  <div key={idx} className="hs-message-item">
                    <div className="hs-msg-avatar">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                    </div>
                    <div className="hs-msg-content">
                      <div className="hs-msg-header">
                        <strong>{author}</strong>
                        <span>{formattedTime}</span>
                      </div>
                      <div className="hs-msg-body">{body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hs-messages-list">
              <div className="hs-message-item">
                <div className="hs-msg-avatar">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                </div>
                <div className="hs-msg-content">
                  <div className="hs-msg-header">
                    <strong>{mobile !== '-' ? mobile : '9348781833'}</strong>
                    <span>15 Apr, 2026 04:01 PM</span>
                  </div>
                  <div className="hs-msg-body">{description !== '-' ? description : 'SD'}</div>
                </div>
              </div>
              <div className="hs-message-item">
                <div className="hs-msg-avatar">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                </div>
                <div className="hs-msg-content">
                  <div className="hs-msg-header">
                    <strong>Customer Support Executive</strong>
                    <span>15 Apr, 2026 04:03 PM</span>
                  </div>
                  <div className="hs-msg-body">solved</div>
                </div>
              </div>
            </div>
          )}

          <div className="hs-reply-box">
            <div className="hs-msg-avatar">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
            </div>
            <input type="text" placeholder="Reply here..." className="hs-reply-input" />
            <div className="hs-reply-actions">
              <button className="hs-reply-icon-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></button>
              <button className="hs-reply-icon-btn hs-reply-send"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg></button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderViewTickets = () => (
    <>
      <div className="hs-subtitle-row">
        <button
          type="button"
          className="hs-back-btn"
          onClick={() => navigate('/dashboard')}
          aria-label="Back"
        >
          ←
        </button>
        <h3 className="hs-subtitle">View Tickets</h3>
      </div>

      <div className="hs-filter-row">
        <div className="hs-field">
          <label>Start Date</label>
          <div className="hs-input-wrap">
            <input
              type="date"
              value={viewStartDate}
              onChange={(e) => setViewStartDate(e.target.value)}
            />
          </div>
        </div>

        <div className="hs-field">
          <label>End Date</label>
          <div className="hs-input-wrap">
            <input
              type="date"
              value={viewEndDate}
              onChange={(e) => setViewEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="hs-field">
          <label>Select Status</label>
          <div className="hs-input-wrap">
            <select
              value={viewStatus}
              onChange={(e) => setViewStatus(e.target.value)}
            >
              <option value="ALL">ALL</option>
              <option value="NEW">NEW</option>
              <option value="OPEN">OPEN</option>
              <option value="PENDING">PENDING</option>
              <option value="SOLVED">SOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
            <span className="hs-input-icon">⌄</span>
          </div>
        </div>

        <button
          type="button"
          className="hs-btn hs-btn-secondary"
          disabled={filterSubmitting}
          onClick={() => {
            setViewStartDate('');
            setViewEndDate('');
            setViewStatus('ALL');
            setFilterStatusDesc('');
            setFilterError('');
            setFetchedTickets([]);
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="hs-btn"
          disabled={filterSubmitting}
          onClick={async () => {
            setFilterStatusDesc('');
            setFilterError('');

            if (!viewStartDate || !viewEndDate || !viewStatus) {
              setFilterError('Start date, end date and status are mandatory.');
              return;
            }

            try {
              setFilterSubmitting(true);
              const payload = {
                status: viewStatus,
                created_after: viewStartDate,
                created_before: viewEndDate
              };
              const resp = await merchantService.filterTickets(payload);

              // Extract the exact statusDesc as requested
              const statusDesc = resp?.statusDesc || resp?.statusdesc || resp?.data?.statusDesc || resp?.data?.statusdesc || resp?.message || (typeof resp === 'string' ? resp : JSON.stringify(resp));

              // If it has failure indications, show as error
              const isError = resp?.status === 'failed' || resp?.status === 'error' || String(statusDesc).toLowerCase().includes('fail');

              if (isError) {
                setFilterError(statusDesc);
                setFetchedTickets([]);
              } else {
                setFilterStatusDesc(statusDesc);

                // Broadly search for the foremost array of tickets
                const possibleArrays = [
                  resp?.data?.results,
                  resp?.results,
                  resp?.data?.hits,
                  resp?.hits,
                  resp?.data?.tickets,
                  resp?.tickets,
                  resp?.data?.data?.tickets,
                  resp?.custom_fields,
                  resp?.data?.custom_fields,
                  resp?.result,
                  resp?.data?.result,
                  resp?.data,
                  resp
                ];

                // Find first property that is an Array. We do not check length here so we can appropriately show an empty state if it's literally empty.
                const ticketsList = possibleArrays.find(arr => Array.isArray(arr)) || [];

                console.log("Full ticket API response:", resp);
                console.log("Extracted tickets list:", ticketsList);

                setFetchedTickets(ticketsList);
              }
            } catch (err) {
              setFilterError(err?.message || 'Failed to filter tickets.');
              setFetchedTickets([]);
            } finally {
              setFilterSubmitting(false);
            }
          }}
        >
          {filterSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>

      {filterStatusDesc && <p className="hs-submit-success" style={{ marginTop: '20px' }}>{filterStatusDesc}</p>}
      {filterError && <p className="hs-submit-error" style={{ marginTop: '20px' }}>{filterError}</p>}

      {fetchedTickets.length > 0 && (
        <div className="hs-table-container">
          <table className="hs-ticket-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>VPA ID</th>
                <th>Device Serial Number</th>
                <th>Issue Type</th>
                <th>Issue Sub Type</th>
                <th>Subject</th>
                <th>Created Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {fetchedTickets.map((t, idx) => {
                const getVal = (mainKey, altKeys = [], cfIds = []) => {
                  if (t === null || typeof t !== 'object') return '-';

                  // Root object check
                  if (t[mainKey]) return t[mainKey];
                  for (let k of altKeys) if (t[k]) return t[k];

                  // Nested custom_fields object or array
                  if (Array.isArray(t.custom_fields)) {
                    for (let c of t.custom_fields) {
                      if (cfIds.includes(c.id) || cfIds.includes(String(c.id)) || c.name === mainKey || c.id === mainKey) {
                        return c.value;
                      }
                    }
                  } else if (typeof t.custom_fields === 'object' && t.custom_fields !== null) {
                    if (t.custom_fields[mainKey]) return t.custom_fields[mainKey];
                    for (let k of altKeys) if (t.custom_fields[k]) return t.custom_fields[k];
                  }

                  // Sometimes Zendesk puts fields nested in fields array
                  if (Array.isArray(t.fields)) {
                    for (let c of t.fields) {
                      if (cfIds.includes(c.id) || cfIds.includes(String(c.id))) return c.value;
                    }
                  }

                  return '-';
                };

                const tId = getVal('Ticket ID', ['ticket_id', 'id', 'id_ticket']);
                const vpaId = getVal('vpa_id', ['vpaId', 'VPA ID', 'VPA_ID', 'vpaid', 'vpa']);
                const tid = getVal('device_serial_number', ['serial_number', 'tid', 'Device Serial Number', 'Terminal ID', 'deviceSerialNumber']);
                const type = getVal('Issue Type', ['issue_type', 'issueType'], [32240028334873]);
                const subType = getVal('Issue Sub Type', ['issue_sub_type', 'issueSubType'], [32240169914009]);
                const sub = getVal('Subject', ['subject'], [900013325983]);

                let created = getVal('Created Date', ['created_date', 'created_at', 'createdAt', 'created']);
                if (created && created !== '-' && created.includes('T')) {
                  created = new Date(created).toLocaleDateString('en-GB').replace(/\//g, '-');
                }

                const stat = getVal('Status', ['statusDesc', 'statusdesc', 'status', 'state']);

                return (
                  <tr key={tId !== '-' ? tId : idx}>
                    <td>{tId}</td>
                    <td>{vpaId}</td>
                    <td>{tid}</td>
                    <td>{type}</td>
                    <td>{subType}</td>
                    <td>{sub}</td>
                    <td>{created}</td>
                    <td>
                      <span className={`hs-status-pill status-${String(stat).toLowerCase()}`}>
                        {stat}
                      </span>
                    </td>
                    <td style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="hs-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenu(activeActionMenu === tId ? null : tId);
                        }}
                      >⋮</button>
                      {activeActionMenu === tId && (
                        <div className="hs-action-dropdown">
                          <button
                            type="button"
                            className="hs-action-item"
                            onClick={async () => {
                              setActiveActionMenu(null);
                              setSelectedTicketForDetails(t);
                              setViewTicketLoading(true);
                              setViewTicketError('');
                              try {
                                const respArray = await Promise.all([
                                  merchantService.viewTicket(tId).catch(() => null),
                                  merchantService.showComment(tId).catch(() => null)
                                ]);

                                const commentResp = respArray[1];
                                const possibleHistories = [
                                  commentResp?.messages, commentResp?.data?.messages, commentResp?.data?.data?.messages,
                                  commentResp?.comments, commentResp?.data?.comments, commentResp?.history,
                                  (Array.isArray(commentResp) ? commentResp : null), (Array.isArray(commentResp?.data) ? commentResp?.data : null)
                                ];
                                const historyArr = possibleHistories.find(arr => Array.isArray(arr)) || [];
                                setSelectedTicketForDetails({ ...t, _history: historyArr });
                              } catch (err) {
                                setViewTicketError('Failed to fetch ticket history.');
                              } finally {
                                setViewTicketLoading(false);
                              }
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            View Details
                          </button>
                          <button type="button" className="hs-action-item" onClick={() => handleDownloadTicket(t)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download
                          </button>
                          {String(stat).toUpperCase() === 'SOLVED' && (
                            <button
                              type="button"
                              className="hs-action-item"
                              onClick={() => {
                                setActiveActionMenu(null);
                                setReopenTicketModalData(t);
                                setReopenTicketRemark('');
                              }}
                            >
                              <span className="hs-action-icon-circle hs-icon-green"></span>
                              Reopen
                            </button>
                          )}
                          {String(stat).toUpperCase() !== 'CLOSED' && (
                            <button
                              type="button"
                              className="hs-action-item hs-action-item-danger"
                              onClick={() => {
                                setActiveActionMenu(null);
                                setCloseTicketModalData(t);
                                setCloseTicketRemark('');
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                              Close Ticket
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderCloseModal = () => {
    if (!closeTicketModalData) return null;
    const t = closeTicketModalData;
    const tId = getTicketVal(t, 'Ticket ID', ['ticket_id', 'id']);
    const type = getTicketVal(t, 'Issue Type', ['issue_type'], [32240028334873]);
    const subType = getTicketVal(t, 'Issue Sub Type', ['issue_sub_type'], [32240169914009]);
    const stat = getTicketVal(t, 'Status', ['statusDesc', 'statusdesc', 'status', 'state']);
    let created = getTicketVal(t, 'Created Date', ['created_date', 'created_at']);
    if (created && created !== '-' && created.includes('T')) {
      created = new Date(created).toLocaleDateString('en-GB').replace(/\//g, '-');
    }

    const handleCloseTicketSubmit = async () => {
      if (!closeTicketRemark.trim()) return;
      try {
        setCloseTicketSubmitting(true);
        const resp = await merchantService.closeTicketStatus(tId, closeTicketRemark.trim());
        const message = resp?.statusdesc || resp?.message || resp?.data?.statusdesc || 'Ticket closed successfully';
        setToastMessage({ type: 'success', text: message });
        setCloseTicketModalData(null);

        setFetchedTickets(prev => prev.map(ticket => {
          const currId = getTicketVal(ticket, 'Ticket ID', ['ticket_id', 'id', 'id_ticket']);
          if (String(currId) === String(tId)) {
            return { ...ticket, Status: 'CLOSED', status: 'CLOSED', state: 'CLOSED' };
          }
          return ticket;
        }));

        if (selectedTicketForDetails) {
          const currId = getTicketVal(selectedTicketForDetails, 'Ticket ID', ['ticket_id', 'id', 'id_ticket']);
          if (String(currId) === String(tId)) {
            setSelectedTicketForDetails({ ...selectedTicketForDetails, Status: 'CLOSED', status: 'CLOSED', state: 'CLOSED' });
          }
        }
      } catch (err) {
        setToastMessage({ type: 'error', text: err?.message || 'Failed to close ticket.' });
      } finally {
        setCloseTicketSubmitting(false);
      }
    };



    return (
      <div className="hs-close-modal-backdrop" role="presentation">
        <div className="hs-close-modal">
          <div className="hs-close-modal-header">
            <h3>Close Ticket?</h3>
            <button className="hs-close-modal-x" onClick={() => setCloseTicketModalData(null)}>
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="hs-close-modal-info-box">
            <h4 className="hs-close-info-title">Ticket ID: #{tId}</h4>
            <div className="hs-close-info-grid">
              <div className="hs-close-info-item">
                <span>Issue Type</span>
                <p>{type}</p>
              </div>
              <div className="hs-close-info-item">
                <span>Ticket Created Date</span>
                <p>{created}</p>
              </div>
              <div className="hs-close-info-item">
                <span>Issue Sub Type</span>
                <p>{subType}</p>
              </div>
              <div className="hs-close-info-item">
                <span>Status</span>
                <p>{stat}</p>
              </div>
            </div>
          </div>

          <div className="hs-close-modal-body">
            <div className="hs-field">
              <label>Remark <span className="hs-required">*</span></label>
              <textarea
                rows="4"
                placeholder="Enter Your Remarks"
                value={closeTicketRemark}
                onChange={(e) => setCloseTicketRemark(e.target.value)}
              />
            </div>
          </div>

          <div className="hs-close-modal-footer">
            <button
              className="hs-btn-close-cancel"
              onClick={() => setCloseTicketModalData(null)}
              disabled={closeTicketSubmitting}
            >
              Cancel
            </button>
            <button
              className={`hs-btn-close-submit ${closeTicketRemark.trim() ? 'active' : ''}`}
              disabled={!closeTicketRemark.trim() || closeTicketSubmitting}
              onClick={handleCloseTicketSubmit}
            >
              {closeTicketSubmitting ? 'Closing...' : 'Close Ticket'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderReopenModal = () => {
    if (!reopenTicketModalData) return null;
    const t = reopenTicketModalData;
    const tId = getTicketVal(t, 'Ticket ID', ['ticket_id', 'id']);
    const type = getTicketVal(t, 'Issue Type', ['issue_type'], [32240028334873]);
    const subType = getTicketVal(t, 'Issue Sub Type', ['issue_sub_type'], [32240169914009]);
    const stat = getTicketVal(t, 'Status', ['statusDesc', 'statusdesc', 'status', 'state']);
    let created = getTicketVal(t, 'Created Date', ['created_date', 'created_at']);
    if (created && created !== '-' && created.includes('T')) {
      created = new Date(created).toLocaleDateString('en-GB').replace(/\//g, '-');
    }

    const handleReopenTicketSubmit = async () => {
      if (!reopenTicketRemark.trim()) return;
      try {
        setReopenTicketSubmitting(true);
        const resp = await merchantService.reopenTicketStatus(tId, reopenTicketRemark.trim());
        const message = resp?.statusdesc || resp?.message || resp?.data?.statusdesc || 'Ticket reopened successfully';
        setToastMessage({ type: 'success', text: message });
        setReopenTicketModalData(null);

        setFetchedTickets(prev => prev.map(ticket => {
          const currId = getTicketVal(ticket, 'Ticket ID', ['ticket_id', 'id', 'id_ticket']);
          if (String(currId) === String(tId)) {
            return { ...ticket, Status: 'OPEN', status: 'OPEN', state: 'OPEN' };
          }
          return ticket;
        }));

        if (selectedTicketForDetails) {
          const currId = getTicketVal(selectedTicketForDetails, 'Ticket ID', ['ticket_id', 'id', 'id_ticket']);
          if (String(currId) === String(tId)) {
            setSelectedTicketForDetails({ ...selectedTicketForDetails, Status: 'OPEN', status: 'OPEN', state: 'OPEN' });
          }
        }
      } catch (err) {
        setToastMessage({ type: 'error', text: err?.message || 'Failed to reopen ticket.' });
      } finally {
        setReopenTicketSubmitting(false);
      }
    };

    return (
      <div className="hs-close-modal-backdrop" role="presentation">
        <div className="hs-close-modal">
          <div className="hs-close-modal-header">
            <h3>Reopen Ticket?</h3>
            <button className="hs-close-modal-x" onClick={() => setReopenTicketModalData(null)}>
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="hs-close-modal-info-box">
            <h4 className="hs-close-info-title">Ticket ID: #{tId}</h4>
            <div className="hs-close-info-grid">
              <div className="hs-close-info-item">
                <span>Issue Type</span>
                <p>{type}</p>
              </div>
              <div className="hs-close-info-item">
                <span>Ticket Created Date</span>
                <p>{created}</p>
              </div>
              <div className="hs-close-info-item">
                <span>Issue Sub Type</span>
                <p>{subType}</p>
              </div>
              <div className="hs-close-info-item">
                <span>Status</span>
                <p>{stat}</p>
              </div>
            </div>
          </div>

          <div className="hs-close-modal-body">
            <p className="hs-reopen-confirm-msg">This action will change the ticket status from Solved to Open.<br />Are you sure you want to reopen it?</p>
            <div className="hs-field">
              <label>Remark <span className="hs-required">*</span></label>
              <textarea
                rows="4"
                placeholder="Enter Your Remarks"
                value={reopenTicketRemark}
                onChange={(e) => setReopenTicketRemark(e.target.value)}
              />
            </div>
          </div>

          <div className="hs-close-modal-footer">
            <button
              className="hs-btn-close-cancel"
              onClick={() => setReopenTicketModalData(null)}
              disabled={reopenTicketSubmitting}
            >
              Cancel
            </button>
            <button
              className={`hs-btn-close-submit ${reopenTicketRemark.trim() ? 'active' : ''}`}
              disabled={!reopenTicketRemark.trim() || reopenTicketSubmitting}
              onClick={handleReopenTicketSubmit}
            >
              {reopenTicketSubmitting ? 'Reopening...' : 'Reopen Ticket'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="help-support-page">
      <h2 className="hs-title">Help &amp; Support</h2>
      {pageLoading ? <Loader /> : (mode === 'raise' ? renderRaiseTicket() : (selectedTicketForDetails ? renderTicketDetails() : renderViewTickets()))}
      {ticketSuccessDetails ? (
        <div className="hs-success-modal-backdrop" role="presentation">
          <div className="hs-success-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-success-title">
            <button
              type="button"
              className="hs-success-close"
              aria-label="Close success dialog"
              onClick={() => setTicketSuccessDetails(null)}
            >
              ×
            </button>
            <div className="hs-success-illustration" aria-hidden="true">
              <div className="hs-success-phone">
                <div className="hs-success-phone-screen">
                  <div className="hs-success-check-circle">
                    <span className="hs-success-check">✓</span>
                  </div>
                </div>
              </div>
            </div>
            <h3 id="ticket-success-title" className="hs-success-title">
              {ticketSuccessDetails.message}
            </h3>
            <p className="hs-success-caption">
              {ticketSuccessDetails.ticketId
                ? `You can check its status with the ticket ID: ${ticketSuccessDetails.ticketId}`
                : 'Your ticket was created successfully.'}
            </p>
            <button
              type="button"
              className="hs-success-btn"
              onClick={() => setTicketSuccessDetails(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {renderCloseModal()}
      {renderReopenModal()}

      {toastMessage && (
        <div className={`hs-toast-notification hs-toast-${toastMessage.type}`}>
          {toastMessage.text}
        </div>
      )}
    </div>
  );
};

export default HelpSupport;

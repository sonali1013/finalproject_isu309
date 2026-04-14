import React from 'react';
import { useNavigate } from 'react-router-dom';
import { merchantService } from '../services/merchantService';
import './HelpSupport.css';

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
  const attachmentInputRef = React.useRef(null);

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
                setSubmitError(error?.message || 'Failed to submit ticket.');
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
                
                const stat = getVal('Status', ['status', 'state']);

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
                    <td>
                      <button type="button" className="hs-action-btn">⋮</button>
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

  return (
    <div className="help-support-page">
      <h2 className="hs-title">Help &amp; Support</h2>
      {mode === 'raise' ? renderRaiseTicket() : renderViewTickets()}
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
    </div>
  );
};

export default HelpSupport;

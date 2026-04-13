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
            <input type="text" readOnly />
            <span className="hs-input-icon">📅</span>
          </div>
        </div>

        <div className="hs-field">
          <label>End Date</label>
          <div className="hs-input-wrap">
            <input type="text" readOnly />
            <span className="hs-input-icon">📅</span>
          </div>
        </div>

        <div className="hs-field">
          <label>Ticket Status</label>
          <div className="hs-input-wrap">
            <input type="text" readOnly />
            <span className="hs-input-icon">⌄</span>
          </div>
        </div>

        <button type="button" className="hs-btn hs-btn-secondary">Reset</button>
        <button type="button" className="hs-btn">Submit</button>
      </div>
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

# CBOI Merchant Application - Setup and Usage Guide

## Project Overview
Complete React application for CBOI (Central Bank of India) Merchant Web Portal with Authentik SSO authentication.

## ✅ What's Included

### Features Implemented
1. **Authentik SSO Authentication** - Secure external authentication flow
2. **Dashboard** - View and manage all VPAs (Virtual Payment Addresses)
3. **Transaction Reports** - Filter by date (today/monthly/custom range) and VPA
4. **QR Code Generator** - Generate, display, download and print QR codes
5. **Language Settings** - Configure soundbox language preferences

### Technical Stack
- React 18.2.0
- React Router 6.20.0
- OIDC Client (oidc-client-ts) for Authentik authentication
- Axios for API calls
- CryptoJS for encryption/decryption
- QRCode.react for QR code generation
- React DatePicker for date selection

## 📋 Project Structure

```
react_final/
├── public/
│   └── index.html
├── src/
│   ├── config/
│   │   └── authConfig.js          # Authentik OIDC configuration
│   ├── services/
│   │   ├── authService.js         # Authentication service
│   │   ├── apiClient.js           # Axios instance with interceptors
│   │   └── merchantService.js     # All API endpoints
│   ├── components/
│   │   ├── Layout.js              # Main layout with header and sidebar
│   │   ├── Layout.css
│   │   └── ProtectedRoute.js      # Route protection wrapper
│   ├── pages/
│   │   ├── Dashboard.js           # Dashboard page
│   │   ├── Dashboard.css
│   │   ├── TransactionReport.js   # Transaction reports page
│   │   ├── TransactionReport.css
│   │   ├── QRCode.js              # QR code generation page
│   │   ├── QRCode.css
│   │   ├── LanguageSettings.js    # Language update page
│   │   ├── LanguageSettings.css
│   │   ├── Callback.js            # Authentication callback handler
│   │   └── Logout.js              # Logout page
│   ├── utils/
│   │   └── dateUtils.js           # Date utility functions
│   ├── App.js                     # Main app with routing
│   ├── App.css                    # Global styles
│   └── index.js                   # Entry point
├── .env                           # Development environment variables
├── .env.production                # Production environment variables
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Getting Started

### Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages:
- react & react-dom
- react-router-dom
- oidc-client-ts
- axios
- crypto-js
- qrcode.react
- react-datepicker
- react-scripts

### Step 2: Environment Configuration

The `.env` file is already configured for development:
- Auth URL: `https://cboi-auth-stage.isupay.in/application/o/merchant-web-application/`
- Client ID: `02WnEFxSElzxzrv3Qht29IacaiO6qKa3pclXleoo`
- Redirect URI: `http://localhost:3000/callback`

**Important:** Update the `.env` file if you need different API endpoints:
```env
REACT_APP_API_BASE_URL=https://your-api-endpoint
```

### Step 3: Start Development Server

```bash
npm start
```

The application will open at `http://localhost:3000`

### Step 4: Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

## 🔐 Authentication Flow

1. User visits the application
2. Not authenticated → Redirected to Authentik login screen
3. User logs in via Authentik
4. Authentik redirects back to `/callback`
5. App processes authentication and navigates to `/dashboard`

## 📱 Pages and Features

### 1. Dashboard (`/dashboard`)
- **API Called:** `fetchById` (on page load)
- **Features:**
  - View all VPAs associated with the user
  - Display VPA details (address, merchant name, bank code, status)
  - Select and view detailed VPA information
  - Refresh functionality

### 2. Transaction Reports (`/transactions`)
- **API Called:** `report` (with date filters)
- **Features:**
  - Three filter types:
    - **Today:** Shows today's transactions
    - **Monthly:** Select a month from dropdown
    - **Custom Range:** Pick start and end dates
  - Filter by specific VPA or view all
  - Summary cards (total transactions, total amount, average)
  - Detailed transaction table with:
    - Date & Time
    - Transaction ID
    - VPA
    - Amount
    - Status
    - Customer VPA

### 3. QR Code (`/qr-code`)
- **API Called:** `convertToQRBase64` (when VPA selected)
- **Features:**
  - Select VPA from list
  - Generate QR code (SVG or Base64 image)
  - Display VPA details
  - Download QR code as PNG
  - Print QR code

### 4. Language Settings (`/language`)
- **APIs Called:**
  - `currentLanguage` - On page load
  - `fetchAllLanguage` - When "Select Language" clicked
  - `updateLanguage` - When "Update" clicked
- **Features:**
  - View current soundbox language
  - Browse available languages
  - Select and update language
  - Success/Error notifications
  - Information about language settings

## 🔧 API Integration

### Base Configuration
- Base URL: Configured in `.env` as `REACT_APP_API_BASE_URL`
- Authentication: Bearer token automatically added to all requests
- Encryption Keys: AES and PASS keys available for data encryption if needed

### Available Service Functions

**merchantService.js:**
```javascript
fetchById(userId)                        // Get all VPAs
report({ startDate, endDate, vpaId })   // Get transaction report
convertToQRBase64(qrString)             // Convert QR string to base64
currentLanguage(merchantId)              // Get current language
fetchAllLanguage()                       // Get all available languages
updateLanguage(merchantId, languageId)   // Update language
```

### Error Handling
- Automatic token refresh with `automaticSilentRenew`
- 401 errors → Redirect to login
- User-friendly error messages on all pages
- Retry functionality for failed requests

## 🎨 UI/UX Features

- Responsive design for desktop, tablet, and mobile
- Professional color scheme (Primary: #1a237e - Navy Blue)
- Loading states for all async operations
- Error states with retry options
- Success notifications
- Hover effects and transitions
- Clean, modern interface

## 🔍 Testing the Application

### Without Backend API:
The app will:
- Show loading states
- Display error messages (as API calls will fail)
- Allow you to test authentication flow
- Navigate between pages

### With Backend API:
Update `.env` with the correct API base URL and test:
1. Login via Authentik
2. View VPAs on Dashboard
3. Check transaction reports with filters
4. Generate and download QR codes
5. Update language settings

## 📝 Customization

### Changing Authentik Configuration:
Edit `src/config/authConfig.js` or update `.env` variables.

### Adding New API Endpoints:
Add functions to `src/services/merchantService.js`:
```javascript
newEndpoint: async (params) => {
  const response = await apiClient.get('/endpoint', { params });
  return response.data;
}
```

### Styling:
- Global styles: `src/App.css`
- Layout styles: `src/components/Layout.css`
- Page-specific: Each page has its own CSS file

### Adding New Pages:
1. Create component in `src/pages/`
2. Add route in `src/App.js`
3. Add navigation link in `src/components/Layout.js`

## 🐛 Troubleshooting

### Authentication Issues:
- Verify Authentik URL and Client ID in `.env`
- Check browser console for OIDC errors
- Ensure redirect URI is whitelisted in Authentik

### API Errors:
- Check network tab in browser dev tools
- Verify API base URL in `.env`
- Ensure authentication token is valid
- Check CORS settings on backend

### Build Issues:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Resources

- **Figma Designs:**
  - [Main App](https://www.figma.com/design/2E2oOsmFauq4jQBwMZCBEK/Web-CBOI-UPI_V2)
  - [Help & Support](https://www.figma.com/design/qIuZKTa1yVfHu248dxlyah/CBOI-Merchant-Web)

- **Documentation:**
  - [Soundbox Language Update](https://docs.google.com/document/d/1POqpDfBV8a-mlfdFysLYLgSEs_VRFR11cuLgs6QsOTU/edit)
  - [User Fetch for Merchant](https://docs.google.com/document/d/1No35QR3u02XvYXOdtZuB-jvtmyK5nUQdQ4ZBboeBK5g/edit)
  - [QR Code Generation](https://docs.google.com/document/d/1-v1HJykBI9rBMABNyiOcwiuKErmmBJ8N5k3wwhdI2EM/edit)
  - [Merchant Onboarding](https://docs.google.com/document/d/161dasm5KXtj-DKBsK4kt7SegBiDeFdDyRmitGto5KUw/edit)

## 🚢 Deployment

### Production Build:
```bash
npm run build
```

### Deployment Steps:
1. Update `.env.production` with production values
2. Build the application
3. Deploy the `build/` folder to your hosting service
4. Configure production Authentik redirect URI
5. Ensure CORS is configured on backend API

### Hosting Options:
- Netlify
- Vercel
- AWS S3 + CloudFront
- Azure Static Web Apps
- GitHub Pages (requires HashRouter)

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Review this setup guide
3. Verify environment variables
4. Check API endpoints and authentication

---

**Version:** 1.0.0  
**Last Updated:** April 2026  
**Created for:** Nagarro - CBOI Merchant Portal Project

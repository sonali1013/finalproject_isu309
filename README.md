# CBOI Merchant Application

## Overview
CBOI (Central Bank of India) Merchant Web Application for managing VPA, transactions, QR codes, and soundbox language settings.

## Features
- **Authentik SSO Authentication**: Secure login via external authentication provider
- **Dashboard**: View all associated VPAs
- **Transaction Reports**: View and filter transaction history (monthly/custom date range)
- **QR Code Management**: Generate and display QR codes for VPAs
- **Language Settings**: Configure soundbox language preferences

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Update `.env` for development
   - Update `.env.production` for production

## Development

Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## Build

Create a production build:
```bash
npm run build
```

## Project Structure

```
src/
├── config/          # Authentication and app configuration
├── services/        # API services and utilities
├── pages/           # Application pages
├── components/      # Reusable components
├── utils/           # Utility functions
└── App.js           # Main application component
```

## API Documentation

Refer to the following resources:
- [CBOI Soundbox Language Update](https://docs.google.com/document/d/1POqpDfBV8a-mlfdFysLYLgSEs_VRFR11cuLgs6QsOTU/edit?tab=t.0)
- [CBOI User Fetch for Merchant](https://docs.google.com/document/d/1No35QR3u02XvYXOdtZuB-jvtmyK5nUQdQ4ZBboeBK5g/edit?tab=t.0)
- [CBOI QR Code Generation](https://docs.google.com/document/d/1-v1HJykBI9rBMABNyiOcwiuKErmmBJ8N5k3wwhdI2EM/edit?tab=t.0)
- [CBOI Merchant Onboarding](https://docs.google.com/document/d/161dasm5KXtj-DKBsK4kt7SegBiDeFdDyRmitGto5KUw/edit?tab=t.0)

## Design Files

- [Main App Figma](https://www.figma.com/design/2E2oOsmFauq4jQBwMZCBEK/Web-CBOI-UPI_V2?node-id=0-1&p=f&t=gmXAjxFHlEIROAwy-0)
- [Help & Support Figma](https://www.figma.com/design/qIuZKTa1yVfHu248dxlyah/CBOI-Merchant-Web?node-id=0-1&p=f&t=juOBYyPWDeDLUUTH-0)

# API Connection Guide - CBOI Merchant Portal

## Current Status

✅ **Mock Data Mode is ACTIVE**  
The application is now running with mock data to allow you to test the UI while the API connection is being configured.

## What Was Fixed

### 1. User Name Display ✅
- **Before:** Showing user ID (9348781833)
- **After:** Showing user's full name from `adminName` field
- **Location:** Top right corner of the header

### 2. Mock Data Implementation ✅
Since the API endpoint `https://api-uat.isupay.in` cannot be resolved (DNS error), I've implemented a mock data system that provides:
- ✅ Sample VPA data (3 test VPAs)
- ✅ Sample transaction data (5 test transactions)
- ✅ Sample languages (8 languages including Hindi, English, Tamil, etc.)
- ✅ All API calls now work with mock data

### 3. Orange Warning Banner ✅
An orange warning banner appears at the top of the page indicating:
- You're in development mode
- Mock data is being used
- How to switch to real API

## How to Test Now

1. **Save the file** and the React app will auto-reload
2. You should see:
   - ✅ Orange banner at the top
   - ✅ User's full name in header (not ID)
   - ✅ Dashboard showing 3 test VPAs
   - ✅ All pages work with sample data

3. **Test all features:**
   - Dashboard: View VPAs
   - Transactions: Filter by date and VPA
   - QR Code: Generate and download QR codes
   - Language: Change soundbox language

## How to Connect to Real API

When you have the **correct API URL**, follow these steps:

### Step 1: Update `.env` File

Open the `.env` file and update:

```env
# API Configuration
REACT_APP_API_BASE_URL=https://your-correct-api-url.com

# Set this to false to use real API
REACT_APP_USE_MOCK_DATA=false
```

### Step 2: Restart the Development Server

```bash
# Press Ctrl+C to stop the current server
# Then restart:
npm start
```

### Step 3: Verify Connection

Open browser console (F12) and check for:
- ✅ No more orange banner
- ✅ Real API calls being made
- ✅ Actual data from your backend

## Common API URL Patterns

The correct API URL might be one of these:

```
https://api-uat.isupay.in/api
https://merchant-api-uat.isupay.in
https://cboi-api-stage.isupay.in
https://api.cboi-uat.isupay.in
https://uat-api.isupay.in/merchant
```

**Ask your backend team or check API documentation for the correct URL.**

## If You Need VPN

Some UAT environments require VPN access:
1. Connect to your company VPN
2. Then try accessing the API
3. If it works, update the `.env` file as shown above

## API Endpoint Reference

The app calls these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/merchant/fetchById?userId={id}` | GET | Get all VPAs |
| `/merchant/report?startDate={date}&endDate={date}&vpaId={id}` | GET | Get transactions |
| `/merchant/convertToQRBase64` | POST | Convert QR string |
| `/merchant/currentLanguage?merchantId={id}` | GET | Get current language |
| `/merchant/fetchAllLanguage` | GET | Get all languages |
| `/merchant/updateLanguage` | POST | Update language |

## Mock Data Details

### VPAs (3 sample entries):
1. `9348781833@bank` - Test Merchant Store (Active)
2. `merchant.shop@cboi` - Demo Shop (Active)
3. `store9348781833@upi` - Sample Store (Inactive)

### Transactions (5 sample entries):
- Mix of Success, Pending, and Failed transactions
- All dated today (2026-04-11)
- Amounts ranging from ₹150 to ₹1200

### Languages (8 options):
Hindi, English, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi

## Troubleshooting

### Orange Banner Still Shows
- Make sure you set `REACT_APP_USE_MOCK_DATA=false` in `.env`
- Restart the dev server (`npm start`)

### API Still Not Working
1. Check browser console for specific error
2. Verify API URL is correct
3. Check if you need VPN access
4. Verify CORS is enabled on backend
5. Check if authentication token is valid

### Data Looks Wrong
- Make sure mock mode is disabled
- Clear browser cache
- Check API response in Network tab

## Files Modified

1. `.env` - Added `REACT_APP_USE_MOCK_DATA=true`
2. `src/services/mockData.js` - Mock data definitions
3. `src/services/merchantService.js` - Added mock data fallback
4. `src/components/MockDataBanner.js` - Warning banner component
5. `src/components/Layout.js` - Updated to show full name and banner
6. `src/pages/Dashboard.js` - Improved error handling

## Next Steps

1. ✅ Test the UI with mock data (now)
2. ⏳ Get correct API URL from backend team
3. ⏳ Update `.env` with real API URL
4. ⏳ Set `REACT_APP_USE_MOCK_DATA=false`
5. ⏳ Test with real backend

## Need Help?

If you encounter issues:
1. Share the browser console errors
2. Share the Network tab request details
3. Provide the correct API documentation
4. I can help adjust the API integration accordingly

---

**Status:** 🟢 Mock Data Mode Active - UI Fully Functional  
**Next:** Get real API URL to connect to backend

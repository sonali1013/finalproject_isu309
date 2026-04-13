# Debugging Instructions for VPA Loading Issue

## Changes Made

### 1. Display User's Full Name
- **Updated:** `src/components/Layout.js`
- **Change:** Now displays `adminName` from user profile (full name) instead of `user_name` (user ID)
- **Fallback Order:** adminName → name → email → user_name → 'User'

### 2. Improved VPA Fetching
- **Updated:** `src/pages/Dashboard.js`, `src/pages/QRCode.js`, `src/pages/TransactionReport.js`
- **Changes:**
  - Added detailed console logging to track the API call
  - Improved response structure handling (supports multiple API response formats)
  - Better error messages that show the actual error from API

## How to Debug

### Step 1: Open Browser Developer Tools
1. In your browser, press `F12` or right-click and select "Inspect"
2. Go to the "Console" tab

### Step 2: Reload the Page
- You should now see console logs showing:
  ```
  User profile: {user_name, adminName, email, etc.}
  Fetching VPAs for userId: [the user ID]
  VPA API response: [the actual response or error]
  ```

### Step 3: Check for Errors

#### Common Issues:

**A. Network Error / CORS Issue**
- **Console shows:** `Network Error` or CORS policy error
- **Solution:** 
  - Verify the API base URL in `.env` file
  - Check if API server is running
  - Ensure CORS is enabled on the backend API

**B. 401 Unauthorized**
- **Console shows:** Error 401
- **Solution:** Authentication token issue
  - Try logging out and logging in again
  - Check if Authentik session is valid

**C. 404 Not Found**
- **Console shows:** Error 404
- **Solution:** API endpoint might be incorrect
  - Verify the endpoint URL: `/merchant/fetchById`
  - Check if the API expects a different parameter name

**D. Wrong API Base URL**
- **Current setting in `.env`:** `REACT_APP_API_BASE_URL=https://api-uat.isupay.in`
- **To change:** Update the `.env` file with correct API URL

### Step 4: Check Network Tab

1. In Developer Tools, go to "Network" tab
2. Reload the page
3. Look for the API call to `fetchById`
4. Click on it to see:
   - Request URL (is it correct?)
   - Request Headers (is Authorization token present?)
   - Response (what did the API return?)

### Step 5: Verify API Endpoint

The app is calling:
```
GET /merchant/fetchById?userId=[user_id]
```

**Check if your API expects:**
- Different parameter name? (e.g., `merchantId`, `username`)
- Different HTTP method? (POST instead of GET)
- Different endpoint path? (e.g., `/api/merchant/fetchById`)

## Quick Fixes to Try

### Fix 1: Update API Base URL
Edit `.env` file:
```env
REACT_APP_API_BASE_URL=https://your-actual-api-url.com
```

Then restart the dev server:
```bash
npm start
```

### Fix 2: Change API Parameter Name
If the API expects a different parameter name, edit `src/services/merchantService.js`:

```javascript
fetchById: async (userId) => {
  try {
    const response = await apiClient.get(`/merchant/fetchById`, {
      params: { 
        merchantId: userId  // Change 'userId' to whatever your API expects
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching VPAs:', error);
    throw error;
  }
}
```

### Fix 3: Mock Data for Testing
If you want to test the UI without a working API, you can temporarily add mock data in `Dashboard.js`:

```javascript
const fetchVPAs = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Temporary mock data for testing
    const mockVpas = [
      {
        id: 1,
        vpaAddress: 'merchant@bank',
        merchantName: 'Test Merchant',
        bankCode: 'BANK001',
        status: 'Active',
        qrString: 'upi://pay?pa=merchant@bank&pn=Test%20Merchant'
      }
    ];
    
    setVpas(mockVpas);
    setSelectedVpa(mockVpas[0]);
    
  } catch (err) {
    console.error('Error fetching VPAs:', err);
    setError('Failed to load VPA list. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

## Next Steps

1. Check the console logs and share what you see
2. Check the Network tab and share the API call details
3. Verify the correct API base URL and endpoint structure
4. If needed, I can help update the API service to match your backend requirements

## Need More Help?

Share the following information:
1. Console error messages (from Console tab)
2. Network request details (from Network tab)
3. Actual API endpoint URL and expected parameters
4. API documentation or sample response structure

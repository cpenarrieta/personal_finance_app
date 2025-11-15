# Personal Finance Mobile App

React Native mobile app for viewing personal finance transactions.

## Features

- OAuth authentication (Google & GitHub) using Better Auth
- View recent transactions with details
- Pull to refresh
- Same authentication constraints as web app (email gating)

## Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure API URL

Edit `config.ts` and update the `API_URL`:

```typescript
export const config = {
  // For local development on physical device, use your computer's IP
  // Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
  API_URL: 'http://192.168.1.100:3000', // Replace with your IP

  // For iOS simulator:
  // API_URL: 'http://localhost:3000'

  // For Android emulator:
  // API_URL: 'http://10.0.2.2:3000'
}
```

### 3. Update OAuth Redirect URIs

Add the mobile app redirect URI to your OAuth providers:

**Google OAuth Console:**
- Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Add authorized redirect URI: `personalfinance://`

**GitHub OAuth Settings:**
- Go to [GitHub OAuth Apps](https://github.com/settings/developers)
- Add authorization callback URL: `personalfinance://`

### 4. Run the App

```bash
# Start Expo dev server
npm start

# Or run directly on platform
npm run ios      # iOS simulator (Mac only)
npm run android  # Android emulator
npm run web      # Web browser
```

### 5. Scan QR Code

- Install **Expo Go** on your phone
- Scan the QR code from the terminal
- App will load on your device

## Authentication Flow

1. Tap "Continue with Google" or "Continue with GitHub"
2. Browser opens with OAuth login
3. After successful login, redirects back to app
4. Session cookie is stored automatically
5. View transactions

## Troubleshooting

### Cannot connect to API

**Problem:** App can't reach the Next.js backend

**Solutions:**
- Ensure Next.js dev server is running on your computer
- Update `config.ts` with your computer's local IP address
- Make sure phone and computer are on the same WiFi network
- Check firewall settings allow connections on port 3000

### Authentication fails

**Problem:** OAuth login doesn't work

**Solutions:**
- Verify redirect URIs are configured in OAuth providers
- Check `BETTER_AUTH_URL` in backend .env file
- Ensure `ALLOWED_EMAILS` includes your email
- Try clearing app data and logging in again

### Cookies not working

**Problem:** Session not persisting

**Note:** React Native's `fetch` API handles cookies differently than browsers. If you experience issues:

1. Check browser console for CORS errors
2. Ensure `credentials: 'include'` is set in fetch calls (already done)
3. Consider using a different HTTP client like `axios` with cookie support

## Project Structure

```
mobile/
├── screens/
│   ├── LoginScreen.tsx          # OAuth login UI
│   └── TransactionsScreen.tsx   # Transaction list
├── lib/
│   └── auth.ts                  # Auth utilities
├── config.ts                    # API configuration
├── App.tsx                      # Main app component
└── package.json
```

## API Endpoints Used

- `GET /api/transactions?limit=100` - Fetch transactions
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/login/google` - Google OAuth (via browser)
- `GET /api/auth/login/github` - GitHub OAuth (via browser)

## Development Notes

- Authentication state stored in AsyncStorage
- Session managed by Better Auth cookies
- Transactions cached and refreshable
- Supports pull-to-refresh

## Next Steps

Consider adding:
- Transaction search/filter
- Date range selection
- Category filtering
- Transaction details view
- Offline support
- Push notifications for new transactions

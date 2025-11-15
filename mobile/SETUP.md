# Mobile App Setup Guide

Step-by-step guide to get the Personal Finance mobile app running.

## Prerequisites

- Node.js 18+ installed
- Expo Go app installed on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Next.js backend running (see main README.md)
- Same WiFi network for phone and computer

## Step 1: Install Dependencies

```bash
cd mobile
npm install
```

## Step 2: Find Your Computer's IP Address

### macOS/Linux:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Windows:
```bash
ipconfig
```

Look for your local IP (usually starts with `192.168.` or `10.0.`)

Example: `192.168.1.100`

## Step 3: Configure API URL

Edit `mobile/config.ts`:

```typescript
export const config = {
  API_URL: 'http://192.168.1.100:3000', // ← Replace with YOUR IP
  REDIRECT_SCHEME: 'personalfinance',
}
```

**Important:**
- Don't use `localhost` (won't work on physical devices)
- iOS Simulator can use `localhost`
- Android Emulator should use `10.0.2.2`

## Step 4: Update OAuth Redirect URIs

### Google OAuth Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   ```
   personalfinance://
   ```
4. Click "Save"

### GitHub OAuth Settings

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Select your OAuth App
3. Under "Authorization callback URL", add:
   ```
   personalfinance://
   ```
4. Click "Update application"

## Step 5: Start the Backend

Make sure your Next.js app is running:

```bash
# In the root directory (not mobile/)
npm run dev
```

Verify it's accessible at `http://YOUR_IP:3000`

## Step 6: Start the Mobile App

```bash
# In mobile/ directory
npm start
```

You should see:
- QR code in the terminal
- Development server starting
- Metro bundler running

## Step 7: Open on Your Phone

1. Open **Expo Go** app on your phone
2. Scan the QR code:
   - **iOS**: Use Camera app, then tap the notification
   - **Android**: Use Expo Go's built-in QR scanner
3. App will load and show login screen

## Step 8: Test Authentication

1. Tap "Continue with Google" or "Continue with GitHub"
2. Browser opens with OAuth login
3. Sign in with your authorized email
4. Browser redirects back to app
5. You should see the transactions list

## Troubleshooting

### "Network request failed"

**Problem:** Can't connect to backend

**Solutions:**
1. Verify backend is running: Open `http://YOUR_IP:3000` in phone browser
2. Check firewall allows port 3000
3. Ensure phone and computer on same WiFi
4. Restart Expo dev server

### "Unauthorized" after login

**Problem:** Your email is not in `ALLOWED_EMAILS`

**Solution:** Add your email to `.env` file:
```bash
ALLOWED_EMAILS=youremail@gmail.com
```

### OAuth redirect doesn't work

**Problem:** After OAuth login, doesn't redirect to app

**Solutions:**
1. Verify `personalfinance://` is added to OAuth providers
2. Check `mobile/app.json` has `"scheme": "personalfinance"`
3. Try logging out and logging in again
4. Clear Expo cache: `expo start -c`

### "Unable to resolve module"

**Problem:** Import errors or missing dependencies

**Solution:**
```bash
cd mobile
rm -rf node_modules
npm install
expo start -c
```

### Transactions not loading

**Problem:** API returns 401/403 or no data

**Debug:**
1. Check browser devtools network tab
2. Verify cookies are being sent (check `credentials: 'include'`)
3. Try logging out and back in
4. Check backend logs for errors

### CORS errors

**Problem:** Cross-origin request blocked

**Solution:** The Next.js backend should allow requests from any origin for development. If you still see CORS errors, you may need to add CORS headers to the API routes.

## Development Tips

### Hot Reload

Changes to React Native code will hot reload automatically. Shake your device or press:
- **iOS**: Cmd+D in simulator
- **Android**: Cmd+M (Mac) or Ctrl+M (Windows/Linux)

### Debugging

1. Open Developer Menu (shake device)
2. Tap "Debug Remote JS"
3. Chrome DevTools opens
4. Use console.log() to debug

### Testing on Emulator/Simulator

**iOS Simulator (Mac only):**
```bash
npm run ios
```
Use `API_URL: 'http://localhost:3000'`

**Android Emulator:**
```bash
npm run android
```
Use `API_URL: 'http://10.0.2.2:3000'`

## Next Steps

Once the app is running, you can:

1. **Test transactions**: Pull down to refresh
2. **Try filtering**: See different transaction types
3. **Test logout**: Tap logout button, should return to login
4. **Check tags**: View transactions with custom tags
5. **Verify categories**: See category icons and names

## Production Deployment

For production deployment:

1. Build standalone apps with EAS Build
2. Use production API URL (HTTPS)
3. Update OAuth redirect URIs for production domain
4. Consider adding:
   - Push notifications
   - Offline support
   - Biometric authentication
   - Analytics

See [Expo EAS Build docs](https://docs.expo.dev/build/introduction/) for more info.

## Common Configurations

### For iOS Simulator (Mac)
```typescript
// config.ts
API_URL: 'http://localhost:3000'
```

### For Android Emulator
```typescript
// config.ts
API_URL: 'http://10.0.2.2:3000'
```

### For Physical Devices
```typescript
// config.ts
API_URL: 'http://192.168.1.100:3000' // Your computer's IP
```

### For Production
```typescript
// config.ts
API_URL: 'https://your-domain.com'
```

## Support

If you encounter issues:

1. Check the [mobile/README.md](./README.md) for troubleshooting
2. Review [Expo documentation](https://docs.expo.dev/)
3. Check [Better Auth docs](https://www.better-auth.com/docs) for auth issues
4. Open an issue in the repository

Happy coding! 🚀

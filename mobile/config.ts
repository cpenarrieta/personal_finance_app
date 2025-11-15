/**
 * App configuration
 * Update API_URL to point to your Next.js backend
 */

export const config = {
  // For local development, use your computer's IP address
  // Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
  // Example: 'http://192.168.1.100:3000'
  API_URL: 'http://localhost:3000',

  // OAuth redirect scheme - must match app.json scheme
  REDIRECT_SCHEME: 'personalfinance',
}

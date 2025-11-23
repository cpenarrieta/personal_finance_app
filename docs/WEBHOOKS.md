# Plaid Webhooks

This document explains how to set up and use Plaid webhooks in the personal finance app.

## Overview

Plaid webhooks allow the app to receive real-time notifications when new transaction data is available, eliminating the need for frequent polling. This keeps your financial data automatically up-to-date without manual syncing.

## Webhook Endpoint

The webhook endpoint is located at:
```
POST /api/plaid/webhook
```

In production, the full URL would be:
```
https://yourdomain.com/api/plaid/webhook
```

## Supported Webhook Types

### Transaction Webhooks
The webhook handler processes these transaction webhook codes:

- **SYNC_UPDATES_AVAILABLE**: New transaction updates are available via the `/transactions/sync` endpoint
- **DEFAULT_UPDATE**: Legacy webhook indicating transaction updates are available
- **INITIAL_UPDATE**: Initial historical transaction update is complete
- **HISTORICAL_UPDATE**: Historical transaction update is complete
- **TRANSACTIONS_REMOVED**: Transactions have been removed

### Item Webhooks
The webhook handler also monitors item status:

- **ERROR**: Item has encountered an error (e.g., invalid credentials)
- **PENDING_EXPIRATION**: Item credentials will expire soon
- **LOGIN_REPAIRED**: Item login has been repaired

## Setting Up Webhooks in Plaid Dashboard

1. **Log in to your Plaid Dashboard**
   - Go to [https://dashboard.plaid.com](https://dashboard.plaid.com)

2. **Navigate to Webhooks**
   - Click on "API" in the left sidebar
   - Select "Webhooks"

3. **Add Webhook URL**
   - Click "Add webhook URL"
   - Enter your webhook URL: `https://yourdomain.com/api/plaid/webhook`
   - Select the webhook types you want to receive (recommended: TRANSACTIONS, ITEM)
   - Click "Add"

4. **Test the Webhook** (Optional)
   - Plaid provides a webhook testing tool in the dashboard
   - You can send test webhooks to verify your endpoint is working

## Environment Configuration

### Development
For local development and testing, webhook verification is optional.

## How It Works

1. **Plaid sends a webhook** when transaction updates are available
2. **Webhook handler verifies** the request is from Plaid
3. **Handler identifies the item** based on the `item_id` in the webhook payload
4. **Syncs transactions** for the affected item using the existing sync logic
5. **Invalidates caches** to ensure fresh data is displayed
6. **Returns 200 OK** to acknowledge receipt

## Testing Webhooks Locally

### Using ngrok

If you want to test webhooks during local development:

1. **Install ngrok**
   ```bash
   npm install -g ngrok
   # or
   brew install ngrok  # macOS
   ```

2. **Start your development server**
   ```bash
   npm run dev
   ```

3. **Create a tunnel to localhost**
   ```bash
   ngrok http 3000
   ```

4. **Configure Plaid webhook**
   - Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - In Plaid Dashboard, set webhook URL to: `https://abc123.ngrok.io/api/plaid/webhook`

5. **Trigger a test webhook**
   - Use Plaid's webhook testing tool or perform a transaction sync
   - Check your local console for webhook logs

### Manual Testing

You can also manually trigger the webhook endpoint using curl:

```bash
curl -X POST https://yourdomain.com/api/plaid/webhook \
  -H "Content-Type: application/json" \
  -H "Plaid-Verification: test-verification-header" \
  -d '{
    "webhook_type": "TRANSACTIONS",
    "webhook_code": "SYNC_UPDATES_AVAILABLE",
    "item_id": "your-plaid-item-id"
  }'
```

## Monitoring

The webhook handler logs all events to the console with descriptive emojis:

- 🔔 Webhook received
- ✅ Success
- ❌ Error
- ⚠️  Warning
- ℹ️  Info
- 🔄 Syncing
- 📊 Processing

Check your application logs to monitor webhook activity:

```bash
# For local development
npm run dev

# For production (depends on your hosting)
# Vercel: Check function logs in dashboard
# Railway: Check deployment logs
# Other: Check your platform's logging solution
```

## Troubleshooting

### Webhook not receiving data
- Verify the webhook URL is correct in Plaid Dashboard
- Check that your server is publicly accessible (not localhost)
- Ensure the endpoint returns 200 OK
- Check Plaid Dashboard > Webhooks > Activity Log for delivery attempts

### Verification failures
- Check the `Plaid-Verification` header is present
- Review webhook verification logs

### Transactions not syncing
- Check application logs for errors during sync
- Verify the `item_id` in the webhook matches an item in your database
- Ensure the item has a valid access token

### Duplicate webhooks
- Plaid may send the same webhook multiple times
- The sync logic uses upsert operations to handle duplicates safely
- No action needed - duplicates are handled automatically

## Security Considerations

1. **Always enable webhook verification**
2. **Use HTTPS** for your webhook endpoint
3. **Return 200 OK** quickly - perform heavy processing asynchronously if needed
4. **Log webhook activity** for monitoring and debugging
5. **Handle errors gracefully** to avoid Plaid disabling your webhook

## Additional Resources

- [Plaid Webhooks Documentation](https://plaid.com/docs/api/webhooks/)
- [Plaid Transaction Sync Guide](https://plaid.com/docs/transactions/sync/)
- [Webhook Verification](https://plaid.com/docs/api/webhooks/webhook-verification/)

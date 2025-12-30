# Plaid Webhooks

Real-time transaction sync via Plaid webhooks.

## Endpoint

```
POST /api/plaid/webhook
```

Production: `https://yourdomain.com/api/plaid/webhook`

## Supported Webhooks

### Transactions
- `SYNC_UPDATES_AVAILABLE` - New updates via `/transactions/sync`
- `DEFAULT_UPDATE`, `INITIAL_UPDATE`, `HISTORICAL_UPDATE` - Transaction updates
- `TRANSACTIONS_REMOVED` - Transactions deleted

### Item Status
- `ERROR` - Invalid credentials
- `PENDING_EXPIRATION` - Credentials expiring
- `LOGIN_REPAIRED` - Login fixed

## Plaid Dashboard Setup

1. Go to [dashboard.plaid.com](https://dashboard.plaid.com) → API → Webhooks
2. Add: `https://yourdomain.com/api/plaid/webhook`
3. Select: TRANSACTIONS, ITEM

## Environment

```bash
# Production (recommended)
PLAID_WEBHOOK_VERIFICATION_KEY="your-verification-key"

# Development - optional, logs warning if missing
```

## How It Works

1. Plaid sends webhook
2. Handler verifies request
3. Identifies item by `item_id`
4. Syncs transactions
5. Invalidates caches
6. Returns 200 OK

## Local Testing with ngrok

```bash
ngrok http 3000
# Copy HTTPS URL → Plaid Dashboard webhook URL
```

## Manual Test

```bash
curl -X POST https://yourdomain.com/api/plaid/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_type": "TRANSACTIONS",
    "webhook_code": "SYNC_UPDATES_AVAILABLE",
    "item_id": "your-plaid-item-id"
  }'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Not receiving | Check URL in Plaid Dashboard, ensure public access |
| Verification fails | Check `Plaid-Verification` header |
| Transactions not syncing | Verify `item_id` matches database |
| Duplicates | Handled automatically via upsert |

## Resources

- [Plaid Webhooks](https://plaid.com/docs/api/webhooks/)
- [Transaction Sync](https://plaid.com/docs/transactions/sync/)
- [Webhook Verification](https://plaid.com/docs/api/webhooks/webhook-verification/)

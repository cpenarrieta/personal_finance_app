#!/bin/bash

# Contract Test Runner
# Runs API contract tests against a local or remote API

set -e  # Exit on error

echo "🧪 Running Mobile API Contract Tests"
echo ""

# Check if API_URL is provided
if [ -z "$API_URL" ]; then
  echo "📍 API_URL not set, using default: http://localhost:3000"
  export API_URL="http://localhost:3000"
else
  echo "📍 Using API_URL: $API_URL"
fi

# Check if API is reachable
echo ""
echo "🔍 Checking if API is reachable..."
if curl -s -f -o /dev/null "$API_URL/api/health" 2>/dev/null; then
  echo "✅ API is reachable at $API_URL"
else
  echo "⚠️  Warning: Could not reach $API_URL/api/health"
  echo "   Make sure your Next.js server is running:"
  echo "   cd .. && npm run dev"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Run tests
echo ""
echo "🚀 Running contract tests..."
npm run test:contract

echo ""
echo "✅ Contract tests completed!"

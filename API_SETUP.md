# API Setup Guide for Aced

This guide will help you set up real API integrations for your price comparison site.

## 🚀 Quick Start

Currently, the system is running in **mock data mode**. To enable real API calls:

1. Get API keys from the providers below
2. Update `config/api-config.js` with your keys
3. Set `USE_MOCK_DATA: false` in the config

## 🔑 API Providers

### 1. RapidAPI (Recommended - Multiple Retailers)
**Cost:** Free tier available, then paid plans
**Provides:** Amazon, Walmart, Target, Etsy, and more
**Setup:**
1. Go to [RapidAPI.com](https://rapidapi.com)
2. Sign up for a free account
3. Subscribe to these APIs:
   - [Amazon Products API](https://rapidapi.com/letscrape-6bRBa3QguO5/api/amazon-products1/)
   - [Walmart API](https://rapidapi.com/rapidapi/api/walmart-com1/)
   - [Target API](https://rapidapi.com/apidojo/api/target1/)
   - [Etsy API](https://rapidapi.com/restyler/api/etsy2/)
4. Copy your RapidAPI key to `config/api-config.js`

### 2. eBay Developer Program
**Cost:** Free
**Setup:**
1. Go to [developer.ebay.com](https://developer.ebay.com)
2. Create a developer account
3. Create a new application
4. Get your Client ID and Client Secret
5. Add them to `config/api-config.js`

### 3. Alternative: SerpAPI (Google Shopping)
**Cost:** Free tier: 100 searches/month
**Setup:**
1. Go to [SerpAPI.com](https://serpapi.com)
2. Sign up and get API key
3. Can search Google Shopping, Amazon, eBay, etc.

## 💡 Cost-Effective Options

### Free Tier Usage:
- **RapidAPI:** Usually 100-500 requests/month free per API
- **eBay:** 5,000 calls/day free
- **SerpAPI:** 100 searches/month free

### Budget-Friendly Approach:
1. Start with **eBay API** (completely free)
2. Add **SerpAPI** for Google Shopping (100 free searches)
3. Use **RapidAPI** free tiers for specific retailers
4. Upgrade as your traffic grows

## 🛠️ Configuration

Edit `config/api-config.js`:

```javascript
const API_CONFIG = {
    // Add your real API keys here
    RAPIDAPI_KEY: 'your-actual-rapidapi-key-here',
    EBAY_CLIENT_ID: 'your-ebay-client-id-here',
    
    // Enable real API calls
    USE_MOCK_DATA: false,
    
    // Other settings...
};
```

## 🔒 Security Notes

1. **Never commit real API keys to version control**
2. Add `config/api-config.js` to your `.gitignore`
3. Use environment variables in production
4. Consider using a backend proxy for API calls

## 📊 Testing

1. Keep `USE_MOCK_DATA: true` while developing
2. Test with real APIs gradually
3. Monitor your API usage quotas
4. Implement error handling for rate limits

## 🚀 Production Setup

For production, consider:
1. Moving API calls to a backend server
2. Implementing API key rotation
3. Adding request caching
4. Setting up monitoring and alerts

## 📞 Support

If you need help setting up APIs:
1. Check the API provider documentation
2. Test with tools like Postman first
3. Start with one API at a time
4. Monitor browser console for errors

---

**Current Status:** ✅ Mock data mode (no API keys required)
**Next Step:** Get RapidAPI key for multiple retailers at once!

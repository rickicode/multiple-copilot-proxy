# Copilot API - Multiple Account Usage Guide

## 🚀 Quick Start

### 1. Start Server
```bash
npm run build
npm start
```
atau
```bash
bun run build
bun start
```

### 2. Access Manager
Open your browser and visit (default port 4141, or specify with --port):
```
http://localhost:4141/manager
```
or if using custom port:
```
bun start --port 8080
# Then visit: http://localhost:8080/manager
```

### 3. Add GitHub Account
1. Click "Start GitHub Authentication"
2. Select account type (Individual/Business) 
3. Follow GitHub OAuth flow in new tab
4. Copy the generated API key

### 4. Use API
Use the API key with any OpenAI-compatible tool:

```bash
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Authorization: Bearer sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 🔧 API Endpoints

### Manager (No Auth)
- `GET /manager` - Web interface
- `GET /manager/api/stats` - Account statistics 
- `GET /manager/api/accounts` - List accounts
- `POST /manager/api/auth/start` - Start GitHub OAuth
- `POST /manager/api/auth/poll` - Poll for OAuth completion
- `DELETE /manager/api/accounts/:apiKey` - Delete account

### OpenAI-Compatible (Requires API Key)
- `POST /v1/chat/completions` - Chat completions
- `GET /v1/models` - List models
- `POST /v1/embeddings` - Create embeddings

## 🔑 Authentication

All API calls require API key in Authorization header:
```
Authorization: Bearer sk-your-api-key-here
```

## 📊 Features

✅ **Full Web Management** - No terminal auth required  
✅ **Multiple GitHub Accounts** - Unlimited accounts with unique API keys  
✅ **OpenAI Compatible** - Works with existing tools and libraries  
✅ **Auto Token Refresh** - Copilot tokens automatically refreshed  
✅ **Persistent Storage** - Accounts saved between restarts  
✅ **Copy-Paste API Keys** - Easy key management in web interface  

## 🛠️ Development

### File Structure
```
src/
├── lib/
│   ├── account-manager.ts    # Account CRUD operations
│   ├── auth-middleware.ts    # API key validation
│   └── state.ts             # Multi-user state management
├── routes/
│   └── manager/             # Web interface routes
└── static/
    └── manager.html         # Web interface UI

static/
└── manager.html             # Manager web interface
```

### Key Changes
- Manager uses separate HTML file instead of inline template
- Authentication moved to web interface only
- Server starts without requiring GitHub token setup
- Auth middleware only applied to API routes

## 📝 Notes

- GitHub Copilot subscription required for each account
- API keys start with `sk-` prefix like OpenAI
- Web interface auto-refreshes account status
- Server runs on port 4141 by default

# Multi-Account Copilot API - Clean Implementation

This document describes the clean multi-account implementation after removing legacy single-account code.

## 🏗️ Architecture Overview

### Core State Management
- **`multiUserState`**: Main state container for all accounts
- **`state`**: Legacy fallback state for backward compatibility (to be phased out)
- **Account isolation**: Each account has its own tokens, models, and settings

### Key Components

#### 1. State Management (`src/lib/state.ts`)
```typescript
export interface UserAccount {
  githubToken: string
  copilotToken?: string
  accountType: string
  models?: ModelsResponse
  vsCodeVersion?: string
  username?: string
  createdAt: string
  lastUsed: string
}

export interface MultiUserState {
  accounts: Map<string, UserAccount> // API key -> UserAccount
  globalState: GlobalState
}
```

#### 2. Account Manager (`src/lib/account-manager.ts`)
- Account creation and deletion
- API key generation (sk-xxx format)
- Persistent storage (accounts.json)
- Account validation and statistics

#### 3. Authentication Middleware (`src/lib/auth-middleware.ts`)
- API key validation for OpenAI endpoints
- Account context injection into requests
- Automatic last-used timestamp updates

#### 4. Web Interface
- **Manager**: `/manager` - Account management, GitHub OAuth
- **Tester**: `/manager/test` - API endpoint testing
- **Models View**: Per-account model listing

## 🚀 Key Features

### ✅ Implemented Features
1. **Multiple GitHub Accounts**: Each with separate API keys
2. **Account Isolation**: Separate tokens, models, usage tracking
3. **Web Management**: Easy account creation via GitHub OAuth
4. **API Testing**: Built-in tester for all endpoints
5. **Models Per Account**: Each account shows its available models
6. **OpenAI Compatibility**: Standard `/v1/*` endpoints
7. **Rate Limiting**: Global rate limiting across accounts
8. **Persistent Storage**: Accounts saved to `accounts.json`

### 🗑️ Removed Legacy Code
1. **Single Account State**: Removed global single-account variables
2. **CLI Auth**: Removed `src/auth.ts` - use web interface only
3. **Legacy Models Cache**: Removed `src/lib/models.ts` - models cached per account
4. **Single State Dependencies**: Updated all services to use account-specific state

## 📊 API Endpoints

### Manager API (No Auth Required)
```
GET /manager                    - Web management interface
GET /manager/test              - API testing interface
GET /manager/api/stats         - Account statistics
GET /manager/api/accounts      - List all accounts
GET /manager/api/models/:apiKey - Get models for specific account
POST /manager/api/auth/start   - Start GitHub OAuth flow
POST /manager/api/auth/poll    - Poll OAuth completion
DELETE /manager/api/accounts/:apiKey - Delete account
```

### OpenAI Compatible API (Requires API Key)
```
POST /v1/chat/completions      - Chat completions
GET /v1/models                 - List available models
POST /v1/embeddings           - Create embeddings
```

## 🔧 Usage

### Starting the Server
```bash
# Clean multi-account mode (no legacy options)
bun run src/main.ts start --port 8080

# Optional flags:
--manual          # Manual request approval
--rate-limit 5    # Rate limit seconds
--wait           # Wait on rate limit instead of error
--vision         # Enable vision capabilities
```

### Adding Accounts
1. Visit `http://localhost:8080/manager`
2. Click "Start GitHub Authentication"
3. Follow GitHub OAuth flow
4. Copy generated API key

### Using APIs
```bash
# Get models for account
curl -H "Authorization: Bearer sk-your-api-key" \
  http://localhost:8080/v1/models

# Chat completion
curl -H "Authorization: Bearer sk-your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}' \
     http://localhost:8080/v1/chat/completions
```

## 🧹 Code Organization

### Clean File Structure
```
src/
├── main.ts                 # Server entry point (cleaned)
├── server.ts              # Route setup
├── lib/
│   ├── state.ts           # Multi-account state management
│   ├── account-manager.ts # Account CRUD operations
│   ├── auth-middleware.ts # API key authentication
│   ├── rate-limit.ts      # Global rate limiting
│   └── token.ts           # Token management
├── routes/
│   ├── manager/           # Web interface routes
│   ├── chat-completions/  # Chat API routes
│   ├── models/            # Models API routes
│   └── embeddings/        # Embeddings API routes
├── services/
│   ├── copilot/           # GitHub Copilot API wrappers
│   └── github/            # GitHub OAuth services
└── static/
    ├── manager.html       # Account management UI
    └── test.html          # API testing UI
```

### Removed Files
- ❌ `src/auth.ts` - CLI authentication (use web interface)
- ❌ `src/lib/models.ts` - Global model cache (per-account now)

## 💡 Development Notes

### Adding New Endpoints
1. Create route handler with auth middleware
2. Extract account from context: `getAccountFromContext(c)`
3. Pass account to service functions
4. Update web tester if needed

### Account-Specific Services
All Copilot API services now accept `UserAccount` parameter:
```typescript
export const serviceName = async (payload: any, userAccount?: UserAccount) => {
  // Create temporary state for API compatibility
  const stateToUse = userAccount ? createStateFromAccount(userAccount) : state
  // Use stateToUse for API calls
}
```

## 🔒 Security Considerations

1. **API Keys**: Generated with `sk-` prefix, stored securely
2. **Account Isolation**: No cross-account data access
3. **Rate Limiting**: Global limits prevent abuse
4. **Token Management**: Automatic token refresh per account
5. **Error Handling**: No sensitive data in error messages

## 📈 Monitoring

### Account Statistics
- Total accounts
- Active accounts (with valid Copilot tokens)
- Usage tracking per account
- Last used timestamps

### Logging
- Request routing by account
- Authentication attempts
- Rate limit events
- Token refresh activities

This implementation provides a clean, scalable multi-account system without legacy single-account dependencies.

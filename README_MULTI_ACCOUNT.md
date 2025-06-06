# Copilot API - Multiple Account Support

This version of Copilot API has been modified to support multiple GitHub Copilot accounts using API keys for authentication, similar to OpenAI's API.

## 🆕 New Features

### Multiple Account Management
- Support for unlimited GitHub Copilot accounts
- Each account gets a unique API key (format: `sk-xxx...`)
- Web-based management interface at `/manager`
- Persistent storage of account data

### API Key Authentication
- OpenAI-compatible API key format
- Use API keys in Authorization header: `Authorization: Bearer sk-xxx...`
- Per-account token management and refresh

### Web Manager Interface
- Visit `http://localhost:4141/manager` to manage accounts
- Add new accounts via GitHub OAuth
- View account status and usage
- Delete accounts when no longer needed

## 🚀 Quick Start

### 1. Start the Server
```bash
npm start
# or
bun run start
```

### 2. Configure Accounts
1. Open `http://localhost:4141/manager` in your browser
2. Click "Start GitHub Authentication"
3. Follow the OAuth flow to link your GitHub account
4. Copy the generated API key

### 3. Use with OpenAI-Compatible Tools

#### cURL Example
```bash
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Authorization: Bearer sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

#### Python Example
```python
import openai

client = openai.OpenAI(
    api_key="sk-your-api-key-here",
    base_url="http://localhost:4141/v1"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## 🔧 API Endpoints

### Manager Endpoints (No Auth Required)
- `GET /manager` - Web management interface
- `GET /manager/api/stats` - Account statistics
- `GET /manager/api/accounts` - List all accounts
- `POST /manager/api/auth/start` - Start GitHub OAuth
- `POST /manager/api/auth/poll` - Poll for OAuth completion
- `DELETE /manager/api/accounts/:apiKey` - Delete account

### API Endpoints (Require API Key)
- `POST /chat/completions` - Chat completions
- `POST /v1/chat/completions` - Chat completions (v1)
- `GET /models` - List available models
- `GET /v1/models` - List available models (v1)
- `POST /embeddings` - Create embeddings
- `POST /v1/embeddings` - Create embeddings (v1)

## 🔐 Authentication

### API Key Format
- All API keys start with `sk-`
- Example: `sk-abc123def456...`

### Using API Keys
Include the API key in the Authorization header:

```
Authorization: Bearer sk-your-api-key-here
```

Or just the key without "Bearer":
```
Authorization: sk-your-api-key-here
```

## 📁 Data Storage

Account data is stored in:
- Linux/Mac: `~/.local/share/copilot-api/accounts.json`
- Contains encrypted GitHub tokens and account metadata
- Automatically managed by the system

## 🔄 Migration from Single Account

The system maintains backward compatibility:
1. Existing single-account setups continue to work
2. Legacy `auth` command still available
3. Can gradually migrate to multi-account setup

## 🛠️ Configuration

### Environment Variables
- `COPILOT_API_PORT` - Server port (default: 4141)
- `COPILOT_API_DATA_DIR` - Custom data directory

### Command Line Options
```bash
npm start -- --port 8080 --verbose
```

Available options:
- `--port, -p` - Port to listen on (default: 4141)
- `--verbose, -v` - Enable verbose logging
- `--business` - Use business plan (legacy mode)
- `--manual` - Enable manual request approval
- `--rate-limit, -r` - Rate limit in seconds
- `--wait, -w` - Wait on rate limit instead of error
- `--vision` - Enable vision capabilities

## 🔒 Security Notes

1. **API Key Security**: Keep your API keys secure and don't commit them to version control
2. **Local Access**: Manager interface is accessible to anyone who can reach the server
3. **Token Storage**: GitHub tokens are stored locally in encrypted format
4. **Network**: Consider using HTTPS in production environments

## 🐛 Troubleshooting

### Account Not Working
1. Check if Copilot token is active in manager
2. Verify GitHub Copilot subscription is active
3. Try refreshing tokens by restarting the server

### API Key Issues
1. Ensure API key format is correct (`sk-xxx...`)
2. Check that account exists in manager
3. Verify Authorization header format

### Manager Interface Issues
1. Clear browser cache
2. Check server logs for errors
3. Ensure port 4141 is accessible

## 📝 Example Usage

### Adding Multiple Accounts
```bash
# Start server
npm start

# Open manager in browser
open http://localhost:4141/manager

# Add Account 1 (Personal)
# Add Account 2 (Work)
# Add Account 3 (Project)
```

### Using Different Accounts
```python
# Personal account
personal_client = openai.OpenAI(
    api_key="sk-personal-key-here",
    base_url="http://localhost:4141/v1"
)

# Work account  
work_client = openai.OpenAI(
    api_key="sk-work-key-here", 
    base_url="http://localhost:4141/v1"
)

# Use different accounts for different purposes
personal_response = personal_client.chat.completions.create(...)
work_response = work_client.chat.completions.create(...)
```

## 🚦 Status Indicators

In the manager interface:
- 🟢 **Active**: Account has valid Copilot token
- 🔴 **Inactive**: Account needs token refresh or Copilot subscription issue
- ⚠️ **Warning**: Account exists but may have issues

## 🤝 Contributing

This is a modified version of the original Copilot API. Key changes:
- Multi-account state management
- API key authentication system
- Web management interface
- Persistent account storage

For issues or contributions, please refer to the original project or create issues specific to multi-account functionality.

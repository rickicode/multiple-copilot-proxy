# Copilot API - Enhanced Multi-Account Manager

⚠️ **EDUCATIONAL PURPOSE ONLY** ⚠️
This project is a reverse-engineered implementation of the GitHub Copilot API created for educational purposes only. It is not officially supported by GitHub and should not be used in production environments.

## 🔗 Fork Information

This project is forked from [ericc-ch/copilot-api](https://github.com/ericc-ch/copilot-api) and has been enhanced with:
- **Multi-account management** with web interface
- **Basic authentication** for security
- **Duplicate account prevention**
- **Enhanced user experience** with improved UI/UX
- **Dynamic configuration** support

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E519XS7W)

## Project Overview

A wrapper around GitHub Copilot API to make it OpenAI compatible, making it usable for other tools like AI assistants, local interfaces, and development utilities. This enhanced version includes a web-based manager interface for managing multiple GitHub Copilot accounts with API keys.

## Demo

https://github.com/user-attachments/assets/7654b383-669d-4eb9-b23c-06d7aefee8c5

## Prerequisites

- Bun (>= 1.2.x)
- GitHub account with Copilot subscription (Individual or Business)

## Installation

To install dependencies, run:

```sh
bun install
```

## Using with docker

Build image

```sh
docker build -t copilot-api .
```

Run the container

```sh
docker run -p 4141:4141 copilot-api
```

### Docker with Volume Binding

To persist account data across container restarts, use volume binding:

```sh
# Create data directory on host
mkdir -p ./data

# Run with volume binding
docker run -p 4141:4141 -v $(pwd)/data:/app/data copilot-api
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  copilot-api:
    build: .
    ports:
      - "4141:4141"
    volumes:
      - ./data:/app/data
    environment:
      - MANAGER_USERNAME=admin
      - MANAGER_PASSWORD=hijilabs
```

Then run:

```sh
docker-compose up -d
```

## Using with npx

You can run the project directly using npx:

```sh
npx copilot-api@latest start
```

With options:

```sh
npx copilot-api@latest start --port 8080
```


## 🎮 Web Interface Usage

This enhanced version uses a **web-based interface** instead of CLI commands for GitHub authentication and account management.

### Quick Start

1. **Start the server**:
   ```sh
   bun run start
   # or
   npx copilot-api@latest start
   ```

2. **Access the Manager Interface**:
   - Open your browser and go to `http://localhost:4141/manager`
   - Login with credentials: `admin` / `hijilabs` (or your custom credentials)

3. **Add GitHub Accounts**:
   - Click "Start GitHub Authentication"
   - Follow the device code flow in the web interface
   - Copy the device code and authorize on GitHub
   - Your account will be automatically added with a unique API key

4. **Use the API**:
   - Copy the generated API key from the web interface
   - Make requests to `http://localhost:4141/v1/chat/completions`
   - Use `Authorization: Bearer your-api-key-here` header

### Web Interface Workflow

1. **Login to Manager**: Navigate to `/manager` and enter your credentials
2. **View Dashboard**: See your account statistics and existing accounts
3. **Add New Account**: 
   - Select account type (Individual/Business)
   - Click "Start GitHub Authentication"
   - Copy the device code using the copy button
   - Click the GitHub link to authorize (auto-polling will start)
   - Wait for successful authentication
4. **Manage Accounts**:
   - View account details and status
   - Copy API keys with one click
   - Check available models for each account
   - Delete accounts when needed
5. **Test APIs**: Use the built-in API tester at `/manager/test`

### Available Endpoints

- **Manager Interface**: `http://localhost:4141/manager` - Web UI for account management
- **API Tester**: `http://localhost:4141/manager/test` - Test your API endpoints
- **Chat Completions**: `http://localhost:4141/v1/chat/completions` - OpenAI-compatible API
- **Models**: `http://localhost:4141/v1/models` - List available models
- **Embeddings**: `http://localhost:4141/v1/embeddings` - Text embeddings

### 🔄 Multiple API Keys & Load Balancing

This enhanced version supports **multiple API keys with automatic failover**:

#### Usage Format
```bash
# Single API key (traditional)
Authorization: Bearer sk-km6x39lcs568ao21gx7j

# Multiple API keys (comma-separated)
Authorization: Bearer sk-km6x39lcs568ao21gx7j,sk-9px5qbyrsdqn5k00woxho,sk-oolvjz4ajk5ugvgsvfaj3
```

#### How It Works
1. **Primary Selection**: System uses the first available (non-limited) API key
2. **Automatic Failover**: If primary key hits rate limits, automatically switches to the next available key
3. **Load Balancing**: Distributes requests across healthy accounts
4. **Smart Detection**: Detects rate limit errors (429, quota exceeded) and switches seamlessly

#### Benefits
- **Zero Downtime**: Continuous service even when one account hits limits
- **Higher Throughput**: Combine limits from multiple accounts
- **Cost Distribution**: Spread usage across multiple Copilot subscriptions
- **Redundancy**: Built-in backup for critical applications

#### Example Implementation
```bash
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Authorization: Bearer sk-key1,sk-key2,sk-key3" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

The system will automatically:
- Try `sk-key1` first
- If rate limited, switch to `sk-key2`
- If rate limited, switch to `sk-key3`
- Return appropriate error if all keys are exhausted

### Command Line Options

The following options are available when starting the server:

| Option     | Description                     | Default | Alias |
| ---------- | ------------------------------- | ------- | ----- |
| --port     | Port to listen on               | 4141    | -p    |
| --verbose  | Enable verbose logging          | false   | -v    |
| --manual   | Enable manual request approval  | false   | none  |

### Example Usage

```sh
# Basic usage
bun run start

# Custom port
bun run start --port 8080

# With verbose logging
bun run start --verbose

# Enable manual approval for requests
bun run start --manual

# Using npx
npx copilot-api@latest start --port 8080 --verbose
```

## 🆕 Enhanced Features

This enhanced version includes several improvements over the original:

### 🎯 Multi-Account Management
- Web-based interface at `/manager` for managing multiple GitHub accounts
- Each account gets a unique API key for isolation
- Support for both Individual and Business GitHub Copilot accounts
- Real-time account status monitoring

### 🔒 Security Enhancements
- Basic authentication protection for the manager interface
- Configurable credentials via environment variables
- Duplicate account prevention (same GitHub account cannot be added twice)
- Secure API key generation and management

### 🎨 User Experience Improvements
- Modern, responsive web interface
- One-click device code copying
- Auto-polling after GitHub authentication
- Dynamic API endpoint detection
- Real-time feedback and status updates

### 📊 Management Features
- Account statistics dashboard
- Model availability checking per account
- Easy account deletion
- API testing interface at `/manager/test`

## Running from Source

The project can be run from source in several ways:

### Development Mode

```sh
bun run dev
```

### Production Mode

```sh
bun run start
```

## Manager Interface Security

The `/manager` endpoint is protected with basic authentication for security purposes.

### Default Credentials

- **Username**: `admin`
- **Password**: `hijilabs`

### Environment Configuration

You can customize the authentication credentials using environment variables:

```bash
# Copy the example environment file
cp .env.example .env

# Edit the file to set custom credentials
MANAGER_USERNAME=your_username
MANAGER_PASSWORD=your_password
```

### Accessing the Manager

1. Navigate to `http://localhost:4141/manager`
2. Enter your credentials when prompted
3. Use the interface to manage GitHub Copilot accounts

## Usage Tips

- Consider using free models (e.g., Gemini, Mistral, Openrouter) as the `weak-model`
- Use architect mode sparingly
- Disable `yes-always` in your aider configuration
- Be mindful that Claude 3.7 thinking mode consumes more tokens
- Enable the `--manual` flag to review and approve each request before processing
- If you have a GitHub Business account with Copilot, use the `--business` flag

### Manual Request Approval

When using the `--manual` flag, the server will prompt you to approve each incoming request:

```
? Accept incoming request? > (y/N)
```

This helps you control usage and monitor requests in real-time.

# Copilot API

⚠️ **EDUCATIONAL PURPOSE ONLY** ⚠️
This project is a reverse-engineered implementation of the GitHub Copilot API created for educational purposes only. It is not officially supported by GitHub and should not be used in production environments.

> **Note**: This project is forked from [ericc-ch/copilot-api](https://github.com/ericc-ch/copilot-api) and has been modified to support multiple GitHub accounts with individual API keys for better account management and isolation.

## Project Overview

A wrapper around GitHub Copilot API to make it OpenAI compatible, making it usable for other tools like AI assistants, local interfaces, and development utilities. This version includes a multi-account manager that allows you to:

- Manage multiple GitHub Copilot accounts simultaneously
- Generate unique API keys for each account
- Web-based management interface at `/manager`
- Account isolation and individual rate limiting
- Support for both Individual and Business GitHub accounts

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

### Docker with Persistent Data Storage

To persist account data across container restarts, mount a volume to `/app/data`:

```sh
# Create a local data directory
mkdir -p ./copilot-data

# Run with volume mount
docker run -p 4141:4141 -v ./copilot-data:/app/data copilot-api
```

Or using docker-compose:

```yaml
version: '3.8'
services:
  copilot-api:
    build: .
    ports:
      - "4141:4141"
    volumes:
      - ./copilot-data:/app/data
    environment:
      - MANAGER_USERNAME=admin
      - MANAGER_PASSWORD=hijilabs
```

**Data Storage Location:**
- **Container**: `/app/data/accounts.json`
- **Host**: `./copilot-data/accounts.json`
- **Default (no volume)**: `~/.local/share/copilot-api/accounts.json`

## Using with npx

You can run the project directly using npx:

```sh
npx copilot-api@latest start
```

With options:

```sh
npx copilot-api@latest start --port 8080
```

For authentication only:

```sh
npx copilot-api@latest auth
```

## Command Structure

Copilot API now uses a subcommand structure with two main commands:

- `start`: Start the Copilot API server (default command). This command will also handle authentication if needed.
- `auth`: Run GitHub authentication flow without starting the server. This is typically used if you need to generate a token for use with the `--github-token` option, especially in non-interactive environments.

## Environment Variables

| Variable          | Description                              | Default   |
| ----------------- | ---------------------------------------- | --------- |
| MANAGER_USERNAME  | Username for manager interface basic auth | admin     |
| MANAGER_PASSWORD  | Password for manager interface basic auth | hijilabs  |

## Command Line Options

### Start Command Options

The following command line options are available for the `start` command:

| Option         | Description                                                                   | Default | Alias |
| -------------- | ----------------------------------------------------------------------------- | ------- | ----- |
| --port         | Port to listen on                                                             | 4141    | -p    |
| --verbose      | Enable verbose logging                                                        | false   | -v    |
| --business     | Use a business plan GitHub account                                            | false   | none  |
| --manual       | Enable manual request approval                                                | false   | none  |
| --rate-limit   | Rate limit in seconds between requests                                        | none    | -r    |
| --wait         | Wait instead of error when rate limit is hit                                  | false   | -w    |
| --github-token | Provide GitHub token directly (must be generated using the `auth` subcommand) | none    | -g    |
| --vision       | Enable vision capabilities                                                    | false   | none  |

### Auth Command Options

| Option    | Description            | Default | Alias |
| --------- | ---------------------- | ------- | ----- |
| --verbose | Enable verbose logging | false   | -v    |

## Example Usage

Using with npx:

```sh
# Basic usage with start command
npx copilot-api@latest start

# Run on custom port with verbose logging
npx copilot-api@latest start --port 8080 --verbose

# Use with a Business GitHub account
npx copilot-api@latest start --business

# Enable manual approval for each request
npx copilot-api@latest start --manual

# Set rate limit to 30 seconds between requests
npx copilot-api@latest start --rate-limit 30

# Wait instead of error when rate limit is hit
npx copilot-api@latest start --rate-limit 30 --wait

# Provide GitHub token directly
npx copilot-api@latest start --github-token ghp_YOUR_TOKEN_HERE

# Enable vision capabilities
npx copilot-api@latest start --vision

# Run only the auth flow
npx copilot-api@latest auth

# Run auth flow with verbose logging
npx copilot-api@latest auth --verbose
```

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

# Test Configuration for Multiple Account Support

## Testing the Implementation

### 1. Start the Server
```bash
npm run dev
# or
bun run dev
```

### 2. Access Manager Interface
Open your browser and navigate to:
```
http://localhost:4141/manager
```

### 3. Add Test Accounts
1. Click "Start GitHub Authentication"
2. Select account type (Individual/Business)
3. Follow GitHub OAuth flow
4. Copy the generated API key

### 4. Test API Endpoints

#### Test with cURL
```bash
# Replace YOUR_API_KEY with actual key from manager
export API_KEY="sk-your-generated-api-key"

# Test chat completions
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello, test message!"}
    ],
    "max_tokens": 100
  }'

# Test models endpoint
curl -X GET http://localhost:4141/v1/models \
  -H "Authorization: Bearer $API_KEY"
```

#### Test with Python
```python
import openai
import os

# Set your API key
api_key = "sk-your-generated-api-key"

client = openai.OpenAI(
    api_key=api_key,
    base_url="http://localhost:4141/v1"
)

# Test chat completion
try:
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "user", "content": "Test message for multi-account support"}
        ],
        max_tokens=100
    )
    print("Success:", response.choices[0].message.content)
except Exception as e:
    print("Error:", e)

# Test models
try:
    models = client.models.list()
    print("Available models:", [model.id for model in models.data])
except Exception as e:
    print("Error:", e)
```

### 5. Test Multiple Accounts

#### Add Second Account
1. Go back to manager interface
2. Add another GitHub account
3. Get second API key

#### Test Different Accounts
```python
# Account 1
client1 = openai.OpenAI(
    api_key="sk-first-account-key",
    base_url="http://localhost:4141/v1"
)

# Account 2  
client2 = openai.OpenAI(
    api_key="sk-second-account-key",
    base_url="http://localhost:4141/v1"
)

# Test both
response1 = client1.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Request from account 1"}]
)

response2 = client2.chat.completions.create(
    model="gpt-4", 
    messages=[{"role": "user", "content": "Request from account 2"}]
)

print("Account 1 response:", response1.choices[0].message.content)
print("Account 2 response:", response2.choices[0].message.content)
```

### 6. Test Error Cases

#### Invalid API Key
```bash
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Authorization: Bearer sk-invalid-key" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "test"}]}'
```
Should return 401 Unauthorized

#### Missing Authorization
```bash
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "test"}]}'
```
Should return 401 Unauthorized

#### Malformed API Key
```bash
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Authorization: Bearer invalid-format" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "test"}]}'
```
Should return 401 Unauthorized

### 7. Test Manager API

#### Get Stats
```bash
curl http://localhost:4141/manager/api/stats
```

#### Get Accounts
```bash
curl http://localhost:4141/manager/api/accounts
```

#### Delete Account
```bash
curl -X DELETE http://localhost:4141/manager/api/accounts/sk-account-to-delete
```

### 8. Verify Data Persistence

#### Check Storage File
```bash
# Linux/Mac
cat ~/.local/share/copilot-api/accounts.json
```

#### Restart Server Test
1. Stop the server
2. Restart the server
3. Verify accounts still exist in manager
4. Test API calls still work with existing keys

### 9. Load Testing

#### Multiple Concurrent Requests
```python
import asyncio
import aiohttp
import json

async def test_request(session, api_key, message_id):
    url = "http://localhost:4141/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "gpt-4",
        "messages": [{"role": "user", "content": f"Test message {message_id}"}],
        "max_tokens": 50
    }
    
    async with session.post(url, headers=headers, json=data) as response:
        result = await response.json()
        return message_id, response.status, result

async def load_test():
    api_keys = [
        "sk-first-account-key",
        "sk-second-account-key"
    ]
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        
        # Create 10 concurrent requests across different accounts
        for i in range(10):
            api_key = api_keys[i % len(api_keys)]
            tasks.append(test_request(session, api_key, i))
        
        results = await asyncio.gather(*tasks)
        
        for message_id, status, result in results:
            print(f"Request {message_id}: Status {status}")
            if status == 200:
                print(f"  Response: {result['choices'][0]['message']['content']}")
            else:
                print(f"  Error: {result}")

# Run load test
asyncio.run(load_test())
```

## Expected Results

### ✅ Success Indicators
1. Manager interface loads and shows account statistics
2. GitHub OAuth flow completes successfully
3. API keys are generated in `sk-` format
4. Chat completions return valid responses
5. Different API keys use different GitHub accounts
6. Account data persists after server restart
7. Error handling works for invalid keys

### ❌ Failure Indicators
1. Manager interface returns 500 errors
2. GitHub OAuth flow fails or hangs
3. API keys don't work for API calls
4. All accounts use the same GitHub token
5. Server crashes on startup
6. Data is not persisted between restarts

## Debugging

### Check Server Logs
```bash
# Start with verbose logging
npm run dev -- --verbose
```

### Check Account Storage
```bash
# View raw account data
cat ~/.local/share/copilot-api/accounts.json | jq .
```

### Verify GitHub Tokens
1. Check manager interface for token status
2. Verify GitHub Copilot subscription is active
3. Check token expiration in logs

## Common Issues

### TypeScript Errors
- Install missing dependencies: `npm install` or `bun install`
- Check tsconfig.json configuration
- Verify all imports are correct

### Authentication Issues
- Ensure GitHub Copilot subscription is active
- Check GitHub OAuth app configuration
- Verify token refresh mechanism

### Storage Issues
- Check file permissions for ~/.local/share/copilot-api/
- Verify JSON format in accounts.json
- Check disk space availability

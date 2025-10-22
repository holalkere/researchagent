p# Chat History Feature Testing Guide

This guide explains how to test the chat history feature using mock data without running the full agent pipeline or consuming LLM tokens.

## Quick Start

### 1. Generate Mock Data
```bash
python mock_chat_data.py
```
This creates 5+ realistic chat sessions with conversation history in your Cosmos DB.

### 2. Start the Server
```bash
    python main.py
```

### 3. Test the Feature
```bash
python test_chat_history.py
```

### 4. Test in Browser
Visit: http://localhost:8000

## What Gets Created

The mock data generator creates:

- **5 Main Sessions**: Full research conversations on topics like:
  - Quantum computing developments
  - AI impact on healthcare  
  - Renewable energy trends
  - Autonomous vehicles
  - Blockchain applications

- **2 Additional Sessions**: Different conversation patterns:
  - Quick Q&A session
  - Deep research session

- **Realistic Timestamps**: Messages spread over days/weeks
- **Multiple Message Types**: user, assistant, system messages
- **Rich Content**: Multi-paragraph responses with formatting

## API Endpoints for Testing

### Get All Sessions
```bash
curl http://localhost:8000/chat/sessions
```

### Get Specific Session
```bash
curl http://localhost:8000/chat/session/{session_id}
```

### Create New Session
```bash
curl -X POST http://localhost:8000/chat/session \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test prompt"}'
```

### Add Message to Session
```bash
curl -X POST http://localhost:8000/chat/session/{session_id}/message \
  -H "Content-Type: application/json" \
  -d '{"message_type": "user", "content": "Test message"}'
```

## Benefits of This Approach

✅ **No LLM Costs**: Uses pre-written realistic content  
✅ **Fast Setup**: Generates data in seconds  
✅ **Realistic Testing**: Mimics actual conversation patterns  
✅ **Full Database Integration**: Tests Cosmos DB storage/retrieval  
✅ **UI Testing**: Can test the complete chat history UI  

## File Structure

- `mock_chat_data.py`: Generates mock conversation data
- `test_chat_history.py`: Tests API endpoints and functionality  
- `CHAT_HISTORY_TESTING.md`: This guide
- `src/cosmos_db.py`: Database service (already exists)
- `main.py`: FastAPI server (already exists)

## Next Steps

1. Run the mock data generator
2. Test the API endpoints
3. Test the UI in your browser
4. Iterate on the chat history feature
5. When ready, switch to real agent conversations

## Troubleshooting

**No sessions found**: Run `python mock_chat_data.py` first  
**Server not running**: Run `python main.py`  
**Database errors**: Check your `.env` file for Cosmos DB credentials  
**Port conflicts**: Make sure port 8000 is available  

## Cost Comparison

| Approach | LLM Tokens | Time | Cost |
|----------|------------|------|------|
| Full Agents | ~50,000+ | 5-10 min | $5-15 |
| Mock Data | 0 | 30 seconds | $0 |
| **Savings** | **100%** | **95%** | **100%** |

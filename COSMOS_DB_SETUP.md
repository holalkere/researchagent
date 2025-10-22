# Cosmos DB Integration Setup

This document explains how to set up and use Azure Cosmos DB for storing chat history in the research agent application.

## Prerequisites

1. Azure Cosmos DB account with the following details:
   - Database name: `dbresearch`
   - Container name: `chat-history`
   - Partition key: `/id`
   - URI: `https://cosmos-sbd-genai-common-experiment.documents.azure.com:443/`

2. Cosmos DB access key (primary or secondary key)

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration
USE_COSMOS_DB=true

# Cosmos DB Configuration
COSMOS_DB_URI=https://cosmos-sbd-genai-common-experiment.documents.azure.com:443/
COSMOS_DB_KEY=your_cosmos_db_key_here
COSMOS_DB_DATABASE_NAME=dbresearch
COSMOS_DB_CONTAINER_NAME=chat-history
COSMOS_DB_PARTITION_KEY=/id

# Other existing variables...
AZURE_OPENAI_KEY=your_azure_openai_key_here
AZURE_OPENAI_DEPLOYMENT=sbd-gpt-4.1-mini
TAVILY_API_KEY=your_tavily_api_key_here
```

### 2. Install Dependencies

Install the required Cosmos DB dependency:

```bash
pip install azure-cosmos
```

Or install all dependencies:

```bash
pip install -r requirements.txt
```

### 3. Test the Integration

Run the test script to verify the Cosmos DB connection:

```bash
python test_cosmos.py
```

## Data Model

The Cosmos DB integration uses the following data structures:

### Chat Sessions
```json
{
  "id": "session-uuid",
  "type": "chat_session",
  "user_prompt": "User's initial prompt",
  "status": "active",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "metadata": {},
  "messages": []
}
```

### Messages
```json
{
  "id": "message-uuid",
  "type": "message",
  "session_id": "session-uuid",
  "message_type": "user|assistant|system|tool",
  "content": "Message content",
  "created_at": "2024-01-01T00:00:00Z",
  "metadata": {}
}
```

### Tasks (for backward compatibility)
```json
{
  "id": "task-uuid",
  "type": "task",
  "prompt": "Task prompt",
  "status": "running|done|error",
  "result": "JSON string of results",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## API Endpoints

### Chat History Endpoints

- `POST /chat/session` - Create a new chat session
- `GET /chat/session/{session_id}` - Get a chat session and its messages
- `GET /chat/sessions` - Get all chat sessions
- `POST /chat/session/{session_id}/message` - Add a message to a session

### Existing Endpoints (Updated)

- `POST /generate_report` - Creates tasks in Cosmos DB
- `GET /task_status/{task_id}` - Retrieves task status from Cosmos DB

## Fallback to SQLite

If Cosmos DB is not available or configured, the application will automatically fall back to SQLite. Set `USE_COSMOS_DB=false` in your `.env` file to force SQLite mode.

## Features

1. **Automatic Fallback**: If Cosmos DB fails to initialize, the app falls back to SQLite
2. **Chat History**: Store and retrieve chat sessions with messages
3. **Task Management**: Backward compatible with existing task system
4. **Scalable**: Cosmos DB provides horizontal scaling and global distribution
5. **Partitioned**: Uses `/id` as partition key for optimal performance

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check your Cosmos DB URI and key
2. **Container Not Found**: Ensure the container `chat-history` exists in database `dbresearch`
3. **Permission Denied**: Verify your Cosmos DB key has read/write permissions

### Debug Mode

Set `USE_COSMOS_DB=false` to use SQLite for debugging, or check the console output for Cosmos DB connection status.

## Performance Considerations

- Cosmos DB is optimized for high-throughput, low-latency operations
- The partition key `/id` ensures even distribution of data
- Consider setting up indexing policies for complex queries
- Monitor RU (Request Units) consumption for cost optimization

## Security

- Store Cosmos DB keys securely (use Azure Key Vault in production)
- Enable firewall rules to restrict access to your Cosmos DB account
- Use managed identities when possible for production deployments

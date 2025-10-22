# Reflective Research Agent (FastAPI + Cosmos DB)

A FastAPI web app that plans a research workflow, runs tool-using agents (Tavily, arXiv, Wikipedia), and stores task state/results in Azure Cosmos DB with SQLite fallback.

## Features

* `/` serves a simple UI (Jinja2 template) to kick off a research task.
* `/generate_report` kicks off a threaded, multi-step agent workflow (planner → research/writer/editor).
* `/task_progress/{task_id}` live status for each step/substep.
* `/task_status/{task_id}` final status + report.

---

## Project layout (key paths)

```
.
├─ main.py                      # FastAPI app
├─ src/
│  ├─ planning_agent.py         # planner_agent(), executor_agent_step()
│  ├─ agents.py                 # research_agent, writer_agent, editor_agent
│  ├─ research_tools.py         # tavily_search_tool, arxiv_search_tool, wikipedia_search_tool
│  └─ cosmos_db.py              # Azure Cosmos DB integration
├─ templates/
│  └─ index.html                # UI page rendered by "/"
├─ static/                      # static assets (css/js/images)
├─ requirements.txt
└─ README.md
```

---

## Prerequisites

* **Python 3.11+**
* **API keys** stored in a `.env` file:

  ```
  OPENAI_API_KEY=your-open-api-key
  TAVILY_API_KEY=your-tavily-api-key
  ```

* **Azure Cosmos DB** (optional - falls back to SQLite if not configured):
  ```
  COSMOS_ENDPOINT=your-cosmos-endpoint
  COSMOS_KEY=your-cosmos-key
  COSMOS_DATABASE=your-database-name
  COSMOS_CONTAINER=your-container-name
  USE_COSMOS_DB=true
  ```

* **Dependencies** from `requirements.txt`:
  * `fastapi`, `uvicorn`, `sqlalchemy`, `python-dotenv`, `jinja2`, `requests`, `wikipedia`
  * `azure-cosmos` for Cosmos DB integration
  * `reportlab`, `markdown` for PDF generation

---

## Environment variables

The app supports multiple database backends:

* **Cosmos DB** (preferred for production):
  ```
  USE_COSMOS_DB=true
  COSMOS_ENDPOINT=your-cosmos-endpoint
  COSMOS_KEY=your-cosmos-key
  COSMOS_DATABASE=your-database-name
  COSMOS_CONTAINER=your-container-name
  ```

* **SQLite** (fallback for local development):
  ```
  USE_COSMOS_DB=false
  DATABASE_URL=sqlite:///./research_agent.db
  ```

* **Required API keys**:
  ```
  OPENAI_API_KEY=your-openai-key
  TAVILY_API_KEY=your-tavily-key
  ```

---

## Local Development

### 1) Install dependencies

```bash
pip install -r requirements.txt
```

### 2) Set up environment variables

Create a `.env` file with your API keys:

```bash
OPENAI_API_KEY=your-openai-key
TAVILY_API_KEY=your-tavily-key
USE_COSMOS_DB=false  # Use SQLite for local development
```

### 3) Run the application

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see logs like:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Using SQLite for data storage
```

### 4) Open the app

* UI: [http://localhost:8000/](http://localhost:8000/)
* API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Deployment Options

### Railway (Recommended)

1. **Push to GitHub** (if not already done)
2. **Go to [Railway.app](https://railway.app)** → Sign up with GitHub
3. **New Project** → Deploy from GitHub repo
4. **Add Environment Variables**:
   ```
   OPENAI_API_KEY=your-openai-key
   TAVILY_API_KEY=your-tavily-key
   USE_COSMOS_DB=false  # Use SQLite for simple deployment
   ```
5. **Deploy** - Railway handles the rest automatically

### Other Options

- **Render**: Connect GitHub repo → auto-deploy
- **Heroku**: Use Heroku CLI with `git push heroku main`
- **DigitalOcean App Platform**: GitHub integration with managed databases

---

## API Usage

### Kick off a research task

```bash
curl -X POST http://localhost:8000/generate_report \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Large Language Models for scientific discovery"}'
# -> {"task_id": "UUID..."}
```

### Check progress

```bash
curl http://localhost:8000/task_progress/<TASK_ID>
```

### Get final report

```bash
curl http://localhost:8000/task_status/<TASK_ID>
```

### Chat History (Cosmos DB only)

```bash
# Create chat session
curl -X POST http://localhost:8000/chat/session \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Your research question"}'

# Get chat sessions
curl http://localhost:8000/chat/sessions
```

---

## Troubleshooting

**App won't start**

* Check that all required environment variables are set
* Ensure `templates/index.html` exists
* Check logs for specific error messages

**Database connection issues**

* For SQLite: Ensure write permissions in the directory
* For Cosmos DB: Verify connection string and credentials
* App automatically falls back to SQLite if Cosmos DB fails

**API key errors**

* Verify `OPENAI_API_KEY` and `TAVILY_API_KEY` are correctly set
* Check API key permissions and quotas

**Research tool failures**

* Tavily: Check API key and rate limits
* Wikipedia: May have rate limits, try again later
* arXiv: Usually reliable, check network connectivity

---

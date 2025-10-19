@echo off
echo Starting Research Agent on localhost...
echo.
echo Make sure you have set up your .env file with API keys:
echo - OPENAI_API_KEY=your_openai_api_key_here
echo - TAVILY_API_KEY=your_tavily_api_key_here
echo.
echo Starting server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

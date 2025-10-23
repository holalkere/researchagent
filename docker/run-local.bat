@echo off
echo Starting Research Agent with Docker Compose...
echo.
echo Make sure you have set up your .env file in the project root with API keys:
echo - OPENAI_API_KEY=your_openai_api_key_here
echo - TAVILY_API_KEY=your_tavily_api_key_here
echo.
echo Starting container on http://localhost:8000
echo Press Ctrl+C to stop the container
echo.

REM Change to parent directory to run docker-compose
cd ..
docker-compose -f docker/docker-compose.yml up --build

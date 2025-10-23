@echo off
echo Building Research Agent Docker image...
echo.

REM Change to parent directory to build from project root
cd ..
docker build -f docker/Dockerfile -t research-agent:latest .

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Build successful! Image tagged as 'research-agent:latest'
    echo.
    echo To run the container:
    echo docker run -d -p 8000:8000 -e OPENAI_API_KEY=your_key -e TAVILY_API_KEY=your_key research-agent:latest
) else (
    echo.
    echo Build failed! Check the error messages above.
)

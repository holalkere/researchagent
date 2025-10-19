#!/usr/bin/env python3

import requests
import json

# Test the API directly
try:
    # Test health endpoint
    response = requests.get("http://localhost:8000/api")
    print(f"Health check: {response.status_code} - {response.text}")
    
    # Test generate_report endpoint
    data = {"prompt": "What are the latest developments in AI?"}
    response = requests.post("http://localhost:8000/generate_report", json=data)
    print(f"Generate report: {response.status_code}")
    if response.status_code != 200:
        print(f"Error response: {response.text}")
    else:
        result = response.json()
        print(f"Task ID: {result.get('task_id')}")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()


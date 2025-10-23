#!/usr/bin/env python3
"""
Test the farm water fish question specifically
"""

import requests
import json

def test_farm_water_fish():
    """Test the specific farm water fish question"""
    
    question = "Conduct a strategic research analysis on farm water fish. Include strategic planning frameworks, business models, competitive advantages, strategic positioning, market entry strategies, growth strategies, and strategic recommendations for stakeholders."
    
    print(f"Testing question: {question}")
    print("-" * 80)
    
    try:
        response = requests.post(
            "http://localhost:8000/generate_report",
            json={"prompt": question},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("blocked"):
                print("ERROR: Content was incorrectly blocked")
                print(f"Message: {data.get('message', 'No message')}")
                print(f"Details: {data.get('details', {})}")
            else:
                print("SUCCESS: Content was allowed")
                print(f"Task ID: {data.get('task_id', 'No task ID')}")
        else:
            print(f"ERROR: Unexpected status code: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error details: {error_data}")
            except:
                print(f"Response text: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to server. Make sure the server is running.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_farm_water_fish()

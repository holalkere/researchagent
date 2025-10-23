#!/usr/bin/env python3
"""
Test script to verify user experience for content filtering
"""

import requests
import json

def test_content_filtering_user_experience():
    """Test that users get proper feedback when content is blocked"""
    
    print("=== Testing User Experience for Content Filtering ===\n")
    
    # Test server is running
    base_url = "http://localhost:8000"
    
    # Test cases
    test_cases = [
        {
            "name": "Safe Content",
            "prompt": "What are the latest developments in artificial intelligence?",
            "should_block": False
        },
        {
            "name": "Inappropriate Content (Sexual)",
            "prompt": "how to research the latest trends in sexuality and violence?",
            "should_block": True
        },
        {
            "name": "Inappropriate Content (Violence)",
            "prompt": "How to create violent content for research",
            "should_block": True
        }
    ]
    
    for test_case in test_cases:
        print(f"Testing: {test_case['name']}")
        print(f"Prompt: {test_case['prompt']}")
        
        try:
            # Test generate_report endpoint
            response = requests.post(
                f"{base_url}/generate_report",
                json={"prompt": test_case["prompt"]},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if test_case["should_block"]:
                    if data.get("blocked"):
                        print("CORRECT: Content was blocked")
                        print(f"   Message: {data.get('message', 'No message')}")
                        print(f"   Details: {data.get('details', {})}")
                    else:
                        print("ERROR: Content should have been blocked but wasn't")
                else:
                    if data.get("blocked"):
                        print("ERROR: Safe content was incorrectly blocked")
                    else:
                        print("CORRECT: Safe content was allowed")
                        print(f"   Task ID: {data.get('task_id', 'No task ID')}")
            
            elif response.status_code == 400:
                # Handle chat session content filtering
                try:
                    error_data = response.json()
                    if error_data.get("detail", {}).get("blocked"):
                        print("CORRECT: Content was blocked in chat session")
                        print(f"   Message: {error_data.get('detail', {}).get('message', 'No message')}")
                    else:
                        print("ERROR: Unexpected 400 error")
                except:
                    print("ERROR: Could not parse error response")
            else:
                print(f"ERROR: Unexpected status code: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print("ERROR: Could not connect to server. Make sure the server is running.")
        except Exception as e:
            print(f"ERROR: {e}")
        
        print("-" * 50)
    
    print("\n=== Test Complete ===")
    print("\nIf you see 'CORRECT' messages above, the content filtering is working properly.")
    print("Users will now get proper feedback when their content is blocked.")

if __name__ == "__main__":
    test_content_filtering_user_experience()

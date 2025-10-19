#!/usr/bin/env python3

import os
import sys
sys.path.append('.')

# Set API keys directly
# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

try:
    print("Testing imports...")
    from src.planning_agent import planner_agent
    print("SUCCESS: Planning agent imported successfully")
    
    print("Testing planner_agent function...")
    result = planner_agent("test topic")
    print(f"SUCCESS: Planner agent returned: {len(result)} steps")
    print("First step:", result[0] if result else "No steps")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
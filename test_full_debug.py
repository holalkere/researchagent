#!/usr/bin/env python3

import os
import sys
sys.path.append('.')

# Set API keys directly
# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

try:
    print("Testing full workflow...")
    
    # Test planning agent
    from src.planning_agent import planner_agent, executor_agent_step
    print("SUCCESS: Planning agent imported")
    
    # Test planner
    steps = planner_agent("test topic")
    print(f"SUCCESS: Got {len(steps)} planning steps")
    
    # Test executor for first step
    print("Testing executor agent step...")
    step_title, agent_name, output = executor_agent_step(steps[0], [], "test topic")
    print(f"SUCCESS: Executor returned - {agent_name}: {output[:100]}...")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()


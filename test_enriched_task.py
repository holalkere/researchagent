#!/usr/bin/env python3
"""
Test what the enriched_task looks like
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.content_filter import check_content_safety

def test_enriched_task():
    """Test what the enriched_task contains"""
    
    # Simulate the enriched_task that would be passed to research_agent
    prompt = "Conduct a strategic research analysis on farm water fish. Include strategic planning frameworks, business models, competitive advantages, strategic positioning, market entry strategies, growth strategies, and strategic recommendations for stakeholders."
    
    # This is what gets passed to research_agent
    enriched_task = f"""User Prompt:
{prompt}

History so far:

Your next task:
Research agent: Use Tavily to perform a broad web search and collect top relevant items (title, authors, year, venue/source, URL, DOI if available)."""
    
    print("Testing enriched_task:")
    print("-" * 80)
    print(enriched_task)
    print("-" * 80)
    
    is_safe, message, details = check_content_safety(enriched_task)
    
    print(f"Result: {'SAFE' if is_safe else 'BLOCKED'}")
    print(f"Message: {message}")
    print(f"Details: {details}")
    
    if details.get("blocked_keywords"):
        print(f"Blocked keywords: {details['blocked_keywords']}")

if __name__ == "__main__":
    test_enriched_task()

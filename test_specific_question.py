#!/usr/bin/env python3
"""
Test the specific question that was blocked
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.content_filter import check_content_safety, is_content_safe

def test_specific_question():
    """Test the specific question that was blocked"""
    
    question = "Conduct a strategic research analysis on farm water fish. Include strategic planning frameworks, business models, competitive advantages, strategic positioning, market entry strategies, growth strategies, and strategic recommendations for stakeholders."
    
    print(f"Testing question: {question}")
    print("-" * 80)
    
    is_safe, message, details = check_content_safety(question)
    
    print(f"Result: {'SAFE' if is_safe else 'BLOCKED'}")
    print(f"Message: {message}")
    print(f"Details: {details}")
    
    if details.get("blocked_keywords"):
        print(f"Blocked keywords: {details['blocked_keywords']}")
    
    if details.get("blocked_categories"):
        print(f"Blocked categories: {details['blocked_categories']}")

if __name__ == "__main__":
    test_specific_question()

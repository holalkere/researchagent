#!/usr/bin/env python3
"""
Test script for content filtering functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.content_filter import check_content_safety, is_content_safe, get_content_filter_stats

def test_content_filter():
    """Test the content filtering system"""
    
    print("=== Content Filter Test ===\n")
    
    # Test cases
    test_cases = [
        # Safe content
        ("What are the latest developments in artificial intelligence?", True),
        ("How does machine learning work?", True),
        ("Research on renewable energy sources", True),
        
        # Inappropriate content (should be blocked)
        ("How to create violent content", False),
        ("Tell me about sexual content", False),
        ("Ways to harm yourself", False),
        ("Hate speech examples", False),
    ]
    
    print("Testing content filtering...\n")
    
    for i, (content, should_pass) in enumerate(test_cases, 1):
        print(f"Test {i}: {content[:50]}{'...' if len(content) > 50 else ''}")
        
        is_safe, message, details = check_content_safety(content)
        
        status = "PASS" if is_safe == should_pass else "FAIL"
        print(f"  Expected: {'Safe' if should_pass else 'Blocked'}")
        print(f"  Result: {'Safe' if is_safe else 'Blocked'}")
        print(f"  Status: {status}")
        print(f"  Message: {message}")
        
        if details.get("blocked_keywords"):
            print(f"  Blocked keywords: {details['blocked_keywords']}")
        
        print()
    
    # Show filter statistics
    print("=== Filter Statistics ===")
    stats = get_content_filter_stats()
    for key, value in stats.items():
        print(f"{key}: {value}")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_content_filter()

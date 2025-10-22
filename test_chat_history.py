#!/usr/bin/env python3
"""
Test Script for Chat History Feature

This script tests the chat history functionality with mock data
without running the full agent pipeline.
"""

import requests
import json
import time
from typing import List, Dict

# Configuration
BASE_URL = "http://localhost:8000"  # Adjust if your server runs on different port

def test_health_check():
    """Test if the server is running"""
    try:
        response = requests.get(f"{BASE_URL}/api")
        if response.status_code == 200:
            print("✅ Server is running")
            return True
        else:
            print(f"❌ Server health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        return False

def test_get_all_sessions():
    """Test getting all chat sessions"""
    try:
        response = requests.get(f"{BASE_URL}/chat/sessions")
        if response.status_code == 200:
            data = response.json()
            sessions = data.get("sessions", [])
            print(f"✅ Retrieved {len(sessions)} chat sessions")
            
            # Display session summaries
            for i, session in enumerate(sessions[:3], 1):  # Show first 3
                print(f"  {i}. Session: {session.get('id', 'N/A')[:8]}...")
                print(f"     Prompt: {session.get('user_prompt', 'N/A')[:50]}...")
                print(f"     Created: {session.get('created_at', 'N/A')}")
                print()
            
            return sessions
        else:
            print(f"❌ Failed to get sessions: {response.status_code}")
            print(f"Response: {response.text}")
            return []
    except Exception as e:
        print(f"❌ Error getting sessions: {e}")
        return []

def test_get_specific_session(session_id: str):
    """Test getting a specific session with messages"""
    try:
        response = requests.get(f"{BASE_URL}/chat/session/{session_id}")
        if response.status_code == 200:
            data = response.json()
            session = data.get("session", {})
            messages = data.get("messages", [])
            
            print(f"✅ Retrieved session {session_id[:8]}... with {len(messages)} messages")
            
            # Display conversation
            print(f"\n📝 Conversation:")
            print(f"User Prompt: {session.get('user_prompt', 'N/A')}")
            print(f"Session Status: {session.get('status', 'N/A')}")
            print(f"Created: {session.get('created_at', 'N/A')}")
            print(f"\n💬 Messages:")
            
            for i, message in enumerate(messages, 1):
                msg_type = message.get('message_type', 'unknown')
                content = message.get('content', '')
                timestamp = message.get('created_at', 'N/A')
                
                # Truncate long content for display
                display_content = content[:100] + "..." if len(content) > 100 else content
                
                print(f"  {i}. [{msg_type.upper()}] {display_content}")
                print(f"     Time: {timestamp}")
                print()
            
            return data
        else:
            print(f"❌ Failed to get session {session_id}: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error getting session: {e}")
        return None

def test_create_new_session():
    """Test creating a new chat session"""
    try:
        test_prompt = "Test prompt for new session creation"
        payload = {"prompt": test_prompt}
        
        response = requests.post(f"{BASE_URL}/chat/session", json=payload)
        if response.status_code == 200:
            data = response.json()
            session_id = data.get("session_id")
            print(f"✅ Created new session: {session_id}")
            return session_id
        else:
            print(f"❌ Failed to create session: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating session: {e}")
        return None

def test_add_message(session_id: str):
    """Test adding a message to a session"""
    try:
        payload = {
            "message_type": "user",
            "content": "This is a test message added via API"
        }
        
        response = requests.post(f"{BASE_URL}/chat/session/{session_id}/message", json=payload)
        if response.status_code == 200:
            data = response.json()
            message_id = data.get("message_id")
            print(f"✅ Added message to session: {message_id}")
            return message_id
        else:
            print(f"❌ Failed to add message: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error adding message: {e}")
        return None

def run_comprehensive_test():
    """Run a comprehensive test of the chat history feature"""
    print("🧪 Starting Chat History Feature Test")
    print("=" * 50)
    
    # Test 1: Health check
    print("\n1️⃣ Testing server health...")
    if not test_health_check():
        print("❌ Server not available. Make sure to run: python main.py")
        return False
    
    # Test 2: Get all sessions
    print("\n2️⃣ Testing get all sessions...")
    sessions = test_get_all_sessions()
    if not sessions:
        print("❌ No sessions found. Run mock_chat_data.py first!")
        return False
    
    # Test 3: Get specific session
    print("\n3️⃣ Testing get specific session...")
    if sessions:
        first_session = sessions[0]
        session_id = first_session.get('id')
        if session_id:
            session_data = test_get_specific_session(session_id)
            if not session_data:
                print("❌ Failed to get specific session")
                return False
    
    # Test 4: Create new session
    print("\n4️⃣ Testing create new session...")
    new_session_id = test_create_new_session()
    if not new_session_id:
        print("❌ Failed to create new session")
        return False
    
    # Test 5: Add message to new session
    print("\n5️⃣ Testing add message...")
    message_id = test_add_message(new_session_id)
    if not message_id:
        print("❌ Failed to add message")
        return False
    
    # Test 6: Verify the new message was added
    print("\n6️⃣ Testing verify new message...")
    updated_session = test_get_specific_session(new_session_id)
    if updated_session:
        messages = updated_session.get("messages", [])
        print(f"✅ Session now has {len(messages)} messages")
    
    print("\n🎉 All tests completed successfully!")
    print("✅ Chat history feature is working correctly!")
    return True

def main():
    """Main test function"""
    print("🚀 Chat History Feature Test Suite")
    print("=" * 50)
    
    # Check if server is running
    if not test_health_check():
        print("\n💡 To start the server, run:")
        print("   python main.py")
        print("\n💡 To generate mock data, run:")
        print("   python mock_chat_data.py")
        return
    
    # Run comprehensive tests
    success = run_comprehensive_test()
    
    if success:
        print("\n🎯 Chat history feature is ready for testing!")
        print("💡 You can now test the UI by visiting: http://localhost:8000")
    else:
        print("\n❌ Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Test script for Cosmos DB integration
"""
import os
import json
from dotenv import load_dotenv
from src.cosmos_db import get_cosmos_service

def test_cosmos_connection():
    """Test basic Cosmos DB connection and operations"""
    print("Testing Cosmos DB integration...")
    
    try:
        # Load environment variables
        load_dotenv()
        
        # Initialize service
        db_service = get_cosmos_service()
        print("✓ Cosmos DB service initialized successfully")
        
        # Test creating a task
        task_id = db_service.create_task(
            prompt="Test prompt for Cosmos DB integration",
            status="running"
        )
        print(f"✓ Created task: {task_id}")
        
        # Test getting the task
        task = db_service.get_task(task_id)
        if task:
            print(f"✓ Retrieved task: {task['id']}")
        else:
            print("✗ Failed to retrieve task")
            return False
        
        # Test updating the task
        success = db_service.update_task(task_id, status="completed", result='{"test": "result"}')
        if success:
            print("✓ Updated task successfully")
        else:
            print("✗ Failed to update task")
            return False
        
        # Test creating a chat session
        session_id = db_service.create_chat_session(
            user_prompt="Test chat session",
            metadata={"test": True}
        )
        print(f"✓ Created chat session: {session_id}")
        
        # Test adding a message
        message_id = db_service.add_message(
            session_id=session_id,
            message_type="user",
            content="Hello, this is a test message",
            metadata={"test": True}
        )
        print(f"✓ Added message: {message_id}")
        
        # Test getting chat session
        session = db_service.get_chat_session(session_id)
        if session:
            print(f"✓ Retrieved chat session: {session['id']}")
        else:
            print("✗ Failed to retrieve chat session")
            return False
        
        # Test getting messages
        messages = db_service.get_chat_messages(session_id)
        print(f"✓ Retrieved {len(messages)} messages")
        
        print("\n🎉 All Cosmos DB tests passed!")
        return True
        
    except Exception as e:
        print(f"✗ Cosmos DB test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_cosmos_connection()
    exit(0 if success else 1)

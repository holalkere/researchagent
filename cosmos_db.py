# -*- coding: utf-8 -*-
import os
import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from azure.cosmos import CosmosClient, PartitionKey
from azure.cosmos.exceptions import CosmosResourceNotFoundError, CosmosResourceExistsError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class CosmosDBService:
    """Service class for Azure Cosmos DB operations"""
    
    def __init__(self):
        self.uri = os.getenv("COSMOS_DB_URI")
        self.key = os.getenv("COSMOS_DB_KEY")
        self.database_name = os.getenv("COSMOS_DB_DATABASE_NAME", "dbresearch")
        self.container_name = os.getenv("COSMOS_DB_CONTAINER_NAME", "chat-history")
        self.partition_key = os.getenv("COSMOS_DB_PARTITION_KEY", "/id")
        
        if not self.uri or not self.key:
            raise ValueError("COSMOS_DB_URI and COSMOS_DB_KEY must be set in environment variables")
        
        # Initialize Cosmos client
        self.client = CosmosClient(self.uri, self.key)
        self.database = None
        self.container = None
        
        # Initialize database and container
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize database and container if they don't exist"""
        try:
            # Create or get database
            self.database = self.client.create_database_if_not_exists(id=self.database_name)
            
            # Create or get container
            self.container = self.database.create_container_if_not_exists(
                id=self.container_name,
                partition_key=PartitionKey(path=self.partition_key),
                offer_throughput=400
            )
            print(f"Connected to Cosmos DB: {self.database_name}/{self.container_name}")
            
        except Exception as e:
            print(f"Error initializing Cosmos DB: {e}")
            raise
    
    def create_chat_session(self, session_id: str = None, user_prompt: str = "", metadata: Dict = None) -> str:
        """Create a new chat session"""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        chat_session = {
            "id": session_id,
            "type": "chat_session",
            "user_prompt": user_prompt,
            "status": "active",
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "metadata": metadata or {},
            "messages": []
        }
        
        try:
            self.container.create_item(body=chat_session)
            return session_id
        except Exception as e:
            print(f"Error creating chat session: {e}")
            raise
    
    def add_message(self, session_id: str, message_type: str, content: str, metadata: Dict = None) -> str:
        """Add a message to a chat session"""
        message_id = str(uuid.uuid4())
        
        message = {
            "id": message_id,
            "type": "message",
            "session_id": session_id,
            "message_type": message_type,  # "user", "assistant", "system", "tool"
            "content": content,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "metadata": metadata or {}
        }
        
        try:
            self.container.create_item(body=message)
            return message_id
        except Exception as e:
            print(f"Error adding message: {e}")
            raise
    
    def get_chat_session(self, session_id: str) -> Optional[Dict]:
        """Get a chat session by ID"""
        try:
            item = self.container.read_item(item=session_id, partition_key=session_id)
            return item
        except CosmosResourceNotFoundError:
            return None
        except Exception as e:
            print(f"Error getting chat session: {e}")
            raise
    
    def get_chat_messages(self, session_id: str, limit: int = 100) -> List[Dict]:
        """Get messages for a chat session"""
        try:
            query = "SELECT * FROM c WHERE c.session_id = @session_id AND c.type = 'message' ORDER BY c.created_at ASC"
            parameters = [{"name": "@session_id", "value": session_id}]
            
            items = list(self.container.query_items(
                query=query,
                parameters=parameters,
                enable_cross_partition_query=True
            ))
            
            return items[-limit:] if limit else items
        except Exception as e:
            print(f"Error getting chat messages: {e}")
            return []
    
    def update_chat_session(self, session_id: str, updates: Dict) -> bool:
        """Update a chat session"""
        try:
            item = self.container.read_item(item=session_id, partition_key=session_id)
            item.update(updates)
            item["updated_at"] = datetime.utcnow().isoformat() + "Z"
            self.container.replace_item(item=item, body=item)
            return True
        except CosmosResourceNotFoundError:
            return False
        except Exception as e:
            print(f"Error updating chat session: {e}")
            return False
    
    def create_task(self, task_id: str = None, prompt: str = "", status: str = "running", result: str = None) -> str:
        """Create a new task (for backward compatibility with existing Task model)"""
        if not task_id:
            task_id = str(uuid.uuid4())
        
        task = {
            "id": task_id,
            "type": "task",
            "prompt": prompt,
            "status": status,
            "result": result,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat()
        }
        
        try:
            self.container.create_item(body=task)
            return task_id
        except Exception as e:
            print(f"Error creating task: {e}")
            raise
    
    def get_task(self, task_id: str) -> Optional[Dict]:
        """Get a task by ID"""
        try:
            item = self.container.read_item(item=task_id, partition_key=task_id)
            return item
        except CosmosResourceNotFoundError:
            return None
        except Exception as e:
            print(f"Error getting task: {e}")
            raise
    
    def update_task(self, task_id: str, status: str = None, result: str = None) -> bool:
        """Update a task"""
        try:
            item = self.container.read_item(item=task_id, partition_key=task_id)
            
            if status:
                item["status"] = status
            if result:
                item["result"] = result
            
            item["updated_at"] = datetime.utcnow().isoformat() + "Z"
            self.container.replace_item(item=item, body=item)
            return True
        except CosmosResourceNotFoundError:
            return False
        except Exception as e:
            print(f"Error updating task: {e}")
            return False
    
    def get_all_sessions(self, limit: int = 50) -> List[Dict]:
        """Get all chat sessions"""
        try:
            query = "SELECT * FROM c WHERE c.type = 'chat_session' ORDER BY c.created_at DESC"
            items = list(self.container.query_items(
                query=query,
                enable_cross_partition_query=True
            ))
            return items[:limit] if limit else items
        except Exception as e:
            print(f"Error getting all sessions: {e}")
            return []
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session and all its messages"""
        try:
            # Delete all messages for this session
            messages = self.get_chat_messages(session_id)
            for message in messages:
                self.container.delete_item(item=message["id"], partition_key=message["id"])
            
            # Delete the session
            self.container.delete_item(item=session_id, partition_key=session_id)
            return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False


# Global instance
cosmos_service = None

def get_cosmos_service() -> CosmosDBService:
    """Get the global Cosmos DB service instance"""
    global cosmos_service
    if cosmos_service is None:
        cosmos_service = CosmosDBService()
    return cosmos_service

#!/usr/bin/env python3
"""
Mock Chat Data Generator for Testing Chat History Feature

This script creates realistic mock conversation data in Cosmos DB
without running the full agent pipeline or consuming LLM tokens.
"""

import os
import uuid
import random
from datetime import datetime, timedelta
from typing import List, Dict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import your Cosmos DB service
from src.cosmos_db import get_cosmos_service

# Mock conversation templates
MOCK_CONVERSATIONS = [
    {
        "user_prompt": "Research the latest developments in quantum computing",
        "messages": [
            ("user", "Research the latest developments in quantum computing"),
            ("assistant", "I'll help you research the latest developments in quantum computing. Let me start by gathering recent information from various sources."),
            ("system", "Starting research phase..."),
            ("assistant", "Based on my research, here are the key recent developments in quantum computing:\n\n1. **IBM's Quantum Roadmap**: IBM announced new quantum processors with improved error rates\n2. **Google's Quantum Supremacy**: Continued progress in quantum advantage demonstrations\n3. **Startup Funding**: Over $2B invested in quantum computing startups in 2024\n4. **Government Initiatives**: Increased funding for quantum research programs"),
            ("user", "Can you focus specifically on quantum error correction?"),
            ("assistant", "Absolutely! Quantum error correction is a critical area. Here's what I found:\n\n**Recent Breakthroughs in Quantum Error Correction:**\n- Surface code implementations showing improved logical qubit performance\n- New error correction protocols reducing overhead\n- Machine learning approaches to error mitigation\n- Hardware improvements in superconducting qubits")
        ]
    },
    {
        "user_prompt": "Analyze the impact of AI on healthcare",
        "messages": [
            ("user", "Analyze the impact of AI on healthcare"),
            ("assistant", "I'll analyze the impact of AI on healthcare across multiple dimensions. Let me gather comprehensive information on this topic."),
            ("system", "Gathering healthcare AI research..."),
            ("assistant", "**AI Impact on Healthcare Analysis:**\n\n**Diagnostic Applications:**\n- Medical imaging AI achieving 95%+ accuracy in radiology\n- Early disease detection in pathology\n- Automated screening for diabetic retinopathy\n\n**Treatment Optimization:**\n- Personalized medicine through genomic analysis\n- Drug discovery acceleration\n- Treatment protocol optimization\n\n**Operational Efficiency:**\n- Electronic health record automation\n- Predictive analytics for patient outcomes\n- Resource allocation optimization"),
            ("user", "What are the main challenges?"),
            ("assistant", "**Key Challenges in Healthcare AI:**\n\n1. **Data Privacy & Security**: HIPAA compliance and patient data protection\n2. **Regulatory Approval**: FDA approval processes for AI medical devices\n3. **Bias & Fairness**: Ensuring AI works across diverse populations\n4. **Integration**: Seamless integration with existing healthcare systems\n5. **Trust & Adoption**: Healthcare provider acceptance and patient trust")
        ]
    },
    {
        "user_prompt": "Investigate renewable energy trends",
        "messages": [
            ("user", "Investigate renewable energy trends"),
            ("assistant", "I'll investigate current renewable energy trends and market developments. Let me research the latest data and projections."),
            ("system", "Researching renewable energy market data..."),
            ("assistant", "**Renewable Energy Trends 2024:**\n\n**Solar Power:**\n- Cost reduction of 15% year-over-year\n- Utility-scale installations reaching 200GW globally\n- Bifacial panel technology adoption\n\n**Wind Energy:**\n- Offshore wind capacity doubling\n- Floating wind farms becoming viable\n- Turbine size increases improving efficiency\n\n**Energy Storage:**\n- Battery costs dropping 20% annually\n- Grid-scale storage deployments\n- Hydrogen storage gaining traction"),
            ("user", "How is policy affecting adoption?"),
            ("assistant", "**Policy Impact on Renewable Energy Adoption:**\n\n**Government Incentives:**\n- Tax credits and rebates driving residential solar\n- Feed-in tariffs supporting wind development\n- Net metering policies expanding\n\n**Regulatory Changes:**\n- Carbon pricing mechanisms\n- Renewable portfolio standards\n- Grid modernization initiatives\n\n**International Cooperation:**\n- Paris Agreement commitments\n- Cross-border energy trading\n- Technology transfer programs")
        ]
    },
    {
        "user_prompt": "Study the future of autonomous vehicles",
        "messages": [
            ("user", "Study the future of autonomous vehicles"),
            ("assistant", "I'll study the current state and future prospects of autonomous vehicles. Let me research the latest developments in AV technology and market trends."),
            ("system", "Analyzing autonomous vehicle technology..."),
            ("assistant", "**Autonomous Vehicle Future Analysis:**\n\n**Technology Progress:**\n- Level 4 autonomy in controlled environments\n- Improved sensor fusion and AI algorithms\n- V2X communication systems\n- Edge computing for real-time decisions\n\n**Market Trends:**\n- Ride-sharing services leading adoption\n- Commercial fleet automation\n- Consumer vehicle automation\n- Regulatory framework development"),
            ("user", "What are the biggest obstacles?"),
            ("assistant", "**Major Obstacles for Autonomous Vehicles:**\n\n**Technical Challenges:**\n- Edge case handling in complex environments\n- Weather and lighting condition limitations\n- Cybersecurity vulnerabilities\n- Sensor reliability and redundancy\n\n**Regulatory & Legal:**\n- Liability and insurance frameworks\n- Safety certification processes\n- International standardization\n- Privacy and data protection\n\n**Infrastructure:**\n- Smart city integration requirements\n- Communication network upgrades\n- Maintenance and support systems")
        ]
    },
    {
        "user_prompt": "Explore blockchain applications beyond cryptocurrency",
        "messages": [
            ("user", "Explore blockchain applications beyond cryptocurrency"),
            ("assistant", "I'll explore the diverse applications of blockchain technology beyond cryptocurrency. Let me research current implementations and future potential."),
            ("system", "Researching blockchain use cases..."),
            ("assistant", "**Blockchain Applications Beyond Cryptocurrency:**\n\n**Supply Chain Management:**\n- Product provenance tracking\n- Counterfeit prevention\n- Supply chain transparency\n- Quality assurance\n\n**Healthcare:**\n- Patient data security\n- Drug traceability\n- Medical record management\n- Clinical trial data integrity\n\n**Finance:**\n- Smart contracts for insurance\n- Trade finance automation\n- Cross-border payments\n- Digital identity verification"),
            ("user", "What about government applications?"),
            ("assistant", "**Government Blockchain Applications:**\n\n**Digital Identity:**\n- Citizen ID management\n- Voting systems\n- Document verification\n- Public service access\n\n**Transparency & Accountability:**\n- Budget tracking\n- Contract management\n- Public procurement\n- Regulatory compliance\n\n**Smart Cities:**\n- IoT device management\n- Energy grid optimization\n- Traffic management\n- Environmental monitoring")
        ]
    }
]

def generate_mock_chat_sessions(cosmos_service, num_sessions: int = 5) -> List[str]:
    """Generate mock chat sessions with realistic conversation data"""
    session_ids = []
    
    for i in range(min(num_sessions, len(MOCK_CONVERSATIONS))):
        conversation = MOCK_CONVERSATIONS[i]
        
        # Create chat session
        session_id = cosmos_service.create_chat_session(
            user_prompt=conversation["user_prompt"],
            metadata={
                "mock_data": True,
                "created_by": "mock_generator",
                "test_session": True
            }
        )
        session_ids.append(session_id)
        
        print(f"Created session {i+1}: {session_id}")
        
        # Add messages with realistic timestamps
        base_time = datetime.utcnow() - timedelta(days=random.randint(1, 30))
        
        for j, (message_type, content) in enumerate(conversation["messages"]):
            # Add some time between messages (1-5 minutes)
            message_time = base_time + timedelta(minutes=j*random.randint(1, 5))
            
            # Create message with custom timestamp
            message_id = str(uuid.uuid4())
            message = {
                "id": message_id,
                "type": "message",
                "session_id": session_id,
                "message_type": message_type,
                "content": content,
                "created_at": message_time.isoformat() + "Z",
                "metadata": {
                    "mock_data": True,
                    "test_message": True
                }
            }
            
            try:
                cosmos_service.container.create_item(body=message)
                print(f"  Added {message_type} message: {content[:50]}...")
            except Exception as e:
                print(f"  Error adding message: {e}")
    
    return session_ids

def create_additional_test_sessions(cosmos_service, num_sessions: int = 3):
    """Create additional test sessions with different conversation patterns"""
    additional_sessions = []
    
    # Quick Q&A session
    session_id = cosmos_service.create_chat_session(
        user_prompt="What is machine learning?",
        metadata={"mock_data": True, "session_type": "quick_qa"}
    )
    
    messages = [
        ("user", "What is machine learning?"),
        ("assistant", "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed."),
        ("user", "Can you give me an example?"),
        ("assistant", "Sure! Email spam filtering is a common example - the system learns to identify spam by analyzing thousands of emails and their labels."),
        ("user", "Thanks!"),
        ("assistant", "You're welcome! Feel free to ask if you have more questions about ML.")
    ]
    
    base_time = datetime.utcnow() - timedelta(hours=2)
    for i, (msg_type, content) in enumerate(messages):
        message_time = base_time + timedelta(minutes=i*2)
        cosmos_service.add_message(session_id, msg_type, content)
    
    additional_sessions.append(session_id)
    print(f"Created quick Q&A session: {session_id}")
    
    # Long research session
    session_id = cosmos_service.create_chat_session(
        user_prompt="Deep dive into climate change solutions",
        metadata={"mock_data": True, "session_type": "deep_research"}
    )
    
    long_messages = [
        ("user", "Deep dive into climate change solutions"),
        ("assistant", "I'll provide a comprehensive analysis of climate change solutions across multiple sectors..."),
        ("system", "Gathering climate research data..."),
        ("assistant", "**Comprehensive Climate Change Solutions:**\n\n**Energy Sector:**\n- Renewable energy transition\n- Energy efficiency improvements\n- Carbon capture and storage\n- Nuclear power considerations\n\n**Transportation:**\n- Electric vehicle adoption\n- Public transit expansion\n- Sustainable aviation fuels\n- Urban planning optimization\n\n**Agriculture:**\n- Sustainable farming practices\n- Plant-based diet promotion\n- Food waste reduction\n- Regenerative agriculture\n\n**Technology:**\n- Smart grid systems\n- Energy storage solutions\n- Carbon accounting tools\n- Climate monitoring systems"),
        ("user", "What about policy solutions?"),
        ("assistant", "**Policy Solutions for Climate Change:**\n\n**Carbon Pricing:**\n- Carbon taxes\n- Cap-and-trade systems\n- Carbon border adjustments\n\n**Regulatory Measures:**\n- Emissions standards\n- Renewable energy mandates\n- Building efficiency codes\n- Vehicle emission standards\n\n**International Cooperation:**\n- Paris Agreement implementation\n- Technology transfer\n- Climate finance\n- Capacity building"),
        ("user", "How can individuals contribute?"),
        ("assistant", "**Individual Climate Action:**\n\n**Lifestyle Changes:**\n- Reduce energy consumption\n- Choose sustainable transportation\n- Adopt plant-based diet\n- Minimize waste\n\n**Consumer Choices:**\n- Support renewable energy\n- Buy energy-efficient products\n- Choose sustainable brands\n- Reduce consumption\n\n**Community Engagement:**\n- Advocate for climate policies\n- Support environmental organizations\n- Educate others\n- Participate in local initiatives")
    ]
    
    base_time = datetime.utcnow() - timedelta(days=5)
    for i, (msg_type, content) in enumerate(long_messages):
        message_time = base_time + timedelta(hours=i*2)
        cosmos_service.add_message(session_id, msg_type, content)
    
    additional_sessions.append(session_id)
    print(f"Created deep research session: {session_id}")
    
    return additional_sessions

def main():
    """Main function to generate mock chat data"""
    print("🚀 Starting Mock Chat Data Generation...")
    
    try:
        # Initialize Cosmos DB service
        cosmos_service = get_cosmos_service()
        print("✅ Connected to Cosmos DB")
        
        # Generate main mock sessions
        print("\n📝 Generating main mock conversations...")
        session_ids = generate_mock_chat_sessions(cosmos_service, num_sessions=5)
        
        # Generate additional test sessions
        print("\n📝 Generating additional test sessions...")
        additional_sessions = create_additional_test_sessions(cosmos_service)
        
        # Summary
        total_sessions = len(session_ids) + len(additional_sessions)
        print(f"\n✅ Successfully created {total_sessions} mock chat sessions!")
        print(f"📊 Session IDs:")
        for i, session_id in enumerate(session_ids + additional_sessions, 1):
            print(f"  {i}. {session_id}")
        
        print(f"\n🎯 You can now test your chat history feature with these sessions!")
        print(f"💡 Use the /chat/sessions endpoint to retrieve all sessions")
        print(f"💡 Use /chat/session/{{session_id}} to get specific session details")
        
    except Exception as e:
        print(f"❌ Error generating mock data: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
import os
import re
from typing import Tuple, Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ContentFilter:
    """Content filtering system with both simple keyword filtering and Azure Content Safety integration"""
    
    def __init__(self):
        self.inappropriate_keywords = [
            # Sexual content
            "sexual", "porn", "pornography", "explicit", "adult content", "nude", "naked",
            "sex", "intimate", "erotic", "fetish", "masturbation", "orgasm", "prostitution",
            "escort", "brothel", "strip club", "sex toy", "condom", "contraception",
            
            # Violence and harm
            "violence", "violent", "kill", "murder", "assassination", "suicide", "self-harm",
            "harm", "hurt", "injure", "torture", "abuse", "rape", "assault", "bomb",
            "weapon", "gun", "knife", "poison", "drug overdose", "cutting", "burning",
            
            # Hate speech and discrimination
            "hate", "racist", "racism", "sexist", "homophobic", "transphobic", "discrimination",
            "slur", "offensive", "insult", "bully", "harassment", "threat", "intimidation",
            "nazi", "fascist", "supremacist", "genocide", "ethnic cleansing",
            
            # Illegal activities
            "illegal", "crime", "criminal", "fraud", "scam", "theft", "robbery", "drug dealing",
            "trafficking", "smuggling", "money laundering", "terrorism", "extremism",
            
            # Self-harm and dangerous content
            "self-harm", "suicide", "cutting", "overdose", "poisoning", "hanging", "jumping",
            "methods of suicide", "how to kill yourself", "ways to die", "end your life"
        ]
        
        # Initialize Azure Content Safety if available
        self.azure_safety_client = None
        self._init_azure_safety()
    
    def _init_azure_safety(self):
        """Initialize Azure Content Safety client if credentials are available"""
        try:
            from azure.ai.contentsafety import ContentSafetyClient
            from azure.core.credentials import AzureKeyCredential
            
            endpoint = os.getenv("AZURE_CONTENT_SAFETY_ENDPOINT")
            key = os.getenv("AZURE_CONTENT_SAFETY_KEY")
            
            if endpoint and key:
                self.azure_safety_client = ContentSafetyClient(
                    endpoint=endpoint,
                    credential=AzureKeyCredential(key)
                )
                print("Azure Content Safety client initialized successfully")
            else:
                print("Azure Content Safety credentials not found, using keyword filtering only")
        except ImportError:
            print("Azure Content Safety SDK not installed, using keyword filtering only")
        except Exception as e:
            print(f"Error initializing Azure Content Safety: {e}")
    
    def check_content_safety(self, text: str, use_azure: bool = True) -> Tuple[bool, str, Dict]:
        """
        Check if content is safe to process
        
        Args:
            text: Content to check
            use_azure: Whether to use Azure Content Safety (if available)
            
        Returns:
            Tuple of (is_safe, message, details)
        """
        details = {
            "method_used": "keyword_filter",
            "blocked_keywords": [],
            "azure_safety_used": False,
            "severity_level": "low"
        }
        
        # Debug: Print what we're checking
        print(f"Content Filter Debug - Checking text: {text[:100]}...")
        
        # First, try Azure Content Safety if available and requested
        # Temporarily disable Azure Content Safety to debug the issue
        if False and use_azure and self.azure_safety_client:
            try:
                azure_result = self._check_with_azure_safety(text)
                if azure_result:
                    details.update(azure_result)
                    details["azure_safety_used"] = True
                    details["method_used"] = "azure_content_safety"
                    
                    print(f"Azure Content Safety result: {azure_result}")
                    
                    # If Azure found issues, return the result
                    if not azure_result.get("is_safe", True):
                        print(f"Content blocked by Azure Content Safety: {azure_result}")
                        return False, azure_result.get("message", "Content blocked by Azure Content Safety"), details
            except Exception as e:
                print(f"Azure Content Safety check failed: {e}")
                # Fall back to keyword filtering
        
        # Fallback to keyword filtering
        result = self._check_with_keywords(text, details)
        print(f"Keyword filter result: {result}")
        return result
    
    def _check_with_azure_safety(self, text: str) -> Optional[Dict]:
        """Check content using Azure Content Safety API"""
        try:
            from azure.ai.contentsafety.models import AnalyzeTextOptions
            
            # Analyze text for content safety
            request = AnalyzeTextOptions(text=text)
            response = self.azure_safety_client.analyze_text(request)
            
            # Check each category
            categories = response.categories_analysis
            blocked_categories = []
            max_severity = 0
            
            for category in categories:
                if category.severity > 0:  # Content detected
                    blocked_categories.append({
                        "category": category.category.name,
                        "severity": category.severity
                    })
                    max_severity = max(max_severity, category.severity)
            
            if blocked_categories:
                severity_levels = {0: "safe", 2: "low", 4: "medium", 6: "high"}
                severity = severity_levels.get(max_severity, "unknown")
                
                return {
                    "is_safe": False,
                    "message": f"Content contains inappropriate material ({severity} severity). Please rephrase your question appropriately.",
                    "blocked_categories": blocked_categories,
                    "severity_level": severity,
                    "max_severity": max_severity
                }
            else:
                return {
                    "is_safe": True,
                    "message": "Content is safe",
                    "blocked_categories": [],
                    "severity_level": "safe"
                }
                
        except Exception as e:
            print(f"Error in Azure Content Safety check: {e}")
            return None
    
    def _check_with_keywords(self, text: str, details: Dict) -> Tuple[bool, str, Dict]:
        """Check content using keyword filtering"""
        text_lower = text.lower()
        blocked_keywords = []
        
        # Check if this is a legitimate research question
        research_indicators = [
            "research", "analysis", "study", "investigate", "examine", "explore",
            "strategic", "business", "market", "industry", "competitive", "framework",
            "recommendations", "stakeholders", "planning", "positioning", "entry"
        ]
        
        is_research_question = any(indicator in text_lower for indicator in research_indicators)
        
        # If it's a research question, be more lenient
        if is_research_question:
            print(f"Content Filter Debug - Detected research question, using lenient filtering")
            # Only block obviously inappropriate content
            strict_keywords = [
                "porn", "pornography", "explicit", "adult content", "xxx", "nsfw",
                "suicide", "self-harm", "kill yourself", "hurt yourself",
                "hate speech", "racist", "sexist", "homophobic", "transphobic"
            ]
            
            for keyword in strict_keywords:
                if keyword.lower() in text_lower:
                    blocked_keywords.append(keyword)
        else:
            # Use normal filtering for non-research content
            for keyword in self.inappropriate_keywords:
                if keyword.lower() in text_lower:
                    blocked_keywords.append(keyword)
        
        # Check for patterns that might indicate inappropriate content
        inappropriate_patterns = [
            r'\b(how to|ways to|methods to).*(kill|hurt|harm|die|suicide)\b',
            r'\b(where to|how to).*(buy|get|find).*(drugs|weapons|illegal)\b',
            r'\b(explicit|adult|porn|xxx|nsfw)\b',
            r'\b(hate|kill|destroy).*(group|people|race|religion)\b'
        ]
        
        for pattern in inappropriate_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                blocked_keywords.append(f"pattern_match: {pattern}")
        
        if blocked_keywords:
            details["blocked_keywords"] = blocked_keywords
            details["severity_level"] = "medium" if len(blocked_keywords) > 3 else "low"
            
            return False, f"Content contains inappropriate material. Please rephrase your question appropriately.", details
        
        return True, "Content is safe", details
    
    def get_filter_stats(self) -> Dict:
        """Get statistics about content filtering"""
        return {
            "azure_safety_available": self.azure_safety_client is not None,
            "keyword_count": len(self.inappropriate_keywords),
            "filter_methods": ["keyword_filter", "azure_content_safety"] if self.azure_safety_client else ["keyword_filter"]
        }


# Global content filter instance
content_filter = ContentFilter()


def check_content_safety(text: str, use_azure: bool = True) -> Tuple[bool, str, Dict]:
    """
    Convenience function to check content safety
    
    Args:
        text: Content to check
        use_azure: Whether to use Azure Content Safety (if available)
        
    Returns:
        Tuple of (is_safe, message, details)
    """
    return content_filter.check_content_safety(text, use_azure)


def is_content_safe(text: str) -> bool:
    """
    Simple boolean check for content safety
    
    Args:
        text: Content to check
        
    Returns:
        True if content is safe, False otherwise
    """
    is_safe, _, _ = check_content_safety(text, use_azure=True)
    return is_safe


def get_content_filter_stats() -> Dict:
    """Get content filter statistics"""
    return content_filter.get_filter_stats()

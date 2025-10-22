# -*- coding: utf-8 -*-
import json
import re
import os
from typing import List
from datetime import datetime
from src.agents import (
    research_agent,
    writer_agent,
    editor_agent,
    parallel_writer_agent,
)

# Configure Azure OpenAI client
from openai import AzureOpenAI

client = AzureOpenAI(
    api_version="2025-01-01-preview",
    azure_endpoint="https://oai-sbd-genai-common-eastus2-dev.openai.azure.com/",
    api_key=os.getenv("AZURE_OPENAI_KEY")
)


def clean_json_block(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
    return raw.strip("` \n")


from typing import List
import json, ast


def planner_agent(topic: str, model: str = "azure:gpt-4") -> List[str]:
    """
    Generate a standardized 6-step research workflow:
    1. Research agent: Tavily web search
    2. Research agent: arXiv search
    3. Analysis agent: Organize and synthesize
    4. Analysis agent: Rank and evaluate sources
    5. Editor agent: Review and refine
    6. Writer agent: Generate final report
    """
    
    # Define the exact 6-step workflow structure
    steps = [
        "Research agent: Use Tavily to perform a broad web search and collect top relevant items (title, authors, year, venue/source, URL, DOI if available).",
        "Research agent: For each collected item, search on arXiv to find matching preprints/versions and record arXiv URLs (if they exist).",
        "Analysis agent: Organize and synthesize the results from Tavily and arXiv, categorizing items by their relevance to the research topic and identifying key themes.",
        "Analysis agent: Rank the collected sources by authority, impact, and recency, highlighting seminal works and high-impact research.",
        "Editor agent: Review, refine, and improve the analysis for clarity and comprehensiveness, ensuring all research findings are accurately represented.",
        "Writer agent: Generate the final comprehensive Markdown report with inline citations and a complete References section with clickable links."
    ]
    
    return steps


def executor_agent_step(step_title: str, history: list, prompt: str, advanced_options: dict = None):
    """
    Executes a step of the executor agent.
    Returns:
        - step_title (str)
        - agent_name (str)
        - output (str)
    """
    

    # Construir contexto enriquecido estructurado
    context = f"User Prompt:\n{prompt}\n\nHistory so far:\n"
    for i, (desc, agent, output) in enumerate(history):
        if "draft" in desc.lower() or agent == "writer_agent":
            context += f"\nDraft (Step {i + 1}):\n{output.strip()}\n"
        elif "feedback" in desc.lower() or agent == "editor_agent":
            context += f"\nFeedback (Step {i + 1}):\n{output.strip()}\n"
        elif "research" in desc.lower() or agent == "research_agent":
            context += f"\nResearch (Step {i + 1}):\n{output.strip()}\n"
        else:
            context += f"\nOther (Step {i + 1}) by {agent}:\n{output.strip()}\n"

    enriched_task = f"""{context}

Your next task:
{step_title}
"""

    # Select agent based on step
    step_lower = step_title.lower()
    if "research" in step_lower:
        content, _ = research_agent(prompt=enriched_task)
        print("Research Agent Output:", content)
        return step_title, "research_agent", content
    elif "analysis agent" in step_lower or "analyze" in step_lower or "synthesize" in step_lower or "organize" in step_lower or "filter" in step_lower or "rank" in step_lower:
        from src.agents import analysis_agent
        content, _ = analysis_agent(prompt=enriched_task)
        print("Analysis Agent Output:", content)
        return step_title, "analysis_agent", content
    elif "draft" in step_lower or "write" in step_lower:
        # Check if this should use parallel processing
        if "parallel" in step_lower or "concurrent" in step_lower or len(history) > 2:
            # Use parallel writer for complex topics or when explicitly requested
            content, _ = parallel_writer_agent(prompt=enriched_task, advanced_options=advanced_options)
            return step_title, "parallel_writer_agent", content
        else:
            content, _ = writer_agent(prompt=enriched_task, advanced_options=advanced_options)
            return step_title, "writer_agent", content
    elif "revise" in step_lower or "edit" in step_lower or "feedback" in step_lower:
        content, _ = editor_agent(prompt=enriched_task)
        return step_title, "editor_agent", content
    else:
        raise ValueError(f"Unknown step type: {step_title}")

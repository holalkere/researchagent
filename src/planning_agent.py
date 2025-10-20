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
    # Use direct API keys instead of environment variables
    import os
    
    # Set API keys directly in the environment for this session
    # API keys are loaded from .env file via load_dotenv() in main.py
    
    
    prompt = f"""
You are a planning agent responsible for organizing a research workflow using multiple intelligent agents.

Available agents:
- Research agent: MUST begin with a broad **web search using Tavily** to identify only **relevant** and **authoritative** items (e.g., high-impact venues, seminal works, surveys, or recent comprehensive sources). The output of this step MUST capture for each candidate: title, authors, year, venue/source, URL, and (if available) DOI.
- Research agent: AFTER the Tavily step, perform a **targeted arXiv search** ONLY for the candidates discovered in the web step (match by title/author/DOI). If an arXiv preprint/version exists, record its arXiv URL and version info. Do NOT run a generic arXiv search detached from the Tavily results.
- Analysis agent: For intermediate steps - analyzes, synthesizes, or organizes research findings without generating a full report.
- Writer agent: ONLY for the FINAL step - generates the complete comprehensive report with all sections.
- Editor agent: reviews, reflects on, and improves drafts.

Produce a clear step-by-step research plan **as a valid Python list of strings** (no markdown, no explanations). 
Each step must be atomic, actionable, and assigned to one of the agents.
Maximum of 7 steps.

DO NOT include steps like "create CSV", "set up repo", "install packages".
Focus on meaningful research tasks (search, extract, rank, analyze, synthesize).
IMPORTANT: Use Writer agent ONLY for the final step. Do NOT use Writer agent for intermediate steps.
The FIRST step MUST be exactly: 
"Research agent: Use Tavily to perform a broad web search and collect top relevant items (title, authors, year, venue/source, URL, DOI if available)."
The SECOND step MUST be exactly:
"Research agent: For each collected item, search on arXiv to find matching preprints/versions and record arXiv URLs (if they exist)."

The FINAL step MUST instruct the writer agent to generate a comprehensive Markdown report using parallel processing:
"Writer agent: Generate the final comprehensive Markdown report using parallel processing to write sections concurrently, with inline citations and a complete References section with clickable links."

This will:
- Use all findings and outputs from previous steps
- Include inline citations (e.g., [1], (Wikipedia/arXiv))
- Include a References section with clickable links for all citations
- Preserve earlier sources
- Be detailed and self-contained
- Generate faster through parallel section writing

Topic: "{topic}"
"""

    response = client.chat.completions.create(
        model=os.getenv("AZURE_OPENAI_DEPLOYMENT", "sbd-o3-mini-0131"),
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.choices[0].message.content.strip()

    # --- robust parsing: JSON -> ast -> fallback ---
    def _coerce_to_list(s: str) -> List[str]:
        # try strict JSON
        try:
            obj = json.loads(s)
            if isinstance(obj, list) and all(isinstance(x, str) for x in obj):
                return obj[:7]
        except json.JSONDecodeError:
            pass
        # try Python literal list
        try:
            obj = ast.literal_eval(s)
            if isinstance(obj, list) and all(isinstance(x, str) for x in obj):
                return obj[:7]
        except Exception:
            pass
        # try to extract code fence if present
        if s.startswith("```") and s.endswith("```"):
            inner = s.strip("`")
            try:
                obj = ast.literal_eval(inner)
                if isinstance(obj, list) and all(isinstance(x, str) for x in obj):
                    return obj[:7]
            except Exception:
                pass
        return []

    steps = _coerce_to_list(raw)

    # enforce ordering & minimal contract
    required_first = "Research agent: Use Tavily to perform a broad web search and collect top relevant items (title, authors, year, venue/source, URL, DOI if available)."
    required_second = "Research agent: For each collected item, search on arXiv to find matching preprints/versions and record arXiv URLs (if they exist)."
    final_required = "Writer agent: Generate the final comprehensive Markdown report using parallel processing to write sections concurrently, with inline citations and a complete References section with clickable links."

    def _ensure_contract(steps_list: List[str]) -> List[str]:
        if not steps_list:
            return [
                required_first,
                required_second,
                "Research agent: Synthesize and rank findings by relevance, recency, and authority; deduplicate by title/DOI.",
                "Writer agent: Draft a structured outline based on the ranked evidence.",
                "Editor agent: Review for coherence, coverage, and citation completeness; request fixes.",
                final_required,
            ]
        # inject/replace first two if missing or out of order
        steps_list = [s for s in steps_list if isinstance(s, str)]
        if not steps_list or steps_list[0] != required_first:
            steps_list = [required_first] + steps_list
        if len(steps_list) < 2 or steps_list[1] != required_second:
            # remove any generic arxiv step that is not tied to Tavily results
            steps_list = (
                [steps_list[0]]
                + [required_second]
                + [
                    s
                    for s in steps_list[1:]
                    if "arXiv" not in s or "For each collected item" in s
                ]
            )
        # ensure final step requirement present
        if final_required not in steps_list:
            steps_list.append(final_required)
        # cap to 7
        return steps_list[:7]

    steps = _ensure_contract(steps)

    return steps


def executor_agent_step(step_title: str, history: list, prompt: str):
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
            content, _ = parallel_writer_agent(prompt=enriched_task)
            return step_title, "parallel_writer_agent", content
        else:
            content, _ = writer_agent(prompt=enriched_task)
            return step_title, "writer_agent", content
    elif "revise" in step_lower or "edit" in step_lower or "feedback" in step_lower:
        content, _ = editor_agent(prompt=enriched_task)
        return step_title, "editor_agent", content
    else:
        raise ValueError(f"Unknown step type: {step_title}")

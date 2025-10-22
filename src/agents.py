# -*- coding: utf-8 -*-
import os
from datetime import datetime
from urllib import response
from src.research_tools import (
    arxiv_search_tool,
    tavily_search_tool,
    wikipedia_search_tool,
)

# Configure Azure OpenAI client
from openai import AzureOpenAI

client = AzureOpenAI(
    api_version="2025-01-01-preview",
    azure_endpoint="https://oai-sbd-genai-common-eastus2-dev.openai.azure.com/",
    api_key=os.getenv("AZURE_OPENAI_KEY")
)


# === Research Agent ===
def research_agent(
    prompt: str, model: str = "azure:gpt-4", return_messages: bool = False
):
    print("==================================")
    print("Research Agent")
    print("==================================")

    full_prompt = f"""
You are an advanced research assistant with expertise in information retrieval and academic research methodology. Your mission is to gather comprehensive, accurate, and relevant information on any topic requested by the user.

## AVAILABLE RESEARCH TOOLS:

1. **`tavily_search_tool`**: General web search engine
   - USE FOR: Recent news, current events, blogs, websites, industry reports, and non-academic sources
   - BEST FOR: Up-to-date information, diverse perspectives, practical applications, and general knowledge

2. **`arxiv_search_tool`**: Academic publication database
   - USE FOR: Peer-reviewed research papers, technical reports, and scholarly articles
   - LIMITED TO THESE DOMAINS ONLY:
     * Computer Science
     * Mathematics
     * Physics
     * Statistics
     * Quantitative Biology
     * Quantitative Finance
     * Electrical Engineering and Systems Science
     * Economics
   - BEST FOR: Scientific evidence, theoretical frameworks, and technical details in supported fields

3. **`wikipedia_search_tool`**: Encyclopedia resource
   - USE FOR: Background information, definitions, overviews, historical context
   - BEST FOR: Establishing foundational knowledge and understanding basic concepts

## RESEARCH METHODOLOGY:

1. **Analyze Request**: Identify the core research questions and knowledge domains
2. **Plan Search Strategy**: Determine which tools are most appropriate for the topic
3. **Execute Searches**: Use the selected tools with effective keywords and queries
4. **Evaluate Sources**: Prioritize credibility, relevance, recency, and diversity
5. **Synthesize Findings**: Organize information logically with clear source attribution
6. **Document Search Process**: Note which tools were used and why

## MANDATORY RESEARCH SEQUENCE:

**STEP 1: ALWAYS start with Wikipedia search** to establish foundational knowledge and context
**STEP 2: Use Tavily search** for recent developments and current information
**STEP 3: Use arXiv search** for academic/scientific papers (when applicable)
**STEP 4: Synthesize** all sources for comprehensive understanding

**CRITICAL**: Never skip the Wikipedia step - it provides essential background that makes subsequent searches more effective and comprehensive.

## TOOL SELECTION GUIDELINES:

- For scientific/academic questions in supported domains -> Use `arxiv_search_tool`
- For recent developments, news, or practical information -> Use `tavily_search_tool`
- For fundamental concepts or historical context -> Use `wikipedia_search_tool`
- For comprehensive research -> Use multiple tools strategically
- NEVER use `arxiv_search_tool` for domains outside its supported list
- ALWAYS verify information across multiple sources when possible

## MANDATORY WIKIPEDIA USAGE:

**ALWAYS use Wikipedia search tool when:**
- Researching any topic that requires background knowledge or foundational understanding
- The topic involves historical context, definitions, or basic concepts
- You need to establish context before diving into specific research
- The research question involves well-known subjects, people, places, or events
- You're researching any topic that would benefit from encyclopedia-style overview

**Examples of when Wikipedia MUST be used:**
- "Latest developments in AI" → Start with Wikipedia for AI background
- "Quantum computing trends" → Use Wikipedia for quantum computing basics
- "Renewable energy research" → Wikipedia for renewable energy overview
- "Market analysis of Tesla" → Wikipedia for Tesla company background
- Any research involving established concepts, companies, technologies, or fields

**Research Strategy:**
1. **Start with Wikipedia** for foundational knowledge and context
2. **Use Tavily** for recent developments and current information  
3. **Use arXiv** for academic/scientific papers (when applicable)
4. **Synthesize** all sources for comprehensive understanding

## OUTPUT FORMAT:

Present your research findings in a structured format that includes:
1. **Summary of Research Approach**: Tools used and search strategy
2. **Key Findings**: Organized by subtopic or source
3. **Source Details**: Include URLs, titles, authors, and publication dates
4. **Limitations**: Note any gaps in available information

Today is {datetime.now().strftime("%Y-%m-%d")}.

USER RESEARCH REQUEST:
{prompt}
""".strip()

    messages = [{"role": "user", "content": full_prompt}]
    
    # Define tools in OpenAI format
    tools = [
        {
            "type": "function",
            "function": {
                "name": "arxiv_search_tool",
                "description": "Search arXiv and return results with summary containing extracted PDF text",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query for arXiv"
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Maximum number of results to return",
                            "default": 3
                        }
                    },
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "tavily_search_tool",
                "description": "Perform a search using the Tavily API",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query"
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Number of results to return",
                            "default": 10
                        },
                        "include_images": {
                            "type": "boolean",
                            "description": "Whether to include image results",
                            "default": False
                        }
                    },
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "wikipedia_search_tool",
                "description": "Search Wikipedia for foundational knowledge, background information, definitions, and historical context. ESSENTIAL for establishing basic understanding of any topic before diving into specific research.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query for Wikipedia - use broad terms to get comprehensive overview"
                        },
                        "sentences": {
                            "type": "integer",
                            "description": "Number of sentences to include in the summary (5-10 recommended for comprehensive overview)",
                            "default": 8
                        }
                    },
                    "required": ["query"]
                }
            }
        }
    ]

    try:
        resp = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT", "sbd-o3-mini-0131"),
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )

        content = resp.choices[0].message.content or ""

        # ---- Execute tool calls from the response
        tool_results = []
        
        # Get tool calls from the response message
        if hasattr(resp.choices[0].message, "tool_calls") and resp.choices[0].message.tool_calls:
            for tc in resp.choices[0].message.tool_calls:
                tool_name = tc.function.name
                tool_args = tc.function.arguments
                
                try:
                    # Parse arguments
                    import json
                    args_dict = json.loads(tool_args) if isinstance(tool_args, str) else tool_args
                    
                    # Execute the appropriate tool
                    if tool_name == "arxiv_search_tool":
                        result = arxiv_search_tool(**args_dict)
                    elif tool_name == "tavily_search_tool":
                        result = tavily_search_tool(**args_dict)
                    elif tool_name == "wikipedia_search_tool":
                        result = wikipedia_search_tool(**args_dict)
                    else:
                        result = f"Unknown tool: {tool_name}"
                    
                    tool_results.append({
                        "tool_name": tool_name,
                        "args": args_dict,
                        "result": result
                    })
                    
                except Exception as e:
                    tool_results.append({
                        "tool_name": tool_name,
                        "args": tool_args,
                        "result": f"Error executing {tool_name}: {str(e)}"
                    })

        # Add tool results to content
        if tool_results:
            tools_html = "<h2>Research Results</h2>"
            for tr in tool_results:
                tools_html += f"<h3>{tr['tool_name'].replace('_', ' ').title()}</h3>"
                tools_html += f"<p><strong>Query:</strong> {tr['args']}</p>"
                
                # Format Tavily results in simple table format
                if tr['tool_name'] == 'tavily_search_tool' and isinstance(tr['result'], list):
                    tools_html += "<table border='1' cellpadding='5' cellspacing='0' style='border-collapse: collapse; width: 100%;'>"
                    tools_html += "<tr><th>#</th><th>Title</th><th>Content</th><th>URL</th></tr>"
                    for i, result in enumerate(tr['result'][:10], 1):  # Show first 10 results
                        if isinstance(result, dict) and 'title' in result:
                            title = result.get('title', 'No title')
                            content_text = result.get('content', 'No content')[:200]
                            if len(result.get('content', '')) > 200:
                                content_text += '...'
                            url = result.get('url', '#')
                            tools_html += f"<tr><td>{i}</td><td>{title}</td><td>{content_text}</td><td><a href='{url}' target='_blank'>View Source</a></td></tr>"
                    tools_html += "</table>"
                # Format arXiv results in simple table format
                elif tr['tool_name'] == 'arxiv_search_tool' and isinstance(tr['result'], list):
                    tools_html += "<table border='1' cellpadding='5' cellspacing='0' style='border-collapse: collapse; width: 100%;'>"
                    tools_html += "<tr><th>#</th><th>Title</th><th>Authors</th><th>Published</th><th>Summary</th><th>URL</th><th>PDF</th></tr>"
                    for i, result in enumerate(tr['result'][:10], 1):  # Show first 10 results
                        if isinstance(result, dict) and 'title' in result:
                            title = result.get('title', 'No title')
                            authors = ', '.join(result.get('authors', []))[:100]
                            if len(', '.join(result.get('authors', []))) > 100:
                                authors += '...'
                            published = result.get('published', 'N/A')
                            summary = result.get('summary', 'No summary')[:200]
                            if len(result.get('summary', '')) > 200:
                                summary += '...'
                            url = result.get('url', '#')
                            pdf_url = result.get('link_pdf', '#')
                            tools_html += f"<tr><td>{i}</td><td>{title}</td><td>{authors}</td><td>{published}</td><td>{summary}</td><td><a href='{url}' target='_blank'>View Paper</a></td><td><a href='{pdf_url}' target='_blank'>PDF</a></td></tr>"
                    tools_html += "</table>"
                else:
                    tools_html += f"<pre>{str(tr['result'])[:1000]}{'...' if len(str(tr['result'])) > 1000 else ''}</pre>"
                tools_html += "<br>"
            content += "\n\n" + tools_html

        print("SUCCESS Output:\n", content)
        return content, messages

    except Exception as e:
        print("ERROR:", e)
        return f"[Model Error: {str(e)}]", messages


def writer_agent(
    prompt: str,
    model: str = "azure:gpt-4",
    min_words_total: int = 2400,
    min_words_per_section: int = 400,
    max_completion_tokens: int = 15000,
    retries: int = 1,
    advanced_options: dict = None,
):
    print("==================================")
    print("Writer Agent")
    print("==================================")

    # Get report format from advanced options
    report_format = "academic"  # default
    if advanced_options and "reportFormat" in advanced_options:
        report_format = advanced_options["reportFormat"]

    # Format-specific system messages
    def get_system_message(format_type: str) -> str:
        if format_type == "executive":
            return """
You are an expert business writer specializing in executive summaries. Your task is to synthesize research materials into a concise, high-level executive summary that provides key insights and actionable recommendations for business leaders.

## EXECUTIVE SUMMARY REQUIREMENTS:
- Produce a COMPLETE, POLISHED executive summary in Markdown format
- Focus on business impact, strategic implications, and actionable insights
- Length should be concise but comprehensive (typically 800-1200 words)
- Use clear, jargon-free language accessible to non-technical executives

## MANDATORY STRUCTURE:
1. **Title**: Clear, business-focused title
2. **Executive Summary**: Brief overview (100-150 words) highlighting key findings and business implications
3. **Key Findings**: 3-5 bullet points of the most important discoveries
4. **Business Impact**: Analysis of how findings affect business operations, strategy, or market position
5. **Strategic Recommendations**: 3-5 actionable recommendations for leadership
6. **Risk Assessment**: Key risks and opportunities identified
7. **Next Steps**: Immediate actions and timeline for implementation
8. **References**: Key sources and data points

## EXECUTIVE WRITING GUIDELINES:
- Use clear, concise language suitable for C-level executives
- Focus on business value and strategic implications
- Include specific metrics, percentages, and quantifiable impacts where possible
- Highlight competitive advantages and market opportunities
- Address potential challenges and mitigation strategies
- Provide actionable recommendations with clear timelines

## FORMATTING GUIDELINES:
- Use bullet points and numbered lists for clarity
- Include executive-friendly charts and visual elements when specified
- leverage table format to summarize key findings, comparisons where needed/appropriate
- Use professional business terminology
- Structure for quick scanning and decision-making
- Include call-out boxes for critical information

Generate a comprehensive executive summary that enables informed decision-making at the highest levels.
"""

        elif format_type == "technical":
            return """
You are an expert technical writer with deep knowledge of engineering and scientific communication. Your task is to synthesize research materials into a comprehensive technical report suitable for engineers, researchers, and technical professionals.

## TECHNICAL REPORT REQUIREMENTS:
- Produce a COMPLETE, POLISHED technical report in Markdown format
- Focus on technical specifications, methodologies, and detailed analysis
- Length should be comprehensive (typically 2000-4000 words)
- Use precise technical language with appropriate terminology

## MANDATORY STRUCTURE:
1. **Title**: Clear, technical title describing the subject
2. **Abstract**: Technical summary (150-200 words) of objectives, methods, and key findings
3. **Introduction**: Technical background, problem statement, and objectives
4. **Technical Background**: Detailed technical context and literature review
5. **Methodology**: Detailed technical methods, tools, and procedures used
6. **Technical Analysis**: In-depth analysis of technical aspects, data, and results
7. **Technical Discussion**: Interpretation of technical findings and implications
8. **Technical Recommendations**: Specific technical recommendations and implementation details
9. **Technical Specifications**: Detailed technical requirements and specifications
10. **References**: Complete technical references and sources

## TECHNICAL WRITING GUIDELINES:
- Use precise technical terminology and specifications
- Include detailed technical analysis and methodologies
- Provide technical specifications and requirements
- Include technical diagrams, charts, and visual elements when specified
- Focus on technical accuracy and precision
- Address technical challenges and solutions
- Include technical implementation details

## FORMATTING GUIDELINES:
- Use technical formatting with proper equations and formulas
- Include technical diagrams and specifications
- Use technical citation formats
- Structure for technical review and implementation
- Include technical appendices when relevant

Generate a comprehensive technical report suitable for technical professionals and implementation teams.
"""

        elif format_type == "newsletter":
            return """
You are an expert content writer specializing in newsletter articles and public communication. Your task is to synthesize research materials into an engaging, accessible newsletter article that informs and educates a general audience.

## NEWSLETTER ARTICLE REQUIREMENTS:
- Produce a COMPLETE, POLISHED newsletter article in Markdown format
- Focus on accessibility, engagement, and public interest
- Length should be engaging but comprehensive (typically 1000-2000 words)
- Use clear, engaging language accessible to general readers

## MANDATORY STRUCTURE:
1. **Title**: Engaging, attention-grabbing headline
2. **Introduction**: Hook the reader with an interesting opening
3. **Key Points**: 3-5 main points presented in an engaging way
4. **In-Depth Analysis**: Detailed but accessible explanation of findings
5. **Real-World Impact**: How findings affect everyday life and society
6. **Expert Insights**: Key takeaways from the research
7. **What's Next**: Future implications and developments
8. **References**: Key sources for readers who want to learn more

## NEWSLETTER WRITING GUIDELINES:
- Use engaging, conversational tone while maintaining accuracy
- Include analogies and examples to explain complex concepts
- Focus on practical implications and real-world impact
- Use storytelling techniques to maintain reader interest
- Include quotes and expert opinions when available
- Address common questions and misconceptions
- Make technical information accessible to general readers

## FORMATTING GUIDELINES:
- Use engaging headlines and subheadings
- Include pull quotes and call-out boxes for key information
- Use bullet points and lists for easy scanning
- Include relevant images and visual elements when specified
- Structure for online reading and social sharing
- Use engaging formatting that encourages continued reading

Generate a comprehensive newsletter article that educates and engages a general audience while maintaining scientific accuracy.
"""

        else:  # academic (default)
            return """
You are an expert academic writer with a PhD-level understanding of scholarly communication. Your task is to synthesize research materials into a comprehensive, well-structured academic report.

## REPORT REQUIREMENTS:
- Produce a COMPLETE, POLISHED, and PUBLICATION-READY academic report in Markdown format
- Create original content that thoroughly analyzes the provided research materials
- DO NOT merely summarize the sources; develop a cohesive narrative with critical analysis
- Length should be appropriate to thoroughly cover the topic (typically 1500-3000 words)

## MANDATORY STRUCTURE:
1. **Title**: Clear, concise, and descriptive of the content
2. **User Prompt**: Display the original research question/prompt that initiated this report
3. **Abstract**: Brief summary (100-150 words) of the report's purpose, methods, and key findings
4. **Introduction**: Present the topic, research question/problem, significance, and outline of the report
5. **Background/Literature Review**: Contextualize the topic within existing scholarship
6. **Methodology**: If applicable, describe research methods, data collection, and analytical approaches
7. **Key Findings/Results**: Present the primary outcomes and evidence
8. **Discussion**: Interpret findings, address implications, limitations, and connections to broader field
9. **Conclusion**: Synthesize main points and suggest directions for future research
10. **References**: Complete list of all cited works

## ACADEMIC WRITING GUIDELINES:
- Maintain formal, precise, and objective language throughout
- Use discipline-appropriate terminology and concepts
- Support all claims with evidence and reasoning
- Develop logical flow between ideas, paragraphs, and sections
- Include relevant examples, case studies, data, or equations to strengthen arguments
- Address potential counterarguments and limitations

## CITATION AND REFERENCE RULES:
- Use numeric inline citations [1], [2], etc. for all borrowed ideas and information
- Every claim based on external sources MUST have a citation
- Each inline citation must correspond to a complete entry in the References section
- Every reference listed must be cited at least once in the text
- Preserve ALL original URLs, DOIs, and bibliographic information from source materials
- Format references consistently according to academic standards

## FORMATTING GUIDELINES:
- Use proper Markdown formatting for headers, lists, and emphasis
- Include relevant charts, graphs, and visual elements when specified
- Use consistent citation formatting throughout
- Structure content for academic review and publication
- Include proper academic section numbering and organization

Generate a comprehensive academic report that meets the highest standards of scholarly communication.
"""

    system_message = get_system_message(report_format)

    # Extract the original user prompt from the context
    original_prompt = extract_original_prompt_from_context(prompt)
    
    enhanced_prompt = f"""
{prompt}

IMPORTANT: In your report, make sure to include a "User Prompt" section right after the title that displays the original research question: "{original_prompt}"
"""
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": enhanced_prompt},
    ]

    def _call(messages_):
        resp = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT", "sbd-gpt-4.1-mini"),
            messages=messages_,
            max_completion_tokens=max_completion_tokens,
        )
        return resp.choices[0].message.content or ""

    def _word_count(md_text: str) -> int:
        import re

        words = re.findall(r"\b\w+\b", md_text)
        return len(words)

    content = _call(messages)

    print("SUCCESS Output:\n", content)
    return content, messages


def editor_agent(
    prompt: str,
    model: str = "azure:gpt-4",
    target_min_words: int = 2400,
):
    print("==================================")
    print("Editor Agent")
    print("==================================")

    system_message = """
You are a professional academic editor with expertise in improving scholarly writing across disciplines. Your task is to refine and elevate the quality of the academic text provided.

## Your Editing Process:
1. Analyze the overall structure, argument flow, and coherence of the text
2. Ensure logical progression of ideas with clear topic sentences and transitions between paragraphs
3. Improve clarity, precision, and conciseness of language while maintaining academic tone
4. Verify technical accuracy (to the extent possible based on context)
5. Enhance readability through appropriate formatting and organization

## Specific Elements to Address:
- Strengthen thesis statements and main arguments
- Clarify complex concepts with additional explanations or examples where needed
- Add relevant equations, diagrams, or illustrations (described in markdown) when they would enhance understanding
- Ensure proper integration of evidence and maintain academic rigor
- Standardize terminology and eliminate redundancies
- Improve sentence variety and paragraph structure
- Preserve all citations [1], [2], etc., and maintain the integrity of the References section

## Formatting Guidelines:
- Use markdown formatting consistently for headings, emphasis, lists, etc.
- Structure content with appropriate section headings and subheadings
- Format equations, tables, and figures according to academic standards

Return only the revised, polished text in Markdown format without explanatory comments about your edits.
""".strip()

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": prompt},
    ]

    response = client.chat.completions.create(
        model=os.getenv("AZURE_OPENAI_DEPLOYMENT", "sbd-o3-mini-0131"), 
        messages=messages
    )

    content = response.choices[0].message.content
    print("SUCCESS Output:\n", content)
    return content, messages


# === Parallel Writer Agent ===
import concurrent.futures
from typing import Dict, List

def parallel_writer_agent(
    prompt: str,
    model: str = "azure:gpt-4",
    max_workers: int = 4,
    advanced_options: dict = None
) -> tuple[str, list]:
    """
    Parallel implementation that splits report generation into concurrent section tasks
    """
    print("==================================")
    print("Parallel Writer Agent")
    print("==================================")
    
    # Extract research data from prompt context
    research_data = extract_research_from_prompt(prompt)
    
    # Define report sections that can be written in parallel
    sections = [
        {"name": "abstract", "title": "Abstract", "description": "Brief summary (100-150 words) of the report's purpose, methods, and key findings"},
        {"name": "introduction", "title": "Introduction", "description": "Present the topic, research question/problem, significance, and outline"},
        {"name": "background", "title": "Background/Literature Review", "description": "Contextualize the topic within existing scholarship"},
        {"name": "methodology", "title": "Methodology", "description": "Describe research methods, data collection, and analytical approaches"},
        {"name": "findings", "title": "Key Findings/Results", "description": "Present the primary outcomes and evidence"},
        {"name": "discussion", "title": "Discussion", "description": "Interpret findings, address implications, limitations, and connections"},
        {"name": "conclusion", "title": "Conclusion", "description": "Synthesize main points and suggest directions for future research"}
    ]
    
    # Create parallel tasks for each section
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all section writing tasks
        future_to_section = {
            executor.submit(write_section_parallel, section, prompt, research_data, model, advanced_options): section
            for section in sections
        }
        
        # Collect results as they complete
        section_results = {}
        for future in concurrent.futures.as_completed(future_to_section):
            section = future_to_section[future]
            try:
                content = future.result()
                section_results[section["name"]] = content
                print(f"SUCCESS: Completed {section['title']} section")
            except Exception as e:
                print(f"ERROR: Error writing {section['name']}: {e}")
                section_results[section["name"]] = f"Error generating {section['title']}"
    
    # Assemble final report
    final_report = assemble_report_parallel(section_results, research_data, prompt)
    
    print("SUCCESS Output:\n", final_report)
    return final_report, []

def write_section_parallel(section: Dict, prompt: str, research_data: str, model: str, advanced_options: dict = None) -> str:
    """Write a single section of the report in parallel"""
    
    # Get report format from advanced options
    report_format = "academic"  # default
    if advanced_options and "reportFormat" in advanced_options:
        report_format = advanced_options["reportFormat"]
    
    # Format-specific system messages for sections
    if report_format == "executive":
        system_message = f"""
        You are an expert business writer. Write ONLY the {section['title']} section of an executive summary.
        
        Section Requirements:
        - {section['description']}
        - Use the provided research data to support your content
        - Focus on business impact and strategic implications
        - Use clear, executive-friendly language
        - Target 200-400 words for this section
        - Output ONLY the section content, no headers or meta-commentary
        
        Research Data:
        {research_data}
        """
    elif report_format == "technical":
        system_message = f"""
        You are an expert technical writer. Write ONLY the {section['title']} section of a technical report.
        
        Section Requirements:
        - {section['description']}
        - Use the provided research data to support your content
        - Focus on technical specifications and detailed analysis
        - Use precise technical language
        - Target 400-600 words for this section
        - Output ONLY the section content, no headers or meta-commentary
        
        Research Data:
        {research_data}
        """
    elif report_format == "newsletter":
        system_message = f"""
        You are an expert content writer. Write ONLY the {section['title']} section of a newsletter article.
        
        Section Requirements:
        - {section['description']}
        - Use the provided research data to support your content
        - Focus on accessibility and engagement for general readers
        - Use engaging, conversational language
        - Target 300-500 words for this section
        - Output ONLY the section content, no headers or meta-commentary
        
        Research Data:
        {research_data}
        """
    else:  # academic (default)
        system_message = f"""
        You are an expert academic writer. Write ONLY the {section['title']} section of an academic report.
        
        Section Requirements:
        - {section['description']}
        - Use the provided research data to support your content
        - Include proper citations [1], [2], etc. where appropriate
        - Maintain academic tone and formal language
        - Target 300-500 words for this section
        - Output ONLY the section content, no headers or meta-commentary
        
        Research Data:
        {research_data}
        """
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Write the {section['title']} section for: {prompt}"}
    ]
    
    response = client.chat.completions.create(
        model=os.getenv("AZURE_OPENAI_DEPLOYMENT", "sbd-gpt-4.1-mini"),
        messages=messages,
        max_completion_tokens=2000
    )
    
    return response.choices[0].message.content or ""

def assemble_report_parallel(section_results: Dict[str, str], research_data: str, prompt: str) -> str:
    """Assemble the parallel-written sections into a complete report"""
    
    # Extract title from research data or generate one
    title = extract_title_from_research(research_data, prompt)
    
    # Assemble sections in order
    report_sections = [
        f"# {title}\n",
        f"## User Prompt\n{prompt}\n",
        f"## Abstract\n{section_results.get('abstract', '')}\n",
        f"## Introduction\n{section_results.get('introduction', '')}\n", 
        f"## Background/Literature Review\n{section_results.get('background', '')}\n",
        f"## Methodology\n{section_results.get('methodology', '')}\n",
        f"## Key Findings/Results\n{section_results.get('findings', '')}\n",
        f"## Discussion\n{section_results.get('discussion', '')}\n",
        f"## Conclusion\n{section_results.get('conclusion', '')}\n",
        f"## References\n{extract_references_from_research(research_data)}\n"
    ]
    
    return "\n".join(report_sections)

def extract_research_from_prompt(prompt: str) -> str:
    """Extract research data from the prompt context"""
    # Look for research results in the prompt
    if "Research Results" in prompt:
        return prompt
    return prompt

def extract_title_from_research(research_data: str, prompt: str) -> str:
    """Extract or generate a title from research data"""
    # Try to extract title from research data
    lines = research_data.split('\n')
    for line in lines:
        if line.strip().startswith('#') and len(line.strip()) > 1:
            return line.strip()[1:].strip()
    
    # Fallback: generate title from prompt
    return prompt.split('\n')[0].strip()[:100]

def extract_references_from_research(research_data: str) -> str:
    """Extract references from research data"""
    # Look for URLs and sources in research data
    import re
    urls = re.findall(r'https?://[^\s<>"]+', research_data)
    references = []
    
    for i, url in enumerate(urls[:10], 1):  # Limit to 10 references
        references.append(f"[{i}] {url}")
    
    return '\n'.join(references) if references else "References will be added based on research findings."

def extract_original_prompt_from_context(prompt: str) -> str:
    """Extract the original user prompt from the enriched context"""
    # Look for the original prompt in the context
    lines = prompt.split('\n')
    for line in lines:
        if line.strip().startswith('USER RESEARCH REQUEST:') or line.strip().startswith('User Prompt:'):
            # Find the next non-empty line which should be the actual prompt
            for i, next_line in enumerate(lines[lines.index(line) + 1:], lines.index(line) + 1):
                if next_line.strip():
                    return next_line.strip()
    
    # If not found in structured format, try to extract from the beginning
    # Remove common prefixes and get the first meaningful line
    for line in lines:
        line = line.strip()
        if line and not line.startswith(('You are', '##', '**', 'Today is', 'USER RESEARCH REQUEST:', 'User Prompt:')):
            return line
    
    # Fallback: return the first 100 characters of the prompt
    return prompt.strip()[:100] + ('...' if len(prompt.strip()) > 100 else '')

# === Analysis Agent ===
def analysis_agent(
    prompt: str,
    model: str = "azure:gpt-4",
    max_completion_tokens: int = 4000,
) -> tuple[str, list]:
    """
    Analysis agent for intermediate steps - analyzes, synthesizes, or organizes research findings
    without generating a full report structure.
    """
    print("==================================")
    print("Analysis Agent")
    print("==================================")

    system_message = """
You are an expert research analyst specializing in synthesizing and organizing research findings. Your task is to analyze, synthesize, or organize research materials for specific analytical purposes.

## YOUR ROLE:
- Analyze research findings and identify key patterns, themes, or insights
- Synthesize information from multiple sources into coherent analytical frameworks
- Organize research materials by relevance, authority, or thematic categories
- Extract and structure key information for further processing
- Provide focused analysis without generating full report structures

## ANALYSIS GUIDELINES:
- Focus on the specific analytical task requested
- Identify key themes, patterns, and relationships in the research
- Synthesize findings from multiple sources
- Organize information logically and clearly
- Highlight important insights and connections
- Maintain objectivity and evidence-based analysis

## OUTPUT FORMAT:
- Provide clear, structured analysis
- Use bullet points, numbered lists, or clear sections as appropriate
- Include relevant citations and source references
- Focus on analysis rather than full report generation
- Keep output concise but comprehensive for the specific task

Do not generate full report structures (Title, Abstract, Introduction, etc.). Focus only on the specific analytical task requested.
""".strip()

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": prompt},
    ]

    try:
        resp = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT", "sbd-o3-mini-0131"),
            messages=messages,
            max_completion_tokens=max_completion_tokens,
        )

        content = resp.choices[0].message.content or ""
        print("SUCCESS Output:\n", content)
        return content, messages

    except Exception as e:
        print("ERROR:", e)
        return f"[Analysis Error: {str(e)}]", messages
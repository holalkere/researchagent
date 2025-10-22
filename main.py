# -*- coding: utf-8 -*-
import os
import uuid
import json
import threading
from datetime import datetime
from typing import Optional, Literal
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Text, DateTime, String
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

from src.planning_agent import planner_agent, executor_agent_step
from src.cosmos_db import get_cosmos_service, CosmosDBService

import html, textwrap
import markdown
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from io import BytesIO

# === Load env vars ===
load_dotenv()

# API keys are loaded from .env file via load_dotenv() above

# Database configuration
USE_COSMOS_DB = os.getenv("USE_COSMOS_DB", "true").lower() == "true"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./research_agent.db")

# Initialize database service
db_service = None
if USE_COSMOS_DB:
    try:
        db_service = get_cosmos_service()
        print("Using Cosmos DB for data storage")
    except Exception as e:
        print(f"Failed to initialize Cosmos DB: {e}")
        print("Falling back to SQLite")
        USE_COSMOS_DB = False

# SQLite database configuration (fallback)
if not USE_COSMOS_DB:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL not set")
    
    Base = declarative_base()
    engine = create_engine(DATABASE_URL, echo=False, future=True)
    SessionLocal = sessionmaker(bind=engine)


# SQLite Task model (for fallback)
if not USE_COSMOS_DB:
    class Task(Base):
        __tablename__ = "tasks"
        id = Column(String, primary_key=True, index=True)
        prompt = Column(Text)
        status = Column(String)
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow)
        result = Column(Text)

    # Initialize SQLite database
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception as e:
        print(f"ERROR: DB drop failed: {e}")

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"ERROR: DB creation failed: {e}")

# === FastAPI ===
app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

task_progress = {}


class PromptRequest(BaseModel):
    prompt: str
    advanced_options: dict = None
    session_id: str = None


@app.get("/", response_class=HTMLResponse)
def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api", response_class=JSONResponse)
def health_check(request: Request):
    return {"status": "ok"}


@app.post("/generate_report")
def generate_report(req: PromptRequest):
    task_id = str(uuid.uuid4())
    
    # Create task in database
    if USE_COSMOS_DB and db_service:
        try:
            db_service.create_task(task_id=task_id, prompt=req.prompt, status="running")
        except Exception as e:
            print(f"Error creating task in Cosmos DB: {e}")
            return {"error": "Failed to create task"}
    else:
        # Fallback to SQLite
        db = SessionLocal()
        db.add(Task(id=task_id, prompt=req.prompt, status="running"))
        db.commit()
        db.close()

    task_progress[task_id] = {"steps": []}
    initial_plan_steps = planner_agent(req.prompt)
    for step_title in initial_plan_steps:
        task_progress[task_id]["steps"].append(
            {
                "title": step_title,
                "status": "pending",
                "description": "Awaiting execution",
                "substeps": [],
            }
        )

    # Get session_id from request if available
    session_id = getattr(req, 'session_id', None)

    thread = threading.Thread(
        target=run_agent_workflow, args=(task_id, req.prompt, initial_plan_steps, req.advanced_options, session_id)
    )
    thread.start()
    return {"task_id": task_id}


@app.get("/task_progress/{task_id}")
def get_task_progress(task_id: str):
    return task_progress.get(task_id, {"steps": []})


@app.get("/task_status/{task_id}")
def get_task_status(task_id: str):
    if USE_COSMOS_DB and db_service:
        try:
            task = db_service.get_task(task_id)
            if not task:
                raise HTTPException(status_code=404, detail="Task not found")
            return {
                "status": task.get("status"),
                "result": json.loads(task.get("result")) if task.get("result") else None,
            }
        except Exception as e:
            print(f"Error getting task from Cosmos DB: {e}")
            raise HTTPException(status_code=500, detail="Database error")
    else:
        # Fallback to SQLite
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        db.close()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return {
            "status": task.status,
            "result": json.loads(task.result) if task.result else None,
        }


# === Chat History Endpoints ===

@app.post("/chat/session")
def create_chat_session(req: PromptRequest):
    """Create a new chat session"""
    if not USE_COSMOS_DB or not db_service:
        raise HTTPException(status_code=503, detail="Chat history not available - using SQLite mode")
    
    try:
        session_id = db_service.create_chat_session(user_prompt=req.prompt)
        return {"session_id": session_id}
    except Exception as e:
        print(f"Error creating chat session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create chat session")


@app.get("/chat/session/{session_id}")
def get_chat_session(session_id: str):
    """Get a chat session and its messages"""
    if not USE_COSMOS_DB or not db_service:
        raise HTTPException(status_code=503, detail="Chat history not available - using SQLite mode")
    
    try:
        session = db_service.get_chat_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        messages = db_service.get_chat_messages(session_id)
        return {
            "session": session,
            "messages": messages
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting chat session: {e}")
        raise HTTPException(status_code=500, detail="Failed to get chat session")


@app.get("/chat/sessions")
def get_all_chat_sessions():
    """Get all chat sessions"""
    if not USE_COSMOS_DB or not db_service:
        raise HTTPException(status_code=503, detail="Chat history not available - using SQLite mode")
    
    try:
        sessions = db_service.get_all_sessions()
        return {"sessions": sessions}
    except Exception as e:
        print(f"Error getting chat sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get chat sessions")


class MessageRequest(BaseModel):
    message_type: str
    content: str

@app.post("/chat/session/{session_id}/message")
def add_chat_message(session_id: str, req: MessageRequest):
    """Add a message to a chat session"""
    if not USE_COSMOS_DB or not db_service:
        raise HTTPException(status_code=503, detail="Chat history not available - using SQLite mode")
    
    try:
        message_id = db_service.add_message(session_id, req.message_type, req.content)
        return {"message_id": message_id}
    except Exception as e:
        print(f"Error adding message: {e}")
        raise HTTPException(status_code=500, detail="Failed to add message")




def format_history(history):
    return "\n\n".join(
        f"- {title}\n{desc}\n\nOutput:\n{output}" for title, desc, output in history
    )

def format_history_html(history):
    """Format history for HTML display, preserving HTML content from research agent"""
    if not history:
        return "<p style='color:#666; font-style:italic;'>No previous steps</p>"
    
    formatted = []
    for title, desc, output in history:
        # Check if output contains HTML (from research agent)
        if '<h2' in output or '<h3' in output or 'Research Results' in output:
            # This is HTML content from research agent, display it directly
            formatted.append(f"""
            <div style='margin-bottom:15px; border-left:3px solid #16a34a; padding-left:10px;'>
                <strong style='color:#16a34a;'>{title}</strong><br>
                <small style='color:#000000;'>{desc}</small><br><br>
                <div style='background:white; padding:10px; border-radius:5px; border:1px solid #e5e7eb; color:#000000;'>
                    {output}
                </div>
            </div>
            """)
        else:
            # Regular text content, escape and format
            escaped_output = html.escape(str(output))
            formatted.append(f"""
            <div style='margin-bottom:15px; border-left:3px solid #16a34a; padding-left:10px;'>
                <strong style='color:#16a34a;'>{title}</strong><br>
                <small style='color:#000000;'>{desc}</small><br><br>
                <div style='background:white; padding:10px; border-radius:5px; border:1px solid #e5e7eb; white-space:pre-wrap; font-family:monospace; font-size:0.9em; color:#000000;'>
                    {escaped_output}
                </div>
            </div>
            """)
    
    return "".join(formatted)


def run_agent_workflow(task_id: str, prompt: str, initial_plan_steps: list, advanced_options: dict = None, session_id: str = None):
    # Store session_id for later use
    run_agent_workflow.current_session_id = session_id
    
    steps_data = task_progress[task_id]["steps"]
    execution_history = []

    def update_step_status(index, status, description="", substep=None):
        if index < len(steps_data):
            steps_data[index]["status"] = status
            if description:
                steps_data[index]["description"] = description
            if substep:
                steps_data[index]["substeps"].append(substep)
            steps_data[index]["updated_at"] = datetime.utcnow().isoformat()

    try:
        for i, plan_step_title in enumerate(initial_plan_steps):
            update_step_status(i, "running", f"Executing: {plan_step_title}")

            actual_step_description, agent_name, output = executor_agent_step(
                plan_step_title, execution_history, prompt, advanced_options
            )

            execution_history.append([plan_step_title, actual_step_description, output])

            def esc(s: str) -> str:
                return html.escape(s or "")

            def nl2br(s: str) -> str:
                return esc(s).replace("\n", "<br>")

            # ...
            update_step_status(
                i,
                "done",
                f"Completed: {plan_step_title}",
                {
                    "title": f"Called {agent_name}",
                    "content": f"""
<div style='border:1px solid #ccc; border-radius:8px; padding:10px; margin:8px 0; background:#fff; color:#000000;'>
  <div style='font-weight:bold; color:#2563eb;'>User Prompt</div>
  <div style='white-space:pre-wrap; color:#000000;'>{prompt}</div>

  <div style='font-weight:bold; color:#16a34a; margin-top:8px;'>Previous Step</div>
  <div style='background:#f9fafb; padding:10px; border-radius:6px; margin:0; max-height:300px; overflow-y:auto; color:#000000;'>
{format_history_html(execution_history[-2:-1])}
  </div>

  <div style='font-weight:bold; color:#2563eb; margin-top:8px;'>Your next task</div>
  <div style='white-space:pre-wrap; color:#000000;'>{actual_step_description}</div>

  <div style='font-weight:bold; color:#10b981; margin-top:8px;'>Output</div>
  <!-- NO <pre> HERE -->
  <div style='white-space:pre-wrap; color:#000000;'>
{output}
  </div>
</div>
""".strip(),
                },
            )

        final_report_markdown = (
            execution_history[-1][-1] if execution_history else "No report generated."
        )

        result = {"html_report": final_report_markdown, "history": steps_data}

        # Update task in database
        if USE_COSMOS_DB and db_service:
            try:
                db_service.update_task(task_id=task_id, status="done", result=json.dumps(result))
                
                # Save final report to chat session if session exists
                if hasattr(run_agent_workflow, 'current_session_id') and run_agent_workflow.current_session_id:
                    try:
                        db_service.add_message(
                            session_id=run_agent_workflow.current_session_id,
                            message_type="assistant",
                            content=final_report_markdown,
                            metadata={
                                "task_id": task_id,
                                "report_type": "final_research_report",
                                "workflow_completed": True
                            }
                        )
                        print(f"Final report saved to chat session: {run_agent_workflow.current_session_id}")
                    except Exception as e:
                        print(f"Error saving final report to chat session: {e}")
                        
            except Exception as e:
                print(f"Error updating task in Cosmos DB: {e}")
        else:
            # Fallback to SQLite
            db = SessionLocal()
            task = db.query(Task).filter(Task.id == task_id).first()
            task.status = "done"
            task.result = json.dumps(result)
            task.updated_at = datetime.utcnow()
            db.commit()
            db.close()

    except Exception as e:
        print(f"Workflow error for task {task_id}: {e}")
        if steps_data:
            error_step_index = next(
                (i for i, s in enumerate(steps_data) if s["status"] == "running"),
                len(steps_data) - 1,
            )
            if error_step_index >= 0:
                update_step_status(
                    error_step_index,
                    "error",
                    f"Error during execution: {e}",
                    {"title": "Error", "content": str(e)},
                )

        # Update task status to error
        if USE_COSMOS_DB and db_service:
            try:
                db_service.update_task(task_id=task_id, status="error")
            except Exception as e:
                print(f"Error updating task status in Cosmos DB: {e}")
        else:
            # Fallback to SQLite
            db = SessionLocal()
            task = db.query(Task).filter(Task.id == task_id).first()
            task.status = "error"
            task.updated_at = datetime.utcnow()
            db.commit()
            db.close()


@app.post("/generate_pdf")
def generate_pdf(request: dict):
    """Generate PDF from markdown content"""
    try:
        print("=== PDF Generation Started ===")
        markdown_content = request.get("content", "")
        pdf_type = request.get("type", "report")  # "report"
        original_prompt = request.get("original_prompt", "")
        
        print(f"PDF Generation Debug - Type: {pdf_type}, Content length: {len(markdown_content)}, Prompt length: {len(original_prompt)}")
        
        if not markdown_content:
            raise HTTPException(status_code=400, detail="No content provided")
        
        # Limit content size to prevent memory issues
        if len(markdown_content) > 1000000:  # 1MB limit
            raise HTTPException(status_code=400, detail="Content too large for PDF generation")
        
        # For "report" type, extract content from Abstract onwards
        if pdf_type == "report":
            # Extract content from Abstract to References (same logic as client-side)
            lines = markdown_content.split('\n')
            start_index = -1
            end_index = -1
            
            for i, line in enumerate(lines):
                if line.strip().lower().startswith('## abstract'):
                    start_index = i
                    break
            
            for i in range(len(lines) - 1, -1, -1):
                if lines[i].strip().lower().startswith('## references'):
                    for j in range(i + 1, len(lines)):
                        if lines[j].strip().startswith('##') and lines[j].strip() != '## References':
                            end_index = j
                            break
                    if end_index == -1:
                        end_index = len(lines)
                    break
            
            if start_index != -1 and end_index != -1:
                markdown_content = '\n'.join(lines[start_index:end_index])
        
        # Convert markdown to HTML first
        html_content = markdown.markdown(markdown_content)
        
        # Create PDF using ReportLab
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        
        # Get styles
        styles = getSampleStyleSheet()
        
        # Create custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1,  # Center alignment
            textColor=colors.darkblue
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            spaceBefore=12,
            textColor=colors.darkblue
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            leading=12
        )
        
        # Build the story
        story = []
        
        # Create header with logo and title side by side
        try:
            logo_path = "static/beacon-research-agent-logo.png"
            if os.path.exists(logo_path):
                print(f"Logo file found at: {logo_path}")
                # Load logo and get its natural dimensions to maintain aspect ratio
                logo = Image(logo_path)
                print(f"Logo loaded successfully. Original dimensions: {logo.imageWidth}x{logo.imageHeight}")
                # Scale logo to reasonable size while maintaining aspect ratio
                # Set max height to 1 inch, width will scale proportionally
                logo.drawHeight = 1*inch
                logo.drawWidth = logo.drawHeight * (logo.imageWidth / logo.imageHeight)
                print(f"Logo scaled to: {logo.drawWidth}x{logo.drawHeight}")
                
                # Create a table with logo on left and title on right
                header_data = [
                    [logo, Paragraph("Research Report", title_style)]
                ]
                header_table = Table(header_data, colWidths=[2.5*inch, 4*inch])
                header_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('LEFTPADDING', (0, 0), (0, 0), 0),
                    ('RIGHTPADDING', (0, 0), (0, 0), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                ]))
                story.append(header_table)
                print("Header table created successfully")
            else:
                print(f"Logo file not found at: {logo_path}")
                # If no logo, just add title
                story.append(Paragraph("Research Report", title_style))
        except Exception as e:
            print(f"Error adding logo to PDF: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to just title if logo fails
            story.append(Paragraph("Research Report", title_style))
        
        story.append(Spacer(1, 20))
        
        # Add date
        story.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", body_style))
        story.append(Spacer(1, 20))
        
        # Add original prompt if provided (clean, single display)
        if original_prompt:
            # Clean up the prompt text to remove any "User Prompt:" prefixes
            clean_prompt = original_prompt
            if clean_prompt.lower().startswith('user prompt:'):
                clean_prompt = clean_prompt[12:].strip()  # Remove "User Prompt:" prefix
            # Sanitize the prompt text to avoid PDF generation issues
            sanitized_prompt = html.escape(clean_prompt) if clean_prompt else ""
            story.append(Paragraph(sanitized_prompt, body_style))
            story.append(Spacer(1, 20))
        
        # Process the markdown content directly (better than HTML conversion)
        lines = markdown_content.split('\n')
        skip_user_prompt_section = False
        
        for line in lines:
            line = line.strip()
            if not line:
                story.append(Spacer(1, 6))
                continue
            
            # Skip User Prompt sections to avoid repetition
            line_lower = line.lower().strip()
            if (line_lower.startswith('## user prompt') or 
                line_lower.startswith('# user prompt') or
                line_lower.startswith('user prompt:') or
                line_lower == 'user prompt' or
                'user prompt:' in line_lower or
                line_lower.startswith('user prompt')):
                skip_user_prompt_section = True
                continue
            elif line.startswith('##') and not any(phrase in line_lower for phrase in ['user prompt', 'user prompt:']):
                skip_user_prompt_section = False
            elif line.startswith('#') and not any(phrase in line_lower for phrase in ['user prompt', 'user prompt:']):
                skip_user_prompt_section = False
            
            if skip_user_prompt_section:
                continue
                
            # Clean up any remaining "User Prompt:" prefixes in content
            if line_lower.startswith('user prompt:'):
                line = line[12:].strip()  # Remove "User Prompt:" prefix
                if not line:  # If line becomes empty, skip it
                    continue
                
            # Handle markdown headers
            if line.startswith('# '):
                text = line.replace('# ', '')
                story.append(Paragraph(text, title_style))
            elif line.startswith('## '):
                text = line.replace('## ', '')
                story.append(Paragraph(text, heading_style))
            elif line.startswith('### '):
                text = line.replace('### ', '')
                story.append(Paragraph(text, heading_style))
            elif line.startswith('#### '):
                text = line.replace('#### ', '')
                story.append(Paragraph(text, heading_style))
            elif line.startswith('##### ') or line.startswith('###### '):
                text = line.replace('##### ', '').replace('###### ', '')
                story.append(Paragraph(text, heading_style))
            elif line.startswith('- ') or line.startswith('* '):
                text = line.replace('- ', '• ').replace('* ', '• ')
                text = html.unescape(text)
                story.append(Paragraph(text, body_style))
            elif line.startswith('1. ') or line.startswith('2. ') or line.startswith('3. '):
                text = line
                text = html.unescape(text)
                story.append(Paragraph(text, body_style))
            else:
                # Regular text
                if line:
                    text = html.unescape(line)
                    story.append(Paragraph(text, body_style))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF content
        buffer.seek(0)
        pdf_content = buffer.getvalue()
        buffer.close()
        
        # Return PDF as response with proper headers
        timestamp = datetime.now().strftime("%Y-%m-%d")
        filename = f"Research_Report_{timestamp}.pdf"
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"",
                "Content-Type": "application/pdf",
                "Cache-Control": "no-cache"
            }
        )
        
    except Exception as e:
        print(f"Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
        # Return more detailed error information for debugging
        error_detail = f"Error generating PDF: {str(e)}"
        if hasattr(e, '__traceback__'):
            error_detail += f"\nTraceback: {traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)

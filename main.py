# -*- coding: utf-8 -*-
import os
import uuid
import json
import threading
from datetime import datetime
from typing import Optional, Literal
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Text, DateTime, String
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

from src.planning_agent import planner_agent, executor_agent_step

import html, textwrap

# === Load env vars ===
# Clear any existing environment variables that might override .env
os.environ.pop('AZURE_OPENAI_KEY', None)
os.environ.pop('AZURE_OPENAI_ENDPOINT', None)
os.environ.pop('AZURE_OPENAI_DEPLOYMENT', None)
os.environ.pop('AZURE_OPENAI_API_VERSION', None)
os.environ.pop('TAVILY_API_KEY', None)
load_dotenv()

# API keys are loaded from .env file via load_dotenv() above

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./research_agent.db")

# SQLite database configuration

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set")


# === DB setup ===
Base = declarative_base()
engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine)


class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, index=True)
    prompt = Column(Text)
    status = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    result = Column(Text)
    # New fields for chat history
    title = Column(String)  # Auto-generated title from prompt
    final_report = Column(Text)  # Store the final markdown report separately


try:
    Base.metadata.drop_all(bind=engine)
except Exception as e:
    print(f"\u274c DB creation failed: {e}")

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"\u274c DB creation failed: {e}")

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


@app.get("/", response_class=HTMLResponse)
def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api", response_class=JSONResponse)
def health_check(request: Request):
    return {"status": "ok"}


@app.post("/generate_report")
def generate_report(req: PromptRequest):
    task_id = str(uuid.uuid4())
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

    thread = threading.Thread(
        target=run_agent_workflow, args=(task_id, req.prompt, initial_plan_steps)
    )
    thread.start()
    return {"task_id": task_id}


@app.get("/task_progress/{task_id}")
def get_task_progress(task_id: str):
    return task_progress.get(task_id, {"steps": []})


@app.get("/task_status/{task_id}")
def get_task_status(task_id: str):
    db = SessionLocal()
    task = db.query(Task).filter(Task.id == task_id).first()
    db.close()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "status": task.status,
        "result": json.loads(task.result) if task.result else None,
    }


@app.get("/chat_history")
def get_chat_history():
    """Get all completed tasks for chat history"""
    db = SessionLocal()
    tasks = db.query(Task).filter(Task.status == "done").order_by(Task.created_at.desc()).all()
    db.close()
    
    history = []
    for task in tasks:
        # Generate title from prompt if not set
        title = task.title or generate_title_from_prompt(task.prompt)
        
        history.append({
            "id": task.id,
            "title": title,
            "prompt": task.prompt,
            "created_at": task.created_at.isoformat(),
            "has_report": bool(task.final_report)
        })
    
    return {"history": history}


@app.get("/chat_history/{task_id}")
def get_chat_history_item(task_id: str):
    """Get specific chat history item with full report"""
    db = SessionLocal()
    task = db.query(Task).filter(Task.id == task_id).first()
    db.close()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    title = task.title or generate_title_from_prompt(task.prompt)
    
    return {
        "id": task.id,
        "title": title,
        "prompt": task.prompt,
        "created_at": task.created_at.isoformat(),
        "final_report": task.final_report,
        "status": task.status
    }


def generate_title_from_prompt(prompt: str) -> str:
    """Generate a short title from the prompt"""
    if not prompt:
        return "Untitled Research"
    
    # Take first 50 characters and clean up
    title = prompt.strip()[:50]
    if len(prompt) > 50:
        title += "..."
    
    # Remove newlines and extra spaces
    title = " ".join(title.split())
    
    return title or "Untitled Research"


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


def run_agent_workflow(task_id: str, prompt: str, initial_plan_steps: list):
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
                plan_step_title, execution_history, prompt
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

  <div style='font-weight:bold; color:#f59e0b; margin-top:8px;'>Your next task</div>
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

        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        task.status = "done"
        task.result = json.dumps(result)
        task.final_report = final_report_markdown  # Store final report separately
        task.title = generate_title_from_prompt(prompt)  # Generate and store title
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

        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        task.status = "error"
        task.updated_at = datetime.utcnow()
        db.commit()
        db.close()

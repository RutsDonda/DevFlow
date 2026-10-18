"""
app/agents/tools/architect_tools.py – Tools for the Project Architect agent.
"""

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.agents.tools.context import thread_id_from, user_id_from
from app.agents.tools.rag_tools import read_document
from app.models.schemas import ProjectFile
from app.services import projects as project_service


@tool
async def save_project(
    project_name: str,
    description: str,
    tech_stack: list[str],
    files: list[ProjectFile],
    setup_instructions: str,
    config: RunnableConfig,
) -> str:
    """Save a generated project (all of its files) to the user's workspace so they can browse and download it.
    Calling it again with the same project_name updates that project: given files are added or overwritten.

    Args:
        project_name: Short human-readable project name, e.g. "Task Tracker API".
        description: One or two sentences describing the project.
        tech_stack: Technologies used, e.g. ["FastAPI", "MongoDB", "React"].
        files: Every file to create, each with a relative path and its COMPLETE content.
        setup_instructions: Markdown, step-by-step instructions to install and run the project.
    """
    try:
        project = await project_service.save_project(
            user_id=user_id_from(config),
            thread_id=thread_id_from(config),
            name=project_name,
            description=description,
            tech_stack=tech_stack,
            files=[f.model_dump() if isinstance(f, ProjectFile) else dict(f) for f in files],
            setup_instructions=setup_instructions,
        )
    except ValueError as exc:
        return f"ERROR: {exc}. Provide files with relative paths and full contents."
    return (
        f"Saved project '{project['name']}' (id {project['_id']}) with {len(project['files'])} files. "
        "The user can open it from the Projects page and download it as a ZIP."
    )


@tool
async def list_my_projects(config: RunnableConfig) -> str:
    """List projects previously generated for this user (name, stack, number of files)."""
    items = await project_service.list_projects(user_id_from(config))
    if not items:
        return "The user has no generated projects yet."
    return "\n".join(
        f"- {p['name']} [{', '.join(p['tech_stack'])}] – {p['file_count']} files, updated {p['updated_at']:%Y-%m-%d}"
        for p in items[:30]
    )


ARCHITECT_TOOLS = [save_project, list_my_projects, read_document]

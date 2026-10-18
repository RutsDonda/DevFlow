"""
app/agents/tools/coding_tools.py – Static-analysis tools for the Coding & Debugging agent.

All tools are pure and side-effect free: code is parsed and analysed, never executed.
"""

import ast
import io
import re

from langchain_core.tools import tool
from pyflakes.api import check as pyflakes_check
from pyflakes.reporter import Reporter

from app.agents.tools.rag_tools import read_document

MAX_CODE_CHARS = 100_000

_BRANCH_NODES = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.Try, ast.With, ast.AsyncWith,
                 ast.BoolOp, ast.IfExp, ast.comprehension, ast.Match)


@tool
def analyze_python_code(code: str) -> str:
    """Check Python code for syntax errors and common bugs (undefined names, unused imports/variables,
    redefinitions, f-strings without placeholders, comparisons to literals with `is` …).

    Args:
        code: The Python source code to analyse.
    """
    code = code[:MAX_CODE_CHARS]
    try:
        ast.parse(code)
    except SyntaxError as exc:
        pointer = ""
        if exc.text:
            pointer = f"\n    {exc.text.rstrip()}\n    {' ' * max((exc.offset or 1) - 1, 0)}^"
        return f"SYNTAX ERROR at line {exc.lineno}, column {exc.offset}: {exc.msg}{pointer}"

    warnings, errors = io.StringIO(), io.StringIO()
    count = pyflakes_check(code, "snippet.py", Reporter(warnings, errors))
    findings = [line.replace("snippet.py:", "line ") for line in warnings.getvalue().splitlines()]
    findings += errors.getvalue().splitlines()
    if not count and not findings:
        return "No syntax errors or static-analysis warnings found. Review the logic manually for runtime bugs."
    return f"{len(findings)} issue(s) found:\n" + "\n".join(f"- {f}" for f in findings)


def _complexity(node: ast.AST) -> int:
    return 1 + sum(isinstance(n, _BRANCH_NODES) for n in ast.walk(node))


@tool
def inspect_code_structure(code: str, language: str = "python") -> str:
    """Summarise the structure of a code snippet: functions, classes, imports, size and complexity hot-spots.

    Args:
        code: The source code.
        language: Programming language of the code, e.g. "python", "javascript", "java".
    """
    code = code[:MAX_CODE_CHARS]
    lines = code.splitlines()
    summary = [f"Lines: {len(lines)} ({sum(1 for line in lines if line.strip())} non-blank)"]

    if language.lower() in ("python", "py"):
        try:
            tree = ast.parse(code)
        except SyntaxError as exc:
            return "\n".join(summary + [f"Cannot parse: syntax error at line {exc.lineno}: {exc.msg}"])

        imports = sorted({
            alias.name if isinstance(n, ast.Import) else f"{n.module or ''}.{alias.name}".lstrip(".")
            for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom))
            for alias in n.names
        })
        if imports:
            summary.append("Imports: " + ", ".join(imports))
        for n in ast.walk(tree):
            if isinstance(n, ast.ClassDef):
                methods = [m.name for m in n.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))]
                summary.append(f"class {n.name} (lines {n.lineno}-{n.end_lineno}) methods: {', '.join(methods) or '-'}")
            elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                cx = _complexity(n)
                flag = "  ⚠ high complexity" if cx > 10 else ""
                args = ", ".join(a.arg for a in n.args.args)
                summary.append(f"def {n.name}({args}) lines {n.lineno}-{n.end_lineno}, cyclomatic≈{cx}{flag}")
        return "\n".join(summary)

    # Heuristic outline for other languages
    patterns = [
        r"^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)",
        r"^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?[^=]*\)?\s*=>",
        r"^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)",
        r"^\s*(?:public|private|protected|static|\s)+[\w<>\[\],\s]+\s+(\w+)\s*\([^;]*\)\s*\{?\s*$",
        r"^\s*func\s+(?:\([^)]*\)\s*)?(\w+)",
        r"^\s*(?:pub\s+)?fn\s+(\w+)",
        r"^\s*def\s+(\w+)",
    ]
    for i, line in enumerate(lines, 1):
        for p in patterns:
            m = re.match(p, line)
            if m:
                summary.append(f"line {i}: {m.group(1)}")
                break
    depth = max((len(line) - len(line.lstrip())) for line in lines) if lines else 0
    summary.append(f"Max indentation depth: {depth} spaces")
    return "\n".join(summary)


@tool
def number_code_lines(code: str) -> str:
    """Return the code with line numbers prefixed, for precise line-by-line explanations.

    Args:
        code: The source code to number.
    """
    lines = code[:MAX_CODE_CHARS].splitlines()
    width = len(str(len(lines)))
    return "\n".join(f"{i:>{width}} | {line}" for i, line in enumerate(lines, 1))


CODING_TOOLS = [analyze_python_code, inspect_code_structure, number_code_lines, read_document]

import {
  HiOutlineCommandLine,
  HiOutlineCpuChip,
  HiOutlineCubeTransparent,
  HiOutlineDocumentMagnifyingGlass,
  HiOutlineFilm,
  HiOutlineSparkles,
} from 'react-icons/hi2';

/**
 * Display metadata for the supervisor and its four worker agents.
 * Keys match the agent names used by the backend LangGraph (app/agents/graph.py).
 */
export const AGENTS = {
  supervisor: {
    id: 'supervisor',
    name: 'Supervisor',
    icon: HiOutlineCpuChip,
    text: 'text-neutral-300',
  },
  rag_agent: {
    id: 'rag_agent',
    name: 'Document agent',
    icon: HiOutlineDocumentMagnifyingGlass,
    text: 'text-amber-200/90',
  },
  coding_agent: {
    id: 'coding_agent',
    name: 'Coding agent',
    icon: HiOutlineCommandLine,
    text: 'text-emerald-200/90',
  },
  architect_agent: {
    id: 'architect_agent',
    name: 'Architect agent',
    icon: HiOutlineCubeTransparent,
    text: 'text-sky-200/90',
  },
  video_agent: {
    id: 'video_agent',
    name: 'Video agent',
    icon: HiOutlineFilm,
    text: 'text-rose-200/90',
  },
};

/**
 * Modes shown in the picker above the message box. `agent: null` = Auto
 * (the supervisor decides); otherwise the message goes straight to that agent.
 */
export const MODES = [
  {
    id: 'auto',
    agent: null,
    label: 'Auto',
    icon: HiOutlineSparkles,
    text: 'text-neutral-200',
    hint: 'The supervisor picks the right agent for each message',
    placeholder: 'Ask anything',
    examples: [
      'Explain the difference between a process and a thread',
      'What are the key points in my uploaded documents?',
      'Find the bug in a function that averages a list',
      'Scaffold a todo app with React and FastAPI',
    ],
  },
  {
    id: 'rag_agent',
    agent: 'rag_agent',
    label: 'Documents',
    icon: HiOutlineDocumentMagnifyingGlass,
    text: 'text-amber-200/90',
    hint: 'Answers only from your uploaded PDF, Word and text files',
    placeholder: 'Ask about your documents',
    examples: [
      'Summarise the key points of my documents',
      'What deadlines or dates are mentioned?',
      'Explain the main concept in simple terms',
      'List every requirement in the spec',
    ],
  },
  {
    id: 'coding_agent',
    agent: 'coding_agent',
    label: 'Code',
    icon: HiOutlineCommandLine,
    text: 'text-emerald-200/90',
    hint: 'Finds bugs, explains code line by line and writes optimised fixes',
    placeholder: 'Paste code or describe what to build',
    examples: [
      'Find the bug:\n```python\ndef avg(nums):\n    return sum(nums) / len(num)\n```',
      'Explain this line by line:\n```js\nconst unique = [...new Set(arr)].sort((a, b) => a - b);\n```',
      'Write an efficient function to merge overlapping intervals',
      'Refactor a callback-based Node.js function to async/await',
    ],
  },
  {
    id: 'architect_agent',
    agent: 'architect_agent',
    label: 'Architect',
    icon: HiOutlineCubeTransparent,
    text: 'text-sky-200/90',
    hint: 'Turns an idea into a project with structure, boilerplate and setup steps',
    placeholder: 'Describe the project you want to build',
    examples: [
      'A FastAPI + MongoDB REST API for a book library',
      'A React + Vite expense tracker with local storage',
      'A Node.js Express URL shortener with tests',
      'A Flask weather dashboard using a public API',
    ],
  },
  {
    id: 'video_agent',
    agent: 'video_agent',
    label: 'Video',
    icon: HiOutlineFilm,
    text: 'text-rose-200/90',
    hint: 'Turns a PDF, Word or text file into a narrated explainer video',
    placeholder: 'Attach a document and describe the video you want',
    examples: [
      'Turn my attached PDF into a 2-minute explainer video',
      'Make a short video summary of my latest document',
      'Create a narrated lesson video from my notes, with a male voice',
      'Make a 5-scene presentation video on how HTTPS works',
    ],
  },
];

export const modeFor = (agent) => MODES.find((m) => m.agent === (agent || null)) || MODES[0];

export const TOOL_LABELS = {
  search_documents: 'Searching your documents',
  list_my_documents: 'Listing your documents',
  read_document: 'Reading the attached file',
  analyze_python_code: 'Running static analysis',
  inspect_code_structure: 'Inspecting code structure',
  number_code_lines: 'Reading the code line by line',
  save_project: 'Writing project files',
  list_my_projects: 'Looking up your projects',
  create_video: 'Rendering your video – slides, voice-over and MP4',
};

export const agentMeta = (id) => AGENTS[id] || AGENTS.supervisor;

const PROJECT_MEMORY_CONTEXT_MAX_CHARS = 4000;

type ProjectMemoryRow = {
  name?: string | null;
  memory?: string | null;
};

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

export function formatProjectMemoryContext(project: ProjectMemoryRow | null | undefined): string | null {
  const memory = project?.memory?.trim();
  if (!memory) return null;

  const name = project?.name?.trim() || "Current project";
  return [
    "## Project memory (durable instructions for this chat's project - highest priority after safety)",
    `Project: ${truncate(name, 120)}`,
    "Always honor these saved project facts, preferences, goals, and constraints unless the user explicitly changes them.",
    truncate(memory.replace(/\r\n?/g, "\n"), PROJECT_MEMORY_CONTEXT_MAX_CHARS),
  ].join("\n");
}

export type TaskType = "code-generation" | "bug-fix" | "design" | "refactor" | "explanation" | "multi-file" | "general";
export type Complexity = "trivial" | "simple" | "moderate" | "complex";
export type AgentType = "coder" | "reviewer" | "designer" | "coordinator";

export interface TaskClassification {
  taskType: TaskType;
  complexity: Complexity;
  requiresSwarm: boolean;
  suggestedAgentTypes: AgentType[];
  hasAttachments: boolean;
  estimatedFileCount: number;
}

const DESIGN_KEYWORDS = [
  "css", "style", "layout", "color", "font", "theme", "dark mode", "responsive",
  "animation", "hover", "ui", "ux", "design", "gradient", "shadow", "spacing",
  "tailwind", "mobile", "tablet", "desktop",
];

const BUG_KEYWORDS = [
  "fix", "bug", "error", "broken", "doesn't work", "not working", "crash",
  "issue", "problem", "wrong", "incorrect", "fail",
];

const REFACTOR_KEYWORDS = [
  "refactor", "clean up", "reorganize", "restructure", "optimize", "simplify",
  "extract", "split", "move", "rename",
];

const MULTI_FILE_KEYWORDS = [
  "add page", "new route", "new component", "new endpoint", "api and frontend",
  "full stack", "backend and frontend", "create a", "build a", "build me",
  "add feature", "implement", "authentication", "login", "signup",
];

export function classifyTask(
  message: string,
  fileCount: number,
  focusedFile: boolean,
  hasAttachments: boolean,
): TaskClassification {
  const lower = message.toLowerCase();
  const wordCount = message.split(/\s+/).length;

  // Detect task type
  let taskType: TaskType = "general";
  let designScore = 0;
  let bugScore = 0;
  let refactorScore = 0;
  let multiFileScore = 0;

  for (const kw of DESIGN_KEYWORDS) {
    if (lower.includes(kw)) designScore++;
  }
  for (const kw of BUG_KEYWORDS) {
    if (lower.includes(kw)) bugScore++;
  }
  for (const kw of REFACTOR_KEYWORDS) {
    if (lower.includes(kw)) refactorScore++;
  }
  for (const kw of MULTI_FILE_KEYWORDS) {
    if (lower.includes(kw)) multiFileScore++;
  }

  const maxScore = Math.max(designScore, bugScore, refactorScore, multiFileScore);
  if (maxScore === 0) {
    taskType = wordCount < 20 ? "explanation" : "code-generation";
  } else if (designScore === maxScore) {
    taskType = "design";
  } else if (bugScore === maxScore) {
    taskType = "bug-fix";
  } else if (refactorScore === maxScore) {
    taskType = "refactor";
  } else if (multiFileScore === maxScore) {
    taskType = "multi-file";
  }

  // Detect complexity
  let complexity: Complexity;
  if (wordCount < 15 && focusedFile) {
    complexity = "trivial";
  } else if (wordCount < 40 && fileCount < 5) {
    complexity = "simple";
  } else if (wordCount < 100 || multiFileScore >= 2) {
    complexity = "moderate";
  } else {
    complexity = "complex";
  }

  // Determine if swarm is needed
  const requiresSwarm =
    complexity === "complex" ||
    (complexity === "moderate" && multiFileScore >= 2) ||
    (taskType === "multi-file" && fileCount > 8);

  // Suggest agent types
  const suggestedAgentTypes: AgentType[] = ["coder"];
  if (requiresSwarm) {
    suggestedAgentTypes.unshift("coordinator");
    suggestedAgentTypes.push("reviewer");
  }
  if (designScore >= 2) {
    suggestedAgentTypes.push("designer");
  }

  return {
    taskType,
    complexity,
    requiresSwarm,
    suggestedAgentTypes,
    hasAttachments,
    estimatedFileCount: multiFileScore >= 2 ? Math.max(fileCount, 5) : Math.max(fileCount, 1),
  };
}

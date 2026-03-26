import type Anthropic from "@anthropic-ai/sdk";

export interface AutoModeConfig {
  maxSteps: number;
  stopOnError: boolean;
  goals: string[];
  currentStep: number;
}

interface ProjectFile {
  filename: string;
  content: string;
  language: string;
}

const DEFAULT_MAX_STEPS = 10;
const activeSessions = new Map<number, AutoModeConfig>();

export function startAutoMode(projectId: number, goals: string[], maxSteps = DEFAULT_MAX_STEPS): AutoModeConfig {
  const config: AutoModeConfig = { maxSteps, stopOnError: true, goals, currentStep: 0 };
  activeSessions.set(projectId, config);
  return config;
}

export function stopAutoMode(projectId: number): void {
  activeSessions.delete(projectId);
}

export function getAutoMode(projectId: number): AutoModeConfig | null {
  return activeSessions.get(projectId) ?? null;
}

export function isAutoModeActive(projectId: number): boolean {
  const session = activeSessions.get(projectId);
  if (!session) return false;
  return session.currentStep < session.maxSteps;
}

export function incrementAutoStep(projectId: number): number {
  const session = activeSessions.get(projectId);
  if (!session) return -1;
  session.currentStep++;
  if (session.currentStep >= session.maxSteps) activeSessions.delete(projectId);
  return session.currentStep;
}

export async function planNextAutoStep(
  client: Anthropic,
  model: string,
  projectName: string,
  files: ProjectFile[],
  goals: string[],
  stepNumber: number,
  maxSteps: number,
  lastAssistantMessage: string,
): Promise<string | null> {
  const fileList = files.map(f => `- ${f.filename} (${f.language}, ${f.content.split('\n').length} lines)`).join('\n');

  const plannerPrompt = `You are an autonomous app builder planner for "${projectName}".

GOALS:
${goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

CURRENT FILES:
${fileList || '(none yet)'}

STEP: ${stepNumber} of ${maxSteps}

LAST RESPONSE SUMMARY:
${lastAssistantMessage.slice(0, 500)}

Decide the SINGLE most important next action. Respond with EITHER:
1. "DONE" if all goals are accomplished
2. A concise instruction (1-3 sentences) for what to build/fix next.`;

  try {
    const response = await client.messages.create({
      model: model.includes('haiku') ? model : 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: plannerPrompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    if (text.trim().toUpperCase() === 'DONE') return null;
    return text.trim();
  } catch (err) {
    console.error('[auto-mode] Planner error:', err);
    return null;
  }
}

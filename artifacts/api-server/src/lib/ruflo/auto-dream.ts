import type Anthropic from "@anthropic-ai/sdk";

export interface DreamResult {
  appName: string;
  description: string;
  features: string[];
  pages: string[];
  techStack: string[];
  designTheme: string;
  buildSteps: string[];
  initialPrompt: string;
}

export interface DreamConfig {
  creativity: 'conservative' | 'balanced' | 'wild';
  style: 'minimal' | 'modern' | 'glassmorphism' | 'brutalist' | 'playful';
  includeAnimations: boolean;
  darkMode: boolean;
}

const DEFAULT_DREAM_CONFIG: DreamConfig = {
  creativity: 'balanced',
  style: 'modern',
  includeAnimations: true,
  darkMode: true,
};

export async function dreamUp(
  client: Anthropic,
  model: string,
  userIdea: string,
  config: Partial<DreamConfig> = {},
): Promise<DreamResult> {
  const cfg = { ...DEFAULT_DREAM_CONFIG, ...config };

  const creativityInstructions = {
    conservative: 'Stick closely to what the user described. Keep it simple and functional.',
    balanced: 'Add thoughtful enhancements beyond what was asked. Include 2-3 creative touches.',
    wild: 'Go all out. Add surprising, delightful features. Think outside the box.',
  };

  const prompt = `You are a creative AI app architect. Dream up a complete, polished app concept.

USER'S IDEA: "${userIdea}"

CREATIVITY: ${cfg.creativity} — ${creativityInstructions[cfg.creativity]}
STYLE: ${cfg.style}
ANIMATIONS: ${cfg.includeAnimations ? 'Yes' : 'No'}
DARK MODE: ${cfg.darkMode ? 'Yes' : 'No'}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "appName": "creative name",
  "description": "2-3 sentence pitch",
  "features": ["feature 1", "feature 2"],
  "pages": ["page 1", "page 2"],
  "techStack": ["HTML", "CSS", "JavaScript"],
  "designTheme": "detailed visual design description with hex colors, fonts, spacing",
  "buildSteps": ["step 1", "step 2"],
  "initialPrompt": "Extremely detailed prompt to build this app in one shot. Include specific hex colors, font choices, spacing, component descriptions, and full functionality."
}

Make the initialPrompt extremely detailed — it should produce a working, beautiful first version in one shot.`;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr) as DreamResult;
  } catch (err) {
    console.error('[auto-dream] Error:', err);
    return {
      appName: 'My App',
      description: userIdea,
      features: [userIdea],
      pages: ['Main Page'],
      techStack: ['HTML', 'CSS', 'JavaScript'],
      designTheme: 'Modern dark theme with #0f172a background, #10b981 accent',
      buildSteps: [`Build: ${userIdea}`],
      initialPrompt: `Build a web app: ${userIdea}. Use a modern dark theme with clean typography, Inter font, #0f172a background, #1e293b cards, #10b981 accent color. Make it responsive and polished.`,
    };
  }
}

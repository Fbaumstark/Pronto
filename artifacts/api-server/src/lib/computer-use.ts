import Anthropic from "@anthropic-ai/sdk";
import { chromium, type Browser, type Page, type BrowserContext } from "playwright";

const DISPLAY_WIDTH = 1280;
const DISPLAY_HEIGHT = 800;
const MAX_ITERATIONS = 15;

export interface ComputerUseResult {
  actions: Array<{ action: string; detail: string }>;
  finalScreenshot: string | null;
  codeChanges: string;
  summary: string;
  iterations: number;
  accessibilityTree?: string;
  consoleErrors?: string[];
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserInstance;
}

async function newPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  return { context, page };
}

async function captureScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({ type: "png", fullPage: false });
  return buffer.toString("base64");
}

/**
 * Get the accessibility tree from the page -- much faster and more
 * token-efficient than screenshots for understanding page structure.
 */
async function getAccessibilityTree(page: Page): Promise<string> {
  const snapshot = await page.accessibility.snapshot();
  if (!snapshot) return "(empty page)";
  return formatA11yNode(snapshot, 0);
}

function formatA11yNode(node: any, depth: number): string {
  const indent = "  ".repeat(depth);
  let line = `${indent}[${node.role}]`;
  if (node.name) line += ` "${node.name}"`;
  if (node.value) line += ` value="${node.value}"`;
  if (node.description) line += ` desc="${node.description}"`;
  if (node.checked !== undefined) line += ` checked=${node.checked}`;
  if (node.pressed !== undefined) line += ` pressed=${node.pressed}`;
  if (node.disabled) line += ` disabled`;
  if (node.focused) line += ` focused`;

  let result = line + "\n";
  if (node.children) {
    for (const child of node.children) {
      result += formatA11yNode(child, depth + 1);
    }
  }
  return result;
}

/**
 * Collect all interactive elements (buttons, links, inputs) with their
 * bounding boxes so Claude can reason about clickable targets.
 */
async function getInteractiveElements(page: Page): Promise<string> {
  return page.evaluate(() => {
    const selectors = "a, button, input, select, textarea, [role='button'], [role='link'], [onclick], [tabindex]";
    const elements = Array.from(document.querySelectorAll(selectors));
    return elements
      .slice(0, 50) // limit to 50 elements
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const tag = el.tagName.toLowerCase();
        const text = (el as HTMLElement).innerText?.slice(0, 60) || "";
        const type = (el as HTMLInputElement).type || "";
        const href = (el as HTMLAnchorElement).href || "";
        const placeholder = (el as HTMLInputElement).placeholder || "";
        return `[${tag}${type ? " type=" + type : ""}] "${text || placeholder}" at (${Math.round(rect.x)},${Math.round(rect.y)}) ${Math.round(rect.width)}x${Math.round(rect.height)}${href ? " href=" + href : ""}`;
      })
      .join("\n");
  });
}

// ── Playwright action executor for Computer Use loop ──

async function executeAction(
  page: Page,
  action: string,
  input: Record<string, any>,
): Promise<{ screenshot?: string; error?: string }> {
  try {
    switch (action) {
      case "screenshot":
        return { screenshot: await captureScreenshot(page) };

      case "left_click": {
        const [x, y] = input.coordinate;
        await page.mouse.click(x, y);
        await page.waitForLoadState("networkidle").catch(() => {});
        return { screenshot: await captureScreenshot(page) };
      }

      case "double_click": {
        const [x, y] = input.coordinate;
        await page.mouse.dblclick(x, y);
        await page.waitForLoadState("networkidle").catch(() => {});
        return { screenshot: await captureScreenshot(page) };
      }

      case "type":
        await page.keyboard.type(input.text, { delay: 20 });
        return { screenshot: await captureScreenshot(page) };

      case "key":
        await page.keyboard.press(input.text);
        await page.waitForTimeout(300);
        return { screenshot: await captureScreenshot(page) };

      case "scroll": {
        const [sx, sy] = input.coordinate || [DISPLAY_WIDTH / 2, DISPLAY_HEIGHT / 2];
        const amount = (input.scroll_amount || 3) * 100;
        const dir = input.scroll_direction === "up" ? -amount : amount;
        await page.mouse.move(sx, sy);
        await page.mouse.wheel(0, dir);
        await page.waitForTimeout(500);
        return { screenshot: await captureScreenshot(page) };
      }

      case "mouse_move": {
        const [mx, my] = input.coordinate;
        await page.mouse.move(mx, my);
        return { screenshot: await captureScreenshot(page) };
      }

      case "wait":
        await page.waitForTimeout((input.duration || 2) * 1000);
        return { screenshot: await captureScreenshot(page) };

      default:
        return { error: `Unknown action: ${action}` };
    }
  } catch (err: any) {
    return { error: err.message };
  }
}

// ── Computer Use loop (full interactive testing via Anthropic beta) ──

export async function runComputerUseLoop(
  apiKey: string,
  previewUrl: string,
  task: string,
  onEvent?: (event: any) => void,
): Promise<ComputerUseResult> {
  const client = new Anthropic({ apiKey });
  const browser = await getBrowser();
  const { context, page } = await newPage(browser);

  const actions: Array<{ action: string; detail: string }> = [];
  let codeChanges = "";
  let finalScreenshot: string | null = null;

  try {
    await page.goto(previewUrl, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1000);

    const initialScreenshot = await captureScreenshot(page);

    const messages: any[] = [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/png", data: initialScreenshot } },
          {
            type: "text",
            text: `You are reviewing a web application preview. Your task: ${task}

Look at this screenshot of the app. Analyze the UI, identify issues, and interact with it to test functionality. After testing, provide a summary of:
1. Visual issues (layout, colors, spacing, alignment)
2. Functional issues (broken buttons, missing features)
3. Specific code changes needed to fix the issues

Use the computer tool to click around and test the app.`,
          },
        ],
      },
    ];

    const tools: any[] = [
      {
        type: "computer_20251124" as any,
        name: "computer",
        display_width_px: DISPLAY_WIDTH,
        display_height_px: DISPLAY_HEIGHT,
      },
    ];

    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      onEvent?.({ type: "computer_use_step", step: iterations, maxSteps: MAX_ITERATIONS });

      const response = await client.beta.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        tools,
        messages,
        betas: ["computer-use-2025-11-24"],
      });

      messages.push({ role: "assistant", content: response.content });

      const toolResults: any[] = [];

      for (const block of response.content) {
        if (block.type === "text") codeChanges += block.text + "\n";

        if (block.type === "tool_use") {
          const input = block.input as Record<string, any>;
          const actionName = input.action || "screenshot";

          actions.push({ action: actionName, detail: JSON.stringify(input) });
          onEvent?.({ type: "computer_use_action", action: actionName, step: iterations });

          const result = await executeAction(page, actionName, input);

          if (result.error) {
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result.error, is_error: true });
          } else if (result.screenshot) {
            finalScreenshot = result.screenshot;
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: result.screenshot } }],
            });
          } else {
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Action completed" });
          }
        }
      }

      if (toolResults.length === 0) break;
      messages.push({ role: "user", content: toolResults });
    }

    return {
      actions,
      finalScreenshot,
      codeChanges: codeChanges.trim() || "Analysis complete.",
      summary: `Completed ${iterations} iterations, performed ${actions.length} actions.`,
      iterations,
    };
  } finally {
    await context.close();
  }
}

// ── Quick review: accessibility tree + screenshots (no deploy needed) ──

export async function reviewPreview(
  apiKey: string,
  serverBaseUrl: string,
  projectId: number,
  task: string,
  projectFiles: Array<{ filename: string; content: string; language: string }>,
  onEvent?: (event: any) => void,
): Promise<ComputerUseResult> {
  const client = new Anthropic({ apiKey });
  const browser = await getBrowser();
  const { context, page } = await newPage(browser);

  const actions: Array<{ action: string; detail: string }> = [];
  const consoleErrors: string[] = [];

  // Collect console errors
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(`Uncaught: ${err.message}`);
  });

  try {
    const previewUrl = `${serverBaseUrl}/api/projects/${projectId}/preview`;

    // ── Step 1: Load and capture desktop ──
    onEvent?.({ type: "review_status", message: "Loading preview..." });
    await page.goto(previewUrl, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1500);

    onEvent?.({ type: "review_status", message: "Reading accessibility tree..." });
    const a11yTree = await getAccessibilityTree(page);
    const interactiveEls = await getInteractiveElements(page);
    actions.push({ action: "a11y_tree", detail: `${a11yTree.length} chars` });

    onEvent?.({ type: "review_status", message: "Capturing desktop..." });
    const desktopShot = await captureScreenshot(page);
    actions.push({ action: "screenshot", detail: "desktop 1280x800" });

    // ── Step 2: Capture mobile ──
    onEvent?.({ type: "review_status", message: "Capturing mobile..." });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const mobileShot = await captureScreenshot(page);
    actions.push({ action: "screenshot", detail: "mobile 375x812" });

    // ── Step 3: Scroll test ──
    onEvent?.({ type: "review_status", message: "Testing scroll..." });
    await page.setViewportSize({ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT });
    await page.waitForTimeout(300);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(500);
    const scrolledShot = await captureScreenshot(page);
    actions.push({ action: "scroll", detail: "scrolled 600px" });

    // ── Step 4: Click all buttons to test interactivity ──
    onEvent?.({ type: "review_status", message: "Testing buttons..." });
    const buttonErrors: string[] = [];
    const buttons = await page.$$("button, a[href], input[type='submit']");
    for (const btn of buttons.slice(0, 10)) {
      try {
        const box = await btn.boundingBox();
        if (box && box.width > 0 && box.height > 0) {
          await btn.click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(300);
        }
      } catch (e: any) {
        buttonErrors.push(e.message);
      }
    }
    if (buttonErrors.length > 0) {
      actions.push({ action: "click_test", detail: `${buttonErrors.length} button errors` });
    }

    // ── Step 5: Build context and analyze ──
    const fileContext = projectFiles
      .filter((f) => f.filename === "index.html" || f.filename.endsWith(".css") || f.filename.endsWith(".js"))
      .map((f) => `=== ${f.filename} ===\n${f.content.slice(0, 3000)}`)
      .join("\n\n");

    onEvent?.({ type: "review_status", message: "Analyzing with Claude..." });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data: desktopShot } },
            { type: "image", source: { type: "base64", media_type: "image/png", data: mobileShot } },
            { type: "image", source: { type: "base64", media_type: "image/png", data: scrolledShot } },
            {
              type: "text",
              text: `You are a senior UI/UX engineer and QA tester. Analyze this web app using both screenshots AND the accessibility tree.

## Screenshots
1. Desktop (1280x800)
2. Mobile (375x812)
3. After scrolling

## Accessibility Tree
${a11yTree.slice(0, 4000)}

## Interactive Elements
${interactiveEls.slice(0, 2000)}

## Console Errors
${consoleErrors.length > 0 ? consoleErrors.join("\n") : "None"}

## Button Click Test Results
${buttonErrors.length > 0 ? buttonErrors.join("\n") : "All buttons clickable"}

${task ? `## User Request\n${task}\n\n` : ""}## Source Code
${fileContext}

Provide a thorough review:

### Visual Issues
List specific problems (spacing, alignment, colors, typography, overflow, contrast)

### Responsive Issues
Problems with the mobile view -- truncated text, overflow, touch targets too small

### Accessibility Issues
Missing labels, poor contrast, keyboard navigation problems (from the a11y tree)

### Functional Issues
Broken elements, console errors, buttons that don't work

### Code Fixes
For EACH issue, provide the exact code fix:
<edit file="filename.ext">
<old>exact code to replace</old>
<new>fixed code</new>
</edit>

Be specific. Every fix must reference real code from the source.`,
            },
          ],
        },
      ],
    });

    const analysisText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return {
      actions,
      finalScreenshot: desktopShot,
      codeChanges: analysisText,
      summary: `Reviewed desktop + mobile + scroll. ${consoleErrors.length} console errors. ${buttonErrors.length} button errors. Accessibility tree analyzed.`,
      iterations: 1,
      accessibilityTree: a11yTree,
      consoleErrors,
    };
  } finally {
    await context.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

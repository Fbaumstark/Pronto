import Anthropic from "@anthropic-ai/sdk";
import puppeteer, { type Browser, type Page } from "puppeteer";

const DISPLAY_WIDTH = 1280;
const DISPLAY_HEIGHT = 800;
const MAX_ITERATIONS = 15;

interface ComputerUseResult {
  actions: Array<{ action: string; detail: string }>;
  finalScreenshot: string | null;
  codeChanges: string;
  summary: string;
  iterations: number;
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--window-size=${DISPLAY_WIDTH},${DISPLAY_HEIGHT}`,
      ],
    });
  }
  return browserInstance;
}

async function captureScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT },
  });
  return Buffer.from(buffer).toString("base64");
}

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
        await page.waitForNetworkIdle({ timeout: 2000 }).catch(() => {});
        return { screenshot: await captureScreenshot(page) };
      }

      case "double_click": {
        const [x, y] = input.coordinate;
        await page.mouse.click(x, y, { count: 2 });
        await page.waitForNetworkIdle({ timeout: 2000 }).catch(() => {});
        return { screenshot: await captureScreenshot(page) };
      }

      case "type":
        await page.keyboard.type(input.text, { delay: 20 });
        return { screenshot: await captureScreenshot(page) };

      case "key":
        await page.keyboard.press(input.text);
        await new Promise((r) => setTimeout(r, 300));
        return { screenshot: await captureScreenshot(page) };

      case "scroll": {
        const [sx, sy] = input.coordinate || [DISPLAY_WIDTH / 2, DISPLAY_HEIGHT / 2];
        const amount = (input.scroll_amount || 3) * 100;
        const dir = input.scroll_direction === "up" ? -amount : amount;
        await page.mouse.move(sx, sy);
        await page.mouse.wheel({ deltaY: dir });
        await new Promise((r) => setTimeout(r, 500));
        return { screenshot: await captureScreenshot(page) };
      }

      case "mouse_move": {
        const [mx, my] = input.coordinate;
        await page.mouse.move(mx, my);
        return { screenshot: await captureScreenshot(page) };
      }

      case "wait":
        await new Promise((r) => setTimeout(r, (input.duration || 2) * 1000));
        return { screenshot: await captureScreenshot(page) };

      default:
        return { error: `Unknown action: ${action}` };
    }
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Run the Anthropic Computer Use agent loop on a Pronto app preview.
 * Takes a URL to the preview and a task description.
 */
export async function runComputerUseLoop(
  apiKey: string,
  previewUrl: string,
  task: string,
  onEvent?: (event: any) => void,
): Promise<ComputerUseResult> {
  const client = new Anthropic({ apiKey });
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT });

  const actions: Array<{ action: string; detail: string }> = [];
  let codeChanges = "";
  let finalScreenshot: string | null = null;

  try {
    // Navigate to the preview
    await page.goto(previewUrl, { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Take initial screenshot
    const initialScreenshot = await captureScreenshot(page);

    const messages: any[] = [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: initialScreenshot },
          },
          {
            type: "text",
            text: `You are reviewing a web application preview. Your task: ${task}

Look at this screenshot of the app. Analyze the UI, identify issues, and interact with it to test functionality. After testing, provide a summary of:
1. Visual issues (layout, colors, spacing, alignment)
2. Functional issues (broken buttons, missing features)
3. Specific code changes needed to fix the issues

Use the computer tool to click around and test the app. Take screenshots after each action to verify results.`,
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

      // Add assistant response to messages
      messages.push({ role: "assistant", content: response.content });

      // Process tool calls
      const toolResults: any[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          codeChanges += block.text + "\n";
        }

        if (block.type === "tool_use") {
          const input = block.input as Record<string, any>;
          const actionName = input.action || "screenshot";

          actions.push({
            action: actionName,
            detail: JSON.stringify(input),
          });

          onEvent?.({
            type: "computer_use_action",
            action: actionName,
            step: iterations,
          });

          const result = await executeAction(page, actionName, input);

          if (result.error) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result.error,
              is_error: true,
            });
          } else if (result.screenshot) {
            finalScreenshot = result.screenshot;
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/png", data: result.screenshot },
                },
              ],
            });
          } else {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: "Action completed",
            });
          }
        }
      }

      // If no tool calls, Claude is done
      if (toolResults.length === 0) break;

      messages.push({ role: "user", content: toolResults });
    }

    // Extract the summary from the last text response
    const summary = codeChanges.trim() || "Analysis complete.";

    return {
      actions,
      finalScreenshot,
      codeChanges: summary,
      summary: `Completed ${iterations} iterations, performed ${actions.length} actions.`,
      iterations,
    };
  } finally {
    await page.close();
  }
}

/**
 * Quick visual review: screenshot the preview and ask Claude vision to analyze it.
 * No deploy needed -- loads directly from the API server's preview endpoint.
 * Uses standard Messages API with vision, not the Computer Use beta.
 */
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
  const page = await browser.newPage();
  await page.setViewport({ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT });

  const actions: Array<{ action: string; detail: string }> = [];

  try {
    const previewUrl = `${serverBaseUrl}/api/projects/${projectId}/preview`;
    onEvent?.({ type: "review_status", message: "Loading preview..." });

    await page.goto(previewUrl, { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Take desktop screenshot
    onEvent?.({ type: "review_status", message: "Capturing desktop view..." });
    const desktopShot = await captureScreenshot(page);
    actions.push({ action: "screenshot", detail: "desktop 1280x800" });

    // Take mobile screenshot
    onEvent?.({ type: "review_status", message: "Capturing mobile view..." });
    await page.setViewport({ width: 375, height: 812 });
    await new Promise((r) => setTimeout(r, 500));
    const mobileShot = await page.screenshot({ type: "png" });
    const mobileB64 = Buffer.from(mobileShot).toString("base64");
    actions.push({ action: "screenshot", detail: "mobile 375x812" });

    // Scroll test on desktop
    onEvent?.({ type: "review_status", message: "Testing scroll..." });
    await page.setViewport({ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT });
    await new Promise((r) => setTimeout(r, 300));
    await page.mouse.wheel({ deltaY: 600 });
    await new Promise((r) => setTimeout(r, 500));
    const scrolledShot = await captureScreenshot(page);
    actions.push({ action: "scroll", detail: "scrolled down 600px" });

    // Get console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    // Reload to catch errors fresh
    await page.goto(previewUrl, { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Build file context (truncated)
    const fileContext = projectFiles
      .filter(f => f.filename === "index.html" || f.filename.endsWith(".css") || f.filename.endsWith(".js"))
      .map(f => `=== ${f.filename} ===\n${f.content.slice(0, 3000)}`)
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
            { type: "image", source: { type: "base64", media_type: "image/png", data: mobileB64 } },
            { type: "image", source: { type: "base64", media_type: "image/png", data: scrolledShot } },
            {
              type: "text",
              text: `You are a senior UI/UX reviewer. Analyze these 3 screenshots of a web app:
1. Desktop view (1280x800)
2. Mobile view (375x812)
3. After scrolling down

${task ? `USER REQUEST: ${task}\n\n` : ""}${consoleErrors.length > 0 ? `CONSOLE ERRORS:\n${consoleErrors.join("\n")}\n\n` : ""}SOURCE CODE:\n${fileContext}

Provide a thorough review:

## Visual Issues
List specific visual problems (spacing, alignment, colors, typography, overflow, etc.)

## Responsive Issues
List problems with the mobile view

## Functional Issues
List any broken elements, missing interactions, or console errors

## Code Fixes
For EACH issue, provide the exact code fix using this format:
<edit file="filename.ext">
<old>exact code to replace</old>
<new>fixed code</new>
</edit>

Be specific and actionable. Every fix must reference real code from the source.`,
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
      summary: `Reviewed desktop, mobile, and scrolled views. ${consoleErrors.length} console errors found.`,
      iterations: 1,
    };
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

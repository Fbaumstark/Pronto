export function cleanResponseForDisplay(content: string): string {
  return content
    .replace(/<file name="[^"]*">[\s\S]*?<\/file>/g, "")
    .trim();
}

export function cleanStreamingForDisplay(content: string): string {
  let cleaned = content.replace(/<file name="[^"]*">[\s\S]*?<\/file>/g, "");
  cleaned = cleaned.replace(/<file name="[^"]*">[\s\S]*$/, "");
  return cleaned.trim();
}

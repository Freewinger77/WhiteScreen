import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  logger.info("save-prompt request received");

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Invalid prompt provided" },
        { status: 400 },
      );
    }

    // Save to a persistent config file
    const configPath = path.join(process.cwd(), "config", "prompt.txt");
    
    try {
      await writeFile(configPath, prompt, "utf-8");
      logger.info("Prompt saved successfully to config/prompt.txt");
    } catch (error) {
      logger.warn("Could not save to config file, will use in-memory only:", error);
      // Continue even if file write fails
    }

    // Update the constants file
    const constantsPath = path.join(process.cwd(), "src", "lib", "constants.ts");
    const constantsContent = await import("fs").then((fs) =>
      fs.promises.readFile(constantsPath, "utf-8")
    );

    // Replace the RETELL_AGENT_GENERAL_PROMPT value
    const updatedContent = constantsContent.replace(
      /export const RETELL_AGENT_GENERAL_PROMPT = `[\s\S]*?`;/,
      `export const RETELL_AGENT_GENERAL_PROMPT = \`${prompt}\`;`
    );

    await writeFile(constantsPath, updatedContent, "utf-8");
    logger.info("Constants file updated successfully");

    return NextResponse.json(
      {
        message: "Prompt saved successfully",
        prompt,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Error saving prompt:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save prompt" },
      { status: 500 },
    );
  }
}


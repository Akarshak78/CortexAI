import { checkAgentLimit } from "../config/agentLimit.js";
import { getModel } from "../config/llmModels.js";
import { deductCredits } from "../utils/deductCredits.js";

export const codingAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "coding");

        const intentLlm = await getModel("intent");
        const llm = await getModel("coding");

        const intentRes = await intentLlm.invoke(`
You are an intent classifier.

Return ONLY one of these values.

CODE_GENERATION
CODE_REVIEW
CODE_EXPLANATION
DEBUGGING
OPTIMIZATION
CONVERSION
DOCUMENTATION

User Request:
${state.prompt}
`);

        const intent = intentRes.content.trim().toUpperCase();

        // ==========================
        // CODE GENERATION
        // ==========================
        if (intent === "CODE_GENERATION") {

            const prompt = `
You are CortexAI Coding Agent.

Generate the requested project.

Default stack:
- HTML
- CSS
- JavaScript

Use React / Next.js / Vue ONLY if explicitly requested.

Rules:

- Responsive
- Modern UI
- CSS Variables
- Flexbox/Grid
- Smooth animations
- Beautiful spacing
- Single page unless user requests otherwise.
- Use real Unsplash images.
- Keep the implementation concise.
- If the request is too large, simplify the UI instead of generating excessive code.

Return ONLY valid JSON.

Schema:

{
  "files":[
    {
      "name":"index.html",
      "content":"..."
    },
    {
      "name":"style.css",
      "content":"..."
    },
    {
      "name":"script.js",
      "content":"..."
    }
  ]
}

Rules:

- Output MUST start with {
- Output MUST end with }
- No markdown
- No explanation
- No code fences
- No extra text

User Request:
${state.prompt}
`;

            const res = await llm.invoke(prompt);

            console.log("========== MODEL RESPONSE ==========");
            console.log("Model:", res?.response_metadata?.model_name);
            console.log("Finish Reason:", res?.response_metadata?.finish_reason);
            console.log(
                "Completion Tokens:",
                res?.response_metadata?.tokenUsage?.completion_tokens
            );
            console.log("====================================");

            if (res?.response_metadata?.finish_reason === "length") {
                throw new Error(
                    "The requested project is too large to generate in a single response. Please simplify your request."
                );
            }

            if (typeof res.content !== "string") {
                throw new Error("Model returned an invalid response.");
            }

            let raw = res.content.trim();

            const start = raw.indexOf("{");
            const end = raw.lastIndexOf("}");

            if (start === -1 || end === -1) {
                throw new Error("Model did not return valid JSON.");
            }

            raw = raw.substring(start, end + 1);

            let data;

            try {
                data = JSON.parse(raw);
            } catch (err) {
                console.error("========== JSON PARSE ERROR ==========");
                console.error(raw);
                console.error("======================================");

                throw new Error(
                    "The AI returned incomplete project data. Please try a smaller prompt."
                );
            }

            await deductCredits(state.userId, "coding");

            return {
                ...state,
                aiResponse: "Code Generated Successfully.",
                artifacts: [
                    {
                        id: Date.now(),
                        type: "Project",
                        title: state.prompt,
                        files: data.files || []
                    }
                ]
            };
        }

        // ==========================
        // REVIEW / DEBUG / EXPLAIN
        // ==========================

        const res = await llm.invoke(`
The user's request type is:

${intent}

Return Markdown only.

Never generate project files.

Use headings like:

# Overview

## Explanation

## Problems

## Improvements

## Best Practices

## Optimized Code (if needed)

User Request:

${state.prompt}
`);

        await deductCredits(state.userId, "coding");

        return {
            ...state,
            aiResponse: res.content,
            artifacts: []
        };

    } catch (error) {
        console.error("========== Coding Agent Error ==========");
        console.error(error);
        console.error(error?.message);
        console.error(error?.stack);
        console.error("========================================");

        return {
            ...state,
            aiResponse:
                error?.message ||
                "Something went wrong while processing your coding request.",
            artifacts: []
        };
    }
};
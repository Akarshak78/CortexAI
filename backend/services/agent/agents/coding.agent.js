import { checkAgentLimit } from "../config/agentLimit.js"
import { getModel } from "../config/llmModels.js"
import { deductCredits } from "../utils/deductCredits.js"

export const codingAgent=async (state) => {
try {
   await checkAgentLimit(state.userId,"coding")
   const intentLlm=await getModel("intent")
   const llm=await getModel("coding")
   const intentRes=await intentLlm.invoke(`
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
    `)
    const intent=intentRes.content
    if (intent.trim() === "CODE_GENERATION") {

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
- Smooth Scroll
- Hover Effects
- Beautiful spacing
- Single page unless user asks otherwise.

Use real Unsplash images.

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

IMPORTANT:

- Output MUST begin with {
- Output MUST end with }
- No markdown
- No explanation
- No \`\`\`
- No extra text

If the requested project is too large, simplify the design instead of truncating the response.

User Request:
${state.prompt}
`;

    const res = await llm.invoke(prompt);

    console.log("Finish Reason:", res?.response_metadata?.finish_reason);
    console.log("Completion Tokens:", res?.response_metadata?.tokenUsage?.completion_tokens);

    if (res?.response_metadata?.finish_reason === "length") {
        throw new Error(
            "The requested project is too large for a single response. Please ask for a smaller project or generate it in multiple parts."
        );
    }

    let raw = res.content.trim();

    // Extract JSON if model adds extra text
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
        console.error("JSON Parse Error");
        console.error(raw);

        throw new Error(
            "The AI returned incomplete project data. Please try a simpler prompt."
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
} catch (error) {
   console.error("Coding Agent Error:");
   console.error(error);
   console.error(error?.message);
   console.error(error?.stack);

   return {
      ...state,
      aiResponse: error?.message || "failed to generate code",
      artifacts: []
   };
}
  
}
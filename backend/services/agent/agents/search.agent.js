import { checkAgentLimit } from "../config/agentLimit.js"
import { searchTool } from "../config/tavily.js"
import { deductCredits } from "../utils/deductCredits.js"
export const searchAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "search")
        const results = await searchTool.invoke({
            query: state.prompt
        })
        await deductCredits(state.userId, "search")
        console.log(results)
        return {
            ...state,
            searchResults: results,
            images: results.images
        }
    } catch (error) {
   console.error("Vision Agent Error:");
   console.error(error);
   console.error(error?.message);
   console.error(error?.stack);

   return {
      ...state,
      aiResponse: error?.message || "failed to search"
   };
}
}
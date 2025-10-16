import OpenAI from 'openai'

/**
 * AI-Powered Safety Compliance Checker
 * Uses OpenAI to check if prompts contain unsafe content
 */

// Initialize OpenAI client
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

const SAFETY_SYSTEM_PROMPT = `You are a content safety checker. Your job is to determine if a user's prompt contains any unsafe, inappropriate, or illegal content.

Check for the following types of unsafe content:
- Violence, gore, or brutal content
- Minor abuse or exploitation (anyone under 18)
- Pedophilia or child sexual abuse material (CSAM)
- Zoophilia or bestiality
- Self-harm or suicide
- Illegal activities
- Hate speech or discrimination
- Sexual violence or non-consensual acts
- Extreme or graphic violence
- Terrorism or extremism

IMPORTANT RULES:
- You must respond with ONLY one word: either "SAFE" or "UNSAFE"
- Do not explain your reasoning
- Do not provide any other text
- If you're unsure, respond with "UNSAFE" to be safe
- Normal creative prompts (art, stories, games) are SAFE unless they contain the above content

Examples:
User: "Create an image of a sunset over mountains"
Response: SAFE

User: "Generate a picture of children playing in a park"
Response: SAFE

User: "Make a video of a child in a dangerous situation"
Response: UNSAFE

User: "Create an image with violence and blood"
Response: UNSAFE

User: "Generate a portrait of a family"
Response: SAFE

Now analyze the following prompt and respond with ONLY "SAFE" or "UNSAFE":`

/**
 * Check if a prompt is safe using OpenAI
 * @param prompt - The user's prompt to check
 * @returns Object with isSafe flag and reason
 */
export async function checkPromptSafety(prompt: string): Promise<{
  isSafe: boolean
  reason?: string
}> {
  // Skip check if prompt is empty or too short
  if (!prompt || prompt.trim().length < 3) {
    return { isSafe: true }
  }

  try {
    console.log('🛡️ Safety check: Analyzing prompt...')
    
    const openai = getOpenAIClient()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use faster, cheaper model for safety checks
      messages: [
        { role: 'system', content: SAFETY_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0, // Use 0 for consistent, deterministic responses
      max_tokens: 10, // Only need one word
    })

    const response = completion.choices[0]?.message?.content?.trim().toUpperCase()
    
    console.log('🛡️ Safety check result:', response)

    if (response === 'SAFE') {
      return { isSafe: true }
    } else if (response === 'UNSAFE') {
      return { 
        isSafe: false, 
        reason: 'Your prompt contains content that violates our safety guidelines. Please revise your prompt to remove any references to violence, illegal activities, or inappropriate content.'
      }
    } else {
      // If we get an unexpected response, fail safe
      console.warn('🛡️ Unexpected safety check response:', response)
      return { 
        isSafe: false, 
        reason: 'Unable to verify prompt safety. Please try rephrasing your prompt.'
      }
    }
  } catch (error: any) {
    console.error('🛡️ Safety check error:', error)
    
    // On error, allow the request to continue (don't block legitimate users due to API issues)
    // But log the error for monitoring
    console.error('🛡️ Safety check failed, allowing request to proceed:', error.message)
    return { isSafe: true }
  }
}

/**
 * Get safety error message
 */
export function getSafetyErrorMessage(reason?: string): string {
  return reason || 'Your prompt did not pass our safety guidelines. Please ensure your prompt does not contain violent, illegal, or inappropriate content.'
}


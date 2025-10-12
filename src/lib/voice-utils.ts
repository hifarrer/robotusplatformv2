import OpenAI from 'openai'
import { promises as fs } from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface Voice {
  language: string
  voice_id: string
  gender: string
  age: string
  description: string
}

// Load voices data function
async function loadVoicesData(): Promise<Voice[]> {
  try {
    const voicesPath = path.join(process.cwd(), 'public', 'assets', 'voices.json')
    const voicesFile = await fs.readFile(voicesPath, 'utf-8')
    return JSON.parse(voicesFile)
  } catch (error) {
    console.error('Error loading voices data:', error)
    return []
  }
}

// Function to match voice description with available voices
export async function matchVoiceWithAI(description: string, gender: string, language: string = 'English'): Promise<string> {
  try {
    const voicesData = await loadVoicesData()
    
    const systemPrompt = `You are a voice matching assistant. You have access to a database of voices with the following structure:
    Each voice has: language, voice_id, gender, age, description
    
    Your task is to find the best matching voice based on the user's description and preferences.
    Return ONLY the voice_id of the best match.
    
    Available voices: ${JSON.stringify(voicesData, null, 2)}`

    const userPrompt = `Find a voice that matches this description: "${description}"
    Gender preference: ${gender}
    Language preference: ${language}
    
    Return only the voice_id.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 50
    })

    const response = completion.choices[0]?.message?.content?.trim()
    
    if (!response) {
      throw new Error('No voice match found')
    }

    // Validate that the returned voice_id exists in our data
    const voiceExists = voicesData.some((voice: Voice) => voice.voice_id === response)
    if (!voiceExists) {
      // Fallback to a default voice
      const defaultVoice = voicesData.find((voice: Voice) => 
        voice.language === language && voice.gender === gender
      ) || voicesData.find((voice: Voice) => voice.language === 'English')
      
      return defaultVoice?.voice_id || 'English_compelling_lady1'
    }

    return response
  } catch (error) {
    console.error('Voice matching error:', error)
    // Fallback to default voice
    return 'English_compelling_lady1'
  }
}

import OpenAI from 'openai'
import { promises as fs } from 'fs'
import path from 'path'

// Initialize OpenAI client only when needed (server-side)
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

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
  const callId = Math.random().toString(36).substr(2, 9)
  console.log(`🎤 [${callId}] STARTING VOICE MATCHING`)
  
  try {
    const voicesData = await loadVoicesData()
    
    console.log(`🎤 [${callId}] Voice matching - Available voices count:`, voicesData.length)
    console.log(`🎤 [${callId}] Voice matching - Looking for gender:`, gender, 'language:', language)
    console.log(`🎤 [${callId}] Voice matching - Description:`, description)
    
    // First, try to find a simple match based on gender and language
    const genderFilteredVoices = voicesData.filter((voice: Voice) => 
      voice.language === language && voice.gender === gender
    )
    
    console.log(`🎤 [${callId}] Gender-filtered voices:`, genderFilteredVoices.length)
    console.log(`🎤 [${callId}] Available male voices:`, genderFilteredVoices.map(v => ({ id: v.voice_id, age: v.age, desc: v.description.substring(0, 50) })))
    
    // If we have a simple match, use it
    if (genderFilteredVoices.length > 0) {
      // Look for voices that match the description keywords
      const lowerDescription = description.toLowerCase()
      
      // Look for specific characteristics with more comprehensive matching
      let bestMatch = null
      
      // Deep voice matching
      if (lowerDescription.includes('deep')) {
        console.log(`🎤 [${callId}] Looking for deep voice...`)
        const deepVoices = genderFilteredVoices.filter((voice: Voice) => 
          voice.description.toLowerCase().includes('deep') || 
          voice.description.toLowerCase().includes('magnetic') ||
          voice.description.toLowerCase().includes('persuasive') ||
          voice.description.toLowerCase().includes('commanding') ||
          voice.description.toLowerCase().includes('authoritative')
        )
        console.log(`🎤 [${callId}] Deep voices found:`, deepVoices.map(v => ({ id: v.voice_id, desc: v.description })))
        bestMatch = deepVoices[0]
      }
      
      // Age-based matching
      if (!bestMatch) {
        if (lowerDescription.includes('old') || lowerDescription.includes('senior')) {
          console.log(`🎤 [${callId}] Looking for old/senior voice...`)
          const oldVoices = genderFilteredVoices.filter((voice: Voice) => 
            voice.age === 'Senior' || voice.age === 'Middle Age' ||
            voice.description.toLowerCase().includes('old') ||
            voice.description.toLowerCase().includes('senior') ||
            voice.description.toLowerCase().includes('mature')
          )
          console.log(`🎤 [${callId}] Old voices found:`, oldVoices.map(v => ({ id: v.voice_id, age: v.age, desc: v.description })))
          bestMatch = oldVoices[0]
        } else if (lowerDescription.includes('40') || lowerDescription.includes('middle') || lowerDescription.includes('adult')) {
          console.log(`🎤 [${callId}] Looking for adult/middle age voice...`)
          const adultVoices = genderFilteredVoices.filter((voice: Voice) => 
            voice.age === 'Adult' || voice.age === 'Middle Age'
          )
          console.log(`🎤 [${callId}] Adult voices found:`, adultVoices.map(v => ({ id: v.voice_id, age: v.age, desc: v.description })))
          bestMatch = adultVoices[0]
        } else if (lowerDescription.includes('young')) {
          console.log(`🎤 [${callId}] Looking for young voice...`)
          const youngVoices = genderFilteredVoices.filter((voice: Voice) => 
            voice.age === 'Young Adult' || voice.age === 'Youth' ||
            voice.description.toLowerCase().includes('young') ||
            voice.description.toLowerCase().includes('radiant') ||
            voice.description.toLowerCase().includes('bright')
          )
          console.log(`🎤 [${callId}] Young voices found:`, youngVoices.map(v => ({ id: v.voice_id, age: v.age, desc: v.description })))
          bestMatch = youngVoices[0]
        }
      }
      
      // Professional/authoritative matching
      if (!bestMatch && (lowerDescription.includes('professional') || lowerDescription.includes('authoritative'))) {
        bestMatch = genderFilteredVoices.find((voice: Voice) => 
          voice.description.toLowerCase().includes('professional') ||
          voice.description.toLowerCase().includes('authoritative') ||
          voice.description.toLowerCase().includes('compelling') ||
          voice.description.toLowerCase().includes('commanding')
        )
      }
      
      // Gentle/soft matching
      if (!bestMatch && (lowerDescription.includes('gentle') || lowerDescription.includes('soft'))) {
        bestMatch = genderFilteredVoices.find((voice: Voice) => 
          voice.description.toLowerCase().includes('gentle') ||
          voice.description.toLowerCase().includes('soft') ||
          voice.description.toLowerCase().includes('calm') ||
          voice.description.toLowerCase().includes('soothing')
        )
      }
      
      if (bestMatch) {
        console.log(`🎤 [${callId}] ✅ FOUND KEYWORD MATCH:`, bestMatch.voice_id)
        console.log(`🎤 [${callId}] ✅ Selected voice description:`, bestMatch.description)
        console.log(`🎤 [${callId}] ✅ Selected voice age:`, bestMatch.age)
        return bestMatch.voice_id
      }
      
      // Fallback to first available voice of the right gender
      console.log(`🎤 [${callId}] ❌ NO KEYWORD MATCH FOUND`)
      console.log(`🎤 [${callId}] 🔄 Using first available voice of gender:`, genderFilteredVoices[0].voice_id)
      console.log(`🎤 [${callId}] 🔄 Fallback voice description:`, genderFilteredVoices[0].description)
      console.log(`🎤 [${callId}] 🔄 Fallback voice age:`, genderFilteredVoices[0].age)
      return genderFilteredVoices[0].voice_id
    }
    
    // If no gender match, try AI matching
    const systemPrompt = `You are a voice matching assistant. You have access to a database of voices with the following structure:
    Each voice has: language, voice_id, gender, age, description
    
    Your task is to find the best matching voice based on the user's description and preferences.
    Return ONLY the voice_id of the best match.
    
    Available voices: ${JSON.stringify(voicesData, null, 2)}`

    const userPrompt = `Find a voice that matches this description: "${description}"
    Gender preference: ${gender}
    Language preference: ${language}
    
    Return only the voice_id.`

    const openai = getOpenAIClient()
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
      // Fallback to a default voice based on gender
      const defaultVoice = voicesData.find((voice: Voice) => 
        voice.language === language && voice.gender === gender
      ) || voicesData.find((voice: Voice) => voice.language === 'English')
      
      console.log(`🎤 [${callId}] AI match invalid, using fallback:`, defaultVoice?.voice_id)
      return defaultVoice?.voice_id || (gender === 'Male' ? 'English_magnetic_voiced_man' : 'English_compelling_lady1')
    }

    console.log(`🎤 [${callId}] AI matched voice:`, response)
    return response
  } catch (error) {
    console.error(`🎤 [${callId}] Voice matching error:`, error)
    
    // Better fallback based on gender
    if (gender === 'Male') {
      console.log(`🎤 [${callId}] Error fallback to male voice`)
      return 'English_magnetic_voiced_man'
    } else {
      console.log(`🎤 [${callId}] Error fallback to female voice`)
      return 'English_compelling_lady1'
    }
  }
}

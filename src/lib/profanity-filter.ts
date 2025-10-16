/**
 * Profanity Filter
 * Checks text for inappropriate content
 */

const BANNED_WORDS = [
  'anal',
  'pussy',
  'dick',
  'cock',
  'penis',
  'vagina',
  'tits',
  'tit',
  'boob',
  'boobs',
  'penetration',
  'penetrated',
  'penetrate',
  'masturbating',
  'masturbation',
  'masturbate',
  'porn',
  'pornography',
  'sex',
  'sexual',
  'nude',
  'naked',
  'nipple',
  'nipples',
  'orgasm',
  'erotic',
  'explicit',
  'xxx',
  'nsfw',
  'fuck',
  'shit',
  'ass',
  'bitch',
  'whore',
  'slut',
  'cunt',
]

/**
 * Check if text contains banned words
 * @param text - Text to check
 * @returns Object with containsProfanity flag and found words
 */
export function containsProfanity(text: string): {
  containsProfanity: boolean
  foundWords: string[]
} {
  if (!text) {
    return { containsProfanity: false, foundWords: [] }
  }

  const lowerText = text.toLowerCase()
  const foundWords: string[] = []

  // Check each banned word
  for (const word of BANNED_WORDS) {
    // Use word boundaries to avoid false positives (e.g., "classic" contains "ass")
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    if (regex.test(lowerText)) {
      foundWords.push(word)
    }
  }

  return {
    containsProfanity: foundWords.length > 0,
    foundWords,
  }
}

/**
 * Get error message for profanity detection
 */
export function getProfanityErrorMessage(): string {
  return 'Your message contains inappropriate content that is not permitted. Please revise your message and try again.'
}


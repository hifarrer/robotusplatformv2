// Random prompt generator for image creation
export interface PromptCategory {
  category: string
  prompts: string[]
}

export const CREATIVE_PROMPTS: PromptCategory[] = [
  {
    category: "ROBOTUS UGC Lifestyle",
    prompts: [
      "A young woman smiling while holding a luxury perfume bottle with the brand name \"ROBOTUS\" clearly on the label, UGC aesthetic, soft natural lighting.",
      "A man sitting on a sofa casually trying on a stylish wristwatch, the watch dial engraved with \"ROBOTUS\", lifestyle UGC photo.",
      "A woman taking a selfie in the mirror while wearing a delicate gold necklace with a small pendant engraved \"ROBOTUS\", influencer-style photo.",
      "A man pouring coffee into a branded thermos bottle that has the word \"ROBOTUS\" printed on the side, natural candid shot.",
      "A woman outdoors holding a skincare serum bottle close to her face, the label reads \"ROBOTUS\", soft glow lighting, UGC style.",
      "A man holding wireless earbuds case near his ear with a casual smile, the case has the logo \"ROBOTUS\", modern lifestyle photo.",
      "A woman in a cozy living room applying lipstick, holding the lipstick tube with the brand name \"ROBOTUS\" visible, UGC photo.",
      "A man holding up a pair of running shoes while sitting on park stairs, the shoes show the logo \"ROBOTUS\" on the side, sporty UGC shot.",
      "A woman with a towel on her head applying face cream from a jar labeled \"ROBOTUS\", bathroom background.",
      "A man working on his laptop while sipping from a coffee mug printed with the word \"ROBOTUS\", casual work-from-home UGC."
    ]
  },
  {
    category: "ROBOTUS Tech & Accessories",
    prompts: [
      "A woman holding a scented candle close to her chest with a smile, the candle jar has the brand \"ROBOTUS\" on it, cozy aesthetic.",
      "A man wearing sunglasses while adjusting them, the side of the glasses engraved with \"ROBOTUS\", outdoor lifestyle shot.",
      "A woman holding a branded handbag over her shoulder while looking at the camera, the handbag has \"ROBOTUS\" embossed on it, street-style UGC.",
      "A man holding a smartwatch close to the camera, the screen displays the text \"ROBOTUS\", tech lifestyle UGC.",
      "A woman relaxing on her bed with headphones on, holding her phone with a case that reads \"ROBOTUS\", UGC style.",
      "A man applying cologne spray on his neck, the cologne bottle label says \"ROBOTUS\", stylish close-up UGC shot.",
      "A woman holding a stainless steel water bottle at the gym, the bottle has the word \"ROBOTUS\" printed, natural influencer photo.",
      "A man unboxing sneakers, the shoebox has a bold logo \"ROBOTUS\" on the lid, excited UGC photo.",
      "A woman holding mascara in one hand and smiling at the camera, the mascara tube has the brand \"ROBOTUS\", beauty UGC style.",
      "A man placing wireless speakers on a desk, the speaker grille has the logo \"ROBOTUS\" displayed, lifestyle tech UGC."
    ]
  },
  {
    category: "ROBOTUS Beauty & Personal Care",
    prompts: [
      "A woman wearing earrings, with a jewelry box next to her labeled \"ROBOTUS\", lifestyle UGC photo.",
      "A man holding a cologne box in one hand, the box has the name \"ROBOTUS\" in bold letters, UGC style shot.",
      "A woman smiling while holding an eyeshadow palette, the palette cover printed with \"ROBOTUS\", lifestyle influencer photo.",
      "A man outdoors adjusting his backpack straps, the backpack tag stitched with the name \"ROBOTUS\", candid UGC photo.",
      "A woman at a vanity desk applying foundation with a brush, the foundation bottle shows the label \"ROBOTUS\".",
      "A man sitting casually on a bench holding sunglasses, the case in his hand has the brand \"ROBOTUS\", lifestyle vibe.",
      "A woman holding a smartphone with a branded case that reads \"ROBOTUS\" while sipping coffee.",
      "A man adjusting headphones around his neck while holding the product box that says \"ROBOTUS\".",
      "A woman relaxing on a sofa holding a glass perfume bottle labeled \"ROBOTUS\" close to her cheek, UGC aesthetic.",
      "A man showing a leather wallet embossed with \"ROBOTUS\" while pulling out a credit card, lifestyle UGC shot."
    ]
  },
  {
    category: "Video & Animation",
    prompts: [
      "A time-lapse of a flower blooming from seed to full blossom with butterflies visiting",
      "Ocean waves gently lapping on a pristine beach during a golden sunset",
      "A cozy fireplace with crackling flames and floating embers on a snowy winter evening",
      "Rain drops creating ripples on a peaceful pond surrounded by lily pads",
      "A bustling city street from above with people and cars moving in fast motion",
      "Northern lights dancing across a starry sky reflected in a frozen lake",
      "A peaceful forest stream flowing over smooth rocks with dappled sunlight",
      "Clouds forming and dissolving in a blue sky with birds flying in formation",
      "A campfire at night with sparks floating up to meet the stars above",
      "Gentle snowfall in a quiet park with snow-covered benches and lamp posts"
    ]
  }
]

/**
 * Gets a random prompt from all categories
 */
export function getRandomPrompt(): string {
  const allPrompts = CREATIVE_PROMPTS.flatMap(category => category.prompts)
  const randomIndex = Math.floor(Math.random() * allPrompts.length)
  return allPrompts[randomIndex]
}

/**
 * Gets a random prompt from a specific category
 */
export function getRandomPromptFromCategory(categoryName: string): string {
  const category = CREATIVE_PROMPTS.find(cat => cat.category === categoryName)
  if (!category || category.prompts.length === 0) {
    return getRandomPrompt() // Fallback to any random prompt
  }
  
  const randomIndex = Math.floor(Math.random() * category.prompts.length)
  return category.prompts[randomIndex]
}

/**
 * Gets multiple random prompts (no duplicates)
 */
export function getRandomPrompts(count: number = 3): string[] {
  const allPrompts = CREATIVE_PROMPTS.flatMap(category => category.prompts)
  const shuffled = [...allPrompts].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, allPrompts.length))
}

/**
 * Gets a random video prompt specifically
 */
export function getRandomVideoPrompt(): string {
  const videoCategory = CREATIVE_PROMPTS.find(cat => cat.category === "Video & Animation")
  if (videoCategory && videoCategory.prompts.length > 0) {
    const randomIndex = Math.floor(Math.random() * videoCategory.prompts.length)
    return videoCategory.prompts[randomIndex]
  }
  // Fallback to any random prompt if video category not found
  return getRandomPrompt()
}

/**
 * Gets all available category names
 */
export function getCategories(): string[] {
  return CREATIVE_PROMPTS.map(category => category.category)
}
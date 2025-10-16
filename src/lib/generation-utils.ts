// Utility functions for handling generation types safely

export function getSafeGenerationType(desiredType: string, fallbackType: string = 'TEXT_TO_IMAGE'): string {
  // List of valid generation types that are guaranteed to exist in the database
  const validTypes = [
    'TEXT_TO_IMAGE',
    'IMAGE_TO_IMAGE', 
    'TEXT_TO_VIDEO',
    'IMAGE_TO_VIDEO',
    'LIPSYNC'
  ]
  
  // If the desired type is valid, use it
  if (validTypes.includes(desiredType)) {
    return desiredType
  }
  
  // Otherwise, use the fallback
  return fallbackType
}

export function isUpscaleGeneration(generation: any): boolean {
  // Check if this is an upscale generation by looking at the model
  return generation.model === 'image-upscaler' || generation.prompt?.toLowerCase().includes('upscal')
}

export function isEnhanceGeneration(generation: any): boolean {
  // Check if this is an enhance generation by looking at the model
  return generation.model === 'topaz/upscale/image' || generation.type === 'IMAGE_ENHANCEMENT'
}

export function isReimagineGeneration(generation: any): boolean {
  // Check if this is a reimagine generation by looking at the model or type
  return generation.model === 'higgsfield/soul/image-to-image' || generation.type === 'IMAGE_REIMAGINE'
}

export function getUpscaleTitle(generation: any): string {
  if (isUpscaleGeneration(generation)) {
    return `Upscaled Image - ${new Date().toLocaleDateString()}`
  }
  if (isEnhanceGeneration(generation)) {
    return `Enhanced Image - ${new Date().toLocaleDateString()}`
  }
  if (isReimagineGeneration(generation)) {
    return `Reimagined Image - ${new Date().toLocaleDateString()}`
  }
  return generation.prompt
}

// Duration validation and mapping function
export function validateAndMapVideoDuration(
  requestedDuration: number, 
  videoModel: 'WAN_2_5' | 'VEO3_FAST' = 'WAN_2_5'
): { duration: number; message?: string } {
  const minDuration = 5
  const maxDuration = videoModel === 'VEO3_FAST' ? 8 : 10
  
  if (requestedDuration < minDuration) {
    return {
      duration: minDuration,
      message: `The minimum video duration is ${minDuration} seconds. I'll create a ${minDuration}-second video instead.`
    }
  }
  
  if (requestedDuration > maxDuration) {
    return {
      duration: maxDuration,
      message: `The maximum video duration for ${videoModel === 'VEO3_FAST' ? 'Google VEO3-Fast' : 'Alibaba WAN-2.5'} is ${maxDuration} seconds. I'll create a ${maxDuration}-second video instead.`
    }
  }
  
  return { duration: requestedDuration }
}

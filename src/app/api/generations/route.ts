import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WavespeedService, KieService, WanService } from '@/lib/ai-services'
import { downloadAndSaveImage, downloadAndSaveVideo } from '@/lib/media-storage'
import { GenerationStatus, GenerationType } from '@/types'
import { getUpscaleTitle } from '@/lib/generation-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const generationId = url.searchParams.get('id')

    if (!generationId) {
      return NextResponse.json(
        { error: 'Generation ID is required' },
        { status: 400 }
      )
    }

    // Get generation from database
    const generation = await prisma.generation.findFirst({
      where: {
        id: generationId,
        message: {
          chat: {
            userId: session.user.id,
          },
        },
      },
    })

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      )
    }

    // If already completed or failed, return current status
    if (generation.status === 'COMPLETED' || generation.status === 'FAILED') {
      return NextResponse.json({ generation })
    }

    // Check status with the provider
    try {
      let resultUrl: string | undefined
      let resultUrls: string[] = []
      let status: GenerationStatus = generation.status
      let error: string | undefined

      if (generation.provider === 'wavespeed' && generation.requestId) {
        const result = await WavespeedService.getResult(generation.requestId)
        
        if (result.data.status === 'completed') {
          status = 'COMPLETED'
          if (result.data.outputs && result.data.outputs.length > 0) {
            resultUrls = result.data.outputs
            resultUrl = result.data.outputs[0]
            
            // Save to permanent storage - check if it's a video or image
            try {
              if (generation.type === 'LIPSYNC' as GenerationType || 
                  generation.type === 'TEXT_TO_VIDEO' as GenerationType || 
                  generation.type === 'IMAGE_TO_VIDEO' as GenerationType) {
                // Save video results
                for (const videoUrl of result.data.outputs) {
                  await downloadAndSaveVideo(
                    session.user.id,
                    videoUrl,
                    generation.prompt,
                    generation.id,
                    `Generated Video - ${new Date().toLocaleDateString()}`
                  )
                }
              } else {
                // Save image results (including upscaled images)
                const title = getUpscaleTitle(generation)
                
                for (const imageUrl of result.data.outputs) {
                  await downloadAndSaveImage(
                    session.user.id,
                    imageUrl,
                    title,
                    generation.id
                  )
                }
              }
            } catch (saveError) {
              console.error('Error saving generated content:', saveError)
            }
          }
        } else if (result.data.status === 'failed') {
          status = 'FAILED'
          error = result.data.error || 'Generation failed'
        }
      } else if (generation.provider === 'kie' && generation.taskId) {
        console.log('🎬 Checking KIE video result for taskId:', generation.taskId) // Debug log
        const result = await KieService.getVideoResult(generation.taskId)
        
        console.log('🎬 KIE API response:', JSON.stringify(result, null, 2)) // Debug log
        
        if (result.code === 200) {
          // Check new response structure with successFlag and response.resultUrls
          if (result.data.successFlag === 1 && result.data.response?.resultUrls && result.data.response.resultUrls.length > 0) {
            status = 'COMPLETED'
            resultUrl = result.data.response.resultUrls[0]
            resultUrls = result.data.response.resultUrls
            
            console.log('🎬 Video completed! URLs:', resultUrls) // Debug log
            
            // Save video to permanent storage
            try {
              const savedVideoId = await downloadAndSaveVideo(
                session.user.id,
                resultUrl,
                generation.prompt,
                generation.id,
                `Generated Video - ${new Date().toLocaleDateString()}`
              )
              console.log('🎬 Video saved to storage with ID:', savedVideoId) // Debug log
            } catch (saveError) {
              console.error('Error saving generated video:', saveError)
            }
          } else if (result.data.successFlag === 0) {
            // Check if there's an actual error message
            if (result.data.errorMessage) {
              status = 'FAILED'
              error = result.data.errorMessage
              console.log('🎬 Video generation failed:', error) // Debug log
            } else {
              // Still processing - successFlag 0 without error means in progress
              console.log('🎬 Video still processing...') // Debug log
            }
          } else if (result.data.successFlag !== 1 && (result.data.errorCode || result.data.errorMessage)) {
            // Handle any non-success status with error information
            status = 'FAILED'
            error = result.data.errorMessage || `Error code: ${result.data.errorCode}`
            console.log('🎬 Video generation failed with error:', error) // Debug log
          } else {
            // Still processing
            console.log('🎬 Video still processing...') // Debug log
          }
        } else {
          console.log('🎬 KIE API returned error code:', result.code, result.msg) // Debug log
        }
      }

      // Update generation in database
      const updatedGeneration = await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status,
          resultUrl,
          resultUrls,
          error,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ generation: updatedGeneration })

    } catch (error) {
      console.error('Error checking generation status:', error)
      
      // Update as failed
      const updatedGeneration = await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          error: 'Failed to check generation status',
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ generation: updatedGeneration })
    }

  } catch (error) {
    console.error('Generations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get all pending generations for a user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all pending generations for this user, plus recently completed ones
    const pendingGenerations = await prisma.generation.findMany({
      where: {
        OR: [
          { status: 'PROCESSING' },
          { 
            status: 'COMPLETED',
            updatedAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          }
        ],
        message: {
          chat: {
            userId: session.user.id,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    console.log('🔍 Found pending generations:', pendingGenerations.length)
    pendingGenerations.forEach(gen => {
      console.log(`- ${gen.id} (${gen.provider}/${gen.model}) - RequestId: ${gen.requestId}`)
    })

    const results = []

    // Check status for each pending generation
    for (const generation of pendingGenerations) {
      try {
        let resultUrl: string | undefined
        let resultUrls: string[] = []
        let status: GenerationStatus = generation.status
        let error: string | undefined

        // If already completed, just return it as-is
        if (generation.status === 'COMPLETED') {
          console.log('✅ Found completed generation:', generation.id, 'ResultUrl:', generation.resultUrl, 'ResultUrls:', generation.resultUrls)
          resultUrl = generation.resultUrl || undefined
          resultUrls = generation.resultUrls || []
          status = generation.status
          error = generation.error || undefined
        } else if (generation.provider === 'wavespeed' && generation.model === 'wan-2.5' && generation.requestId) {
          try {
            console.log('🎬 Batch checking WAN-2.5 video result for requestId:', generation.requestId)
            const result = await WavespeedService.getResult(generation.requestId)
            
            console.log('🎬 Batch WAN-2.5 API response:', JSON.stringify(result, null, 2))
            
            // WAN-2.5 uses the same response structure as other Wavespeed endpoints
            if (result.data.status === 'completed' && result.data.outputs && result.data.outputs.length > 0) {
              status = 'COMPLETED'
              resultUrl = result.data.outputs[0]
              resultUrls = result.data.outputs
              
              console.log('🎬 Batch WAN-2.5 video completed! URLs:', resultUrls)
              
              // Save video to permanent storage
              try {
                const savedVideoId = await downloadAndSaveVideo(
                  session.user.id,
                  resultUrl,
                  generation.prompt,
                  generation.id,
                  `Generated Video - ${new Date().toLocaleDateString()}`
                )
                console.log('🎬 Batch WAN-2.5 video saved to storage with ID:', savedVideoId)
              } catch (saveError) {
                console.error('Error saving generated WAN-2.5 video:', saveError)
              }
            } else if (result.data.status === 'failed') {
              status = 'FAILED'
              error = result.data.error || 'WAN-2.5 video generation failed'
              console.log('🎬 Batch WAN-2.5 video generation failed:', error)
            } else {
              // Still processing
              console.log('🎬 Batch WAN-2.5 video still processing...')
            }
          } catch (wanError) {
            console.error('Error checking WAN-2.5 generation:', wanError)
            // Mark as failed if there's an error checking the result
            status = 'FAILED'
            error = wanError instanceof Error ? wanError.message : 'Failed to check WAN-2.5 generation status'
          }
        } else if (generation.provider === 'wavespeed' && generation.requestId && generation.model !== 'wan-2.5') {
          try {
            console.log('🔄 Checking Wavespeed generation:', generation.requestId, 'Model:', generation.model)
            const result = await WavespeedService.getResult(generation.requestId)
            console.log('📊 Wavespeed result:', JSON.stringify(result, null, 2))
          
            if (result.data.status === 'completed') {
              status = 'COMPLETED'
              if (result.data.outputs && result.data.outputs.length > 0) {
                resultUrls = result.data.outputs
                resultUrl = result.data.outputs[0]
                
                // Save to permanent storage - check if it's a video or image
                try {
                  if (generation.type === 'LIPSYNC' as GenerationType || 
                      generation.type === 'TEXT_TO_VIDEO' as GenerationType || 
                      generation.type === 'IMAGE_TO_VIDEO' as GenerationType) {
                    // Save video results
                    for (const videoUrl of result.data.outputs) {
                      await downloadAndSaveVideo(
                        session.user.id,
                        videoUrl,
                        generation.prompt,
                        generation.id,
                        `Generated Video - ${new Date().toLocaleDateString()}`
                      )
                    }
                  } else {
                    // Save regular image results (including upscaled images)
                    const title = getUpscaleTitle(generation)
                    
                    for (const imageUrl of result.data.outputs) {
                      await downloadAndSaveImage(
                        session.user.id,
                        imageUrl,
                        title,
                        generation.id
                      )
                    }
                  }
                } catch (saveError) {
                  console.error('Error saving generated content:', saveError)
                }
              }
            } else if (result.data.status === 'failed') {
              status = 'FAILED'
              error = result.data.error || 'Generation failed'
            }
          } catch (wavespeedError) {
            console.error('Error checking Wavespeed generation:', wavespeedError)
            // Mark as failed if there's an error checking the result
            status = 'FAILED'
            error = wavespeedError instanceof Error ? wavespeedError.message : 'Failed to check generation status'
          }
        } else if (generation.provider === 'kie' && generation.taskId) {
          console.log('🎬 Batch checking KIE video result for taskId:', generation.taskId) // Debug log
          const result = await KieService.getVideoResult(generation.taskId)
          
          console.log('🎬 Batch KIE API response:', JSON.stringify(result, null, 2)) // Debug log
          
          if (result.code === 200) {
            // Check new response structure with successFlag and response.resultUrls
            if (result.data.successFlag === 1 && result.data.response?.resultUrls && result.data.response.resultUrls.length > 0) {
              status = 'COMPLETED'
              resultUrl = result.data.response.resultUrls[0]
              resultUrls = result.data.response.resultUrls
              
              console.log('🎬 Batch video completed! URLs:', resultUrls) // Debug log
              
              // Save video to permanent storage
              try {
                const savedVideoId = await downloadAndSaveVideo(
                  session.user.id,
                  resultUrl,
                  generation.prompt,
                  generation.id,
                  `Generated Video - ${new Date().toLocaleDateString()}`
                )
                console.log('🎬 Batch video saved to storage with ID:', savedVideoId) // Debug log
              } catch (saveError) {
                console.error('Error saving generated video:', saveError)
              }
            } else if (result.data.successFlag === 0) {
              // Check if there's an actual error message
              if (result.data.errorMessage) {
                status = 'FAILED'
                error = result.data.errorMessage
                console.log('🎬 Batch video generation failed:', error) // Debug log
              } else {
                // Still processing - successFlag 0 without error means in progress
                console.log('🎬 Batch video still processing...') // Debug log
              }
            } else if (result.data.successFlag !== 1 && (result.data.errorCode || result.data.errorMessage)) {
              // Handle any non-success status with error information
              status = 'FAILED'
              error = result.data.errorMessage || `Error code: ${result.data.errorCode}`
              console.log('🎬 Batch video generation failed with error:', error) // Debug log
            } else {
              // Still processing
              console.log('🎬 Batch video still processing...') // Debug log
            }
          } else {
            console.log('🎬 Batch KIE API returned error code:', result.code, result.msg) // Debug log
          }
        }

        // Update generation in database if status changed
        if (status !== generation.status) {
          const updatedGeneration = await prisma.generation.update({
            where: { id: generation.id },
            data: {
              status,
              resultUrl,
              resultUrls,
              error,
              updatedAt: new Date(),
            },
          })
          results.push(updatedGeneration)
        } else {
          // For completed generations, return the current state
          results.push({
            ...generation,
            resultUrl,
            resultUrls,
            status,
            error
          })
        }

      } catch (error) {
        console.error(`Error checking generation ${generation.id}:`, error)
        results.push(generation)
      }
    }

    console.log('📤 Returning generations result:', results.length, 'generations')
    return NextResponse.json({ generations: results })

  } catch (error) {
    console.error('Generations batch check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Clear all pending generations for a user
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🧹 Clearing generation queue for user:', session.user.id)
    
    // Find all PROCESSING and recently COMPLETED generations for this user
    const generationsToClear = await prisma.generation.findMany({
      where: {
        OR: [
          { status: 'PROCESSING' },
          { 
            status: 'COMPLETED',
            updatedAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          }
        ],
        message: {
          chat: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
        provider: true,
        model: true,
        status: true,
        requestId: true,
        taskId: true,
        createdAt: true
      }
    })
    
    console.log(`Found ${generationsToClear.length} generations to clear:`)
    generationsToClear.forEach(gen => {
      console.log(`- ${gen.id} (${gen.provider}/${gen.model}) - Status: ${gen.status}, RequestId: ${gen.requestId}, TaskId: ${gen.taskId}, Created: ${gen.createdAt}`)
    })
    
    if (generationsToClear.length === 0) {
      console.log('✅ No generations found. Queue is already clear.')
      return NextResponse.json({ 
        message: 'No generations found',
        cleared: 0 
      })
    }
    
    // Mark all PROCESSING and recently COMPLETED generations as FAILED
    const result = await prisma.generation.updateMany({
      where: {
        OR: [
          { status: 'PROCESSING' },
          { 
            status: 'COMPLETED',
            updatedAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          }
        ],
        message: {
          chat: {
            userId: session.user.id,
          },
        },
      },
      data: {
        status: 'FAILED',
        error: 'Queue cleared - generation was cancelled by user',
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ Cleared ${result.count} generations from the queue`)
    
    return NextResponse.json({ 
      message: `Cleared ${result.count} generations from queue`,
      cleared: result.count 
    })
    
  } catch (error) {
    console.error('Error clearing generation queue:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
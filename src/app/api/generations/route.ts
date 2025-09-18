import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WavespeedService, KieService } from '@/lib/ai-services'
import { downloadAndSaveImage, downloadAndSaveVideo } from '@/lib/media-storage'
import { GenerationStatus, GenerationType } from '@/types'

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
            
            // Save images to permanent storage
            try {
              for (const imageUrl of result.data.outputs) {
                await downloadAndSaveImage(
                  session.user.id,
                  imageUrl,
                  generation.prompt,
                  generation.id
                )
              }
            } catch (saveError) {
              console.error('Error saving generated images:', saveError)
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
            status = 'FAILED'
            error = result.data.errorMessage || 'Video generation failed'
            console.log('🎬 Video generation failed:', error) // Debug log
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

    // Get all pending generations for this user
    const pendingGenerations = await prisma.generation.findMany({
      where: {
        status: 'PROCESSING',
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

    const results = []

    // Check status for each pending generation
    for (const generation of pendingGenerations) {
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
              
              // Save to permanent storage - check if it's a lipsync video or image
              try {
                if (generation.type === 'LIPSYNC' as GenerationType) {
                  // Save lipsync result as video
                  for (const videoUrl of result.data.outputs) {
                    await downloadAndSaveVideo(
                      session.user.id,
                      videoUrl,
                      generation.prompt,
                      generation.id,
                      `Lipsync Video - ${new Date().toLocaleDateString()}`
                    )
                  }
                } else {
                  // Save regular image results
                  for (const imageUrl of result.data.outputs) {
                    await downloadAndSaveImage(
                      session.user.id,
                      imageUrl,
                      generation.prompt,
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
              status = 'FAILED'
              error = result.data.errorMessage || 'Video generation failed'
              console.log('🎬 Batch video generation failed:', error) // Debug log
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
          results.push(generation)
        }

      } catch (error) {
        console.error(`Error checking generation ${generation.id}:`, error)
        results.push(generation)
      }
    }

    return NextResponse.json({ generations: results })

  } catch (error) {
    console.error('Generations batch check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
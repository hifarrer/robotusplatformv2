import { PrismaClient, GenerationType, TransactionType } from '@prisma/client'
import { calculateGenerationCost } from './credit-costs'

const prisma = new PrismaClient()

/**
 * Check if user has enough credits
 */
export async function hasEnoughCredits(
  userId: string,
  cost: number
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return user.credits >= cost
}

/**
 * Deduct credits from user account
 */
export async function deductCredits(
  userId: string,
  amount: number,
  generationType: GenerationType,
  description: string,
  metadata?: any
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get current user credits
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      })

      if (!user) {
        throw new Error('User not found')
      }

      if (user.credits < amount) {
        throw new Error('Insufficient credits')
      }

      // Deduct credits
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: amount,
          },
        },
      })

      // Record transaction
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          balance: updatedUser.credits,
          type: 'DEBIT' as TransactionType,
          generationType,
          description,
          metadata,
        },
      })

      return {
        success: true,
        newBalance: updatedUser.credits,
      }
    })

    return result
  } catch (error) {
    return {
      success: false,
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Add credits to user account
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: TransactionType = 'CREDIT',
  description: string,
  metadata?: any
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: amount,
          },
        },
      })

      await tx.creditTransaction.create({
        data: {
          userId,
          amount,
          balance: updatedUser.credits,
          type,
          description,
          metadata,
        },
      })

      return {
        success: true,
        newBalance: updatedUser.credits,
      }
    })

    return result
  } catch (error) {
    return {
      success: false,
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Refund credits to user account
 */
export async function refundCredits(
  userId: string,
  amount: number,
  description: string,
  metadata?: any
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  return addCredits(userId, amount, 'REFUND', description, metadata)
}

/**
 * Get user's credit balance
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return user.credits
}

/**
 * Get user's transaction history
 */
export async function getCreditTransactions(
  userId: string,
  limit: number = 50
) {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Check and deduct credits for a generation
 */
export async function checkAndDeductCreditsForGeneration(
  userId: string,
  generationType: GenerationType,
  durationSeconds?: number
): Promise<{ success: boolean; cost: number; newBalance?: number; error?: string }> {
  try {
    // Calculate cost
    const cost = calculateGenerationCost(generationType, durationSeconds)

    // Check if user has enough credits
    const hasCredits = await hasEnoughCredits(userId, cost)
    if (!hasCredits) {
      return {
        success: false,
        cost,
        error: `Insufficient credits. Required: ${cost}`,
      }
    }

    // Deduct credits
    const result = await deductCredits(
      userId,
      cost,
      generationType,
      `${generationType} generation${durationSeconds ? ` (${durationSeconds}s)` : ''}`,
      { generationType, durationSeconds }
    )

    return {
      success: result.success,
      cost,
      newBalance: result.newBalance,
      error: result.error,
    }
  } catch (error) {
    return {
      success: false,
      cost: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Upgrade user to a new plan
 */
export async function upgradePlan(
  userId: string,
  planName: string,
  billingCycle: 'monthly' | 'yearly'
): Promise<{ success: boolean; error?: string }> {
  try {
    const plan = await prisma.plan.findUnique({
      where: { name: planName },
    })

    if (!plan) {
      throw new Error('Plan not found')
    }

    // Update user's plan and add credits
    await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          planId: plan.id,
          credits: {
            increment: plan.credits,
          },
        },
      })

      // Record transaction
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: plan.credits,
          balance: updatedUser.credits,
          type: 'PURCHASE',
          description: `Upgraded to ${plan.name} plan (${billingCycle})`,
          metadata: {
            planId: plan.id,
            planName: plan.name,
            billingCycle,
            price: billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice,
          },
        },
      })
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}


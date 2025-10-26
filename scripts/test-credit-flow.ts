#!/usr/bin/env tsx

/**
 * Test script to verify credit application flow
 * This script simulates the webhook flow to ensure credits are properly applied
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCreditFlow() {
  console.log('🧪 Testing Credit Application Flow...\n')

  try {
    // Find a test user (you can modify this to use a specific user)
    const testUser = await prisma.user.findFirst({
      where: {
        email: {
          contains: 'test',
        },
      },
      include: {
        plan: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!testUser) {
      console.log('❌ No test user found. Please create a test user first.')
      return
    }

    console.log(`👤 Testing with user: ${testUser.email}`)
    console.log(`💰 Current credits: ${testUser.credits}`)
    console.log(`📋 Current plan: ${testUser.plan?.name || 'No plan'}`)
    console.log(`📊 Recent transactions: ${testUser.transactions.length}`)

    // Test 1: Simulate credit purchase webhook
    console.log('\n🔬 Test 1: Simulating credit purchase webhook...')
    
    const creditPackage = {
      credits: 250,
      price: 10,
      name: '250 Credits (Test)',
      priceId: 'test_price_id',
    }

    const sessionId = `test_session_${Date.now()}`
    const initialCredits = testUser.credits

    // Simulate the webhook transaction
    await prisma.$transaction(async (tx) => {
      // Check for existing transaction (idempotency)
      const existingTransaction = await tx.creditTransaction.findFirst({
        where: {
          userId: testUser.id,
          type: 'PURCHASE',
          metadata: {
            path: ['sessionId'],
            equals: sessionId,
          },
        },
      })

      if (existingTransaction) {
        console.log('⚠️  Transaction already processed (idempotency check passed)')
        return
      }

      // Get current user credits
      const user = await tx.user.findUnique({
        where: { id: testUser.id },
        select: { credits: true },
      })

      if (!user) {
        throw new Error(`User not found: ${testUser.id}`)
      }

      const newCredits = user.credits + creditPackage.credits

      // Update user credits
      await tx.user.update({
        where: { id: testUser.id },
        data: {
          credits: newCredits,
        },
      })

      // Create credit transaction record
      await tx.creditTransaction.create({
        data: {
          userId: testUser.id,
          amount: creditPackage.credits,
          balance: newCredits,
          type: 'PURCHASE',
          description: `Test: Purchased ${creditPackage.name}`,
          metadata: {
            priceId: creditPackage.priceId,
            packageName: creditPackage.name,
            sessionId: sessionId,
            paymentIntentId: 'test_payment_intent',
            amountPaid: creditPackage.price * 100, // Convert to cents
            currency: 'usd',
            testRun: true,
          },
        },
      })

      console.log(`✅ Credits added: ${creditPackage.credits}`)
      console.log(`💰 New balance: ${newCredits}`)
    })

    // Verify the transaction
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { credits: true },
    })

    const expectedCredits = initialCredits + creditPackage.credits
    if (updatedUser?.credits === expectedCredits) {
      console.log('✅ Test 1 PASSED: Credits correctly applied')
    } else {
      console.log(`❌ Test 1 FAILED: Expected ${expectedCredits}, got ${updatedUser?.credits}`)
    }

    // Test 2: Test idempotency (run the same transaction again)
    console.log('\n🔬 Test 2: Testing idempotency (duplicate transaction)...')
    
    const creditsBeforeIdempotencyTest = updatedUser?.credits || 0

    await prisma.$transaction(async (tx) => {
      // Check for existing transaction (idempotency)
      const existingTransaction = await tx.creditTransaction.findFirst({
        where: {
          userId: testUser.id,
          type: 'PURCHASE',
          metadata: {
            path: ['sessionId'],
            equals: sessionId,
          },
        },
      })

      if (existingTransaction) {
        console.log('✅ Idempotency check passed - transaction already exists')
        return
      }

      // This should not execute
      throw new Error('Idempotency check failed!')
    })

    const creditsAfterIdempotencyTest = (await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { credits: true },
    }))?.credits || 0

    if (creditsBeforeIdempotencyTest === creditsAfterIdempotencyTest) {
      console.log('✅ Test 2 PASSED: Idempotency working correctly')
    } else {
      console.log('❌ Test 2 FAILED: Credits changed during idempotency test')
    }

    // Test 3: Check transaction history
    console.log('\n🔬 Test 3: Checking transaction history...')
    
    const recentTransactions = await prisma.creditTransaction.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })

    const testTransaction = recentTransactions.find(t => 
      t.metadata && 
      typeof t.metadata === 'object' && 
      'testRun' in t.metadata
    )

    if (testTransaction) {
      console.log('✅ Test 3 PASSED: Transaction record created correctly')
      console.log(`📝 Transaction details:`)
      console.log(`   - Amount: ${testTransaction.amount}`)
      console.log(`   - Balance: ${testTransaction.balance}`)
      console.log(`   - Type: ${testTransaction.type}`)
      console.log(`   - Description: ${testTransaction.description}`)
    } else {
      console.log('❌ Test 3 FAILED: Test transaction not found in history')
    }

    console.log('\n🎉 Credit flow test completed!')
    console.log(`📊 Final credit balance: ${creditsAfterIdempotencyTest}`)

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testCreditFlow()

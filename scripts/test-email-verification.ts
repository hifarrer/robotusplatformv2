import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testEmailVerification() {
  try {
    console.log('Testing email verification system...')
    
    // Check if we have any users with unverified emails
    const unverifiedUsers = await prisma.user.findMany({
      where: {
        emailVerified: null,
        password: { not: null } // Only users with passwords (not OAuth users)
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true
      }
    })

    console.log(`Found ${unverifiedUsers.length} users with unverified emails:`)
    unverifiedUsers.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Created: ${user.createdAt}`)
    })

    // Check verification tokens
    const verificationTokens = await prisma.verificationToken.findMany({
      select: {
        identifier: true,
        token: true,
        expires: true
      }
    })

    console.log(`\nFound ${verificationTokens.length} verification tokens:`)
    verificationTokens.forEach(token => {
      const isExpired = token.expires < new Date()
      console.log(`- ${token.identifier} - Expires: ${token.expires} ${isExpired ? '(EXPIRED)' : '(VALID)'}`)
    })

    // Clean up expired tokens
    const expiredTokens = await prisma.verificationToken.deleteMany({
      where: {
        expires: {
          lt: new Date()
        }
      }
    })

    if (expiredTokens.count > 0) {
      console.log(`\nCleaned up ${expiredTokens.count} expired verification tokens`)
    }

  } catch (error) {
    console.error('Error testing email verification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEmailVerification()

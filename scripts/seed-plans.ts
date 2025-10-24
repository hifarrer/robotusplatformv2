import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const plans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    credits: 60,
    description: 'Perfect for getting started with AI content generation',
    isActive: true,
  },
  {
    name: 'Basic',
    monthlyPrice: 15,
    yearlyPrice: 210,
    credits: 500,
    description: 'Ideal for regular content creators',
    isActive: true,
  },
  {
    name: 'Premium',
    monthlyPrice: 29,
    yearlyPrice: 290,
    credits: 1200,
    description: 'Best for power users and professionals',
    isActive: true,
  },
]

async function main() {
  console.log('🌱 Seeding plans...')

  // Create or update plans
  for (const planData of plans) {
    const plan = await prisma.plan.upsert({
      where: { name: planData.name },
      update: planData,
      create: planData,
    })
    console.log(`✓ ${plan.name} plan created/updated`)
  }

  // Get the Free plan
  const freePlan = await prisma.plan.findUnique({
    where: { name: 'Free' },
  })

  if (!freePlan) {
    throw new Error('Free plan not found')
  }

  // Assign all users without a plan to the Free plan
  const usersWithoutPlan = await prisma.user.findMany({
    where: {
      planId: null,
    },
  })

  console.log(`\n📋 Found ${usersWithoutPlan.length} users without a plan`)

  for (const user of usersWithoutPlan) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        planId: freePlan.id,
        credits: 60, // Set initial credits for Free plan
      },
    })
    console.log(`✓ Assigned Free plan to user: ${user.email}`)
  }

  console.log('\n✨ Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


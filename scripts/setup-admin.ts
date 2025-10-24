import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Setting up admin user and plans...')

  // Create admin user
  const adminEmail = 'admin@robotus.ai'
  const adminPassword = 'p@ssw0rd123'

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    console.log('✓ Admin user already exists')
    console.log('  Email: admin@robotus.ai')
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Administrator',
        password: hashedPassword,
        role: 'ADMIN',
        credits: 999999,
      },
    })
    console.log('✓ Admin user created')
    console.log('  Email: admin@robotus.ai')
    console.log('  Password: p@ssw0rd123')
  }

  // Update plans with Stripe IDs and features
  const plans = [
    {
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      stripeMonthlyPriceId: null,
      stripeYearlyPriceId: null,
      credits: 60,
      description: 'Perfect for getting started with AI content generation',
      features: [
        '60 Credits',
        'All AI models',
        'Community support',
        'Basic features'
      ],
      isActive: true,
    },
    {
      name: 'Basic',
      monthlyPrice: 15,
      yearlyPrice: 210,
      stripeMonthlyPriceId: null, // Add your Stripe price ID here
      stripeYearlyPriceId: null,  // Add your Stripe price ID here
      credits: 500,
      description: 'Ideal for regular content creators',
      features: [
        '500 Credits',
        'All AI models',
        'Priority support',
        'Advanced features',
        'API access'
      ],
      isActive: true,
    },
    {
      name: 'Premium',
      monthlyPrice: 29,
      yearlyPrice: 290,
      stripeMonthlyPriceId: null, // Add your Stripe price ID here
      stripeYearlyPriceId: null,  // Add your Stripe price ID here
      credits: 1200,
      description: 'Best for power users and professionals',
      features: [
        '1200 Credits',
        'All AI models',
        'Priority support',
        'Advanced features',
        'API access',
        'Early access to features',
        'Custom solutions'
      ],
      isActive: true,
    },
  ]

  for (const planData of plans) {
    await prisma.plan.upsert({
      where: { name: planData.name },
      update: planData,
      create: planData,
    })
    console.log(`✓ ${planData.name} plan updated with Stripe IDs and features`)
  }

  console.log('\n✨ Setup completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error setting up admin:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


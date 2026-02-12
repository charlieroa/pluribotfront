import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [email, password, name] = process.argv.slice(2)

  if (!email || !password || !name) {
    console.error('Usage: npx tsx server/src/scripts/seedAdmin.ts <email> <password> <name>')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    // Update existing user to superadmin
    await prisma.user.update({
      where: { email },
      data: { role: 'superadmin' },
    })
    console.log(`User ${email} updated to superadmin`)
  } else {
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'superadmin',
        planId: 'enterprise',
        onboardingDone: true,
      },
    })
    console.log(`Superadmin created: ${email}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

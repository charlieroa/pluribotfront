import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } })
console.log('USERS:', JSON.stringify(users, null, 2))

const bots = await prisma.userBot.findMany({ select: { userId: true, botId: true, isActive: true } })
console.log('USER_BOTS:', JSON.stringify(bots, null, 2))

await prisma.$disconnect()

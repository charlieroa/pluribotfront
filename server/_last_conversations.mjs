import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const conversations = await prisma.conversation.findMany({
  orderBy: { createdAt: 'desc' },
  take: 5,
  select: {
    id: true,
    title: true,
    createdAt: true,
    messages: {
      orderBy: { createdAt: 'asc' },
      take: 12,
      select: { sender: true, text: true, type: true, createdAt: true }
    }
  }
})
console.log(JSON.stringify(conversations, null, 2))
await prisma.$disconnect()

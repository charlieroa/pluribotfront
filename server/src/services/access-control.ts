import { prisma } from '../db/client.js'

export interface ActorContext {
  id: string
  role: string
  organizationId: string | null
  planId: string
}

export async function getActorContext(userId: string): Promise<ActorContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      organizationId: true,
      planId: true,
    },
  })

  if (!user) return null

  return {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId,
    planId: user.planId,
  }
}

export async function findAccessibleProject(projectId: string, userId: string) {
  const actor = await getActorContext(userId)
  if (!actor) return null

  return prisma.project.findFirst({
    where: {
      id: projectId,
      ...(actor.role === 'superadmin'
        ? {}
        : actor.organizationId && ['org_admin', 'agent'].includes(actor.role)
          ? { user: { organizationId: actor.organizationId } }
          : { userId: actor.id }),
    },
    include: {
      user: {
        select: {
          id: true,
          planId: true,
          organizationId: true,
        },
      },
    },
  })
}

export async function findAccessibleDeliverable(deliverableId: string, userId: string) {
  const actor = await getActorContext(userId)
  if (!actor) return null

  return prisma.deliverable.findFirst({
    where: {
      id: deliverableId,
      ...(actor.role === 'superadmin'
        ? {}
        : actor.organizationId && ['org_admin', 'agent'].includes(actor.role)
          ? { conversation: { user: { organizationId: actor.organizationId } } }
          : { conversation: { userId: actor.id } }),
    },
    include: {
      conversation: {
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              planId: true,
              organizationId: true,
            },
          },
        },
      },
    },
  })
}

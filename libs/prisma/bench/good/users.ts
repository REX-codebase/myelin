import { Prisma } from './generated/prisma/client'
import { prisma } from './db'

export async function getUser(id: number) {
  try {
    return await prisma.user.findUniqueOrThrow({ where: { id } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null
    }
    throw error
  }
}

export function usersByIds(ids: number[]) {
  return prisma.user.findMany({ where: { id: { in: ids } }, include: { posts: true } })
}

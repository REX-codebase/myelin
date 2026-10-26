import { NotFoundError } from '../generated/prisma/client'
import { prisma } from './db'

export async function getUser(id: number) {
  try {
    return await prisma.user.findUnique({
      where: { id },
      rejectOnNotFound: true,
    })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return null
    }
    throw error
  }
}

import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
  log: ['query', 'error'],
})

prisma.$use(async (params, next) => {
  const before = Date.now()
  const result = await next(params)
  console.log(`Query ${params.model}.${params.action} took ${Date.now() - before}ms`)
  return result
})

import express from 'express'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}).$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = Date.now()
        const result = await query(args)
        console.log(`Query ${model}.${operation} took ${Date.now() - start}ms`)
        return result
      },
    },
  },
})

const app = express()

app.get('/users', async (_req, res) => {
  res.json(await prisma.user.findMany())
})

const server = app.listen(3000)

process.on('SIGTERM', async () => {
  server.close()
  await prisma.$disconnect()
})

import express from 'express'
import { PrismaClient } from './generated/prisma'

const prisma = new PrismaClient()
const app = express()

app.get('/users', async (_req, res) => {
  res.json(await prisma.user.findMany())
})

prisma.$on('beforeExit', async () => {
  console.log('Prisma is shutting down')
})

app.listen(3000)

import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  engine: 'classic',
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
    directUrl: env('DIRECT_URL'),
  },
})

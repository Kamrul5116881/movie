import argon2 from 'argon2'
import { z } from 'zod'
import { prisma } from '../db.js'

const schema = z.object({
  email: z.string().email().max(190),
  password: z.string().min(12).max(200),
})

async function main() {
  const parsed = schema.parse({ email: process.argv[2], password: process.argv[3] })
  if (!parsed.email || !parsed.password) {
    console.error('Usage: tsx server/scripts/create-admin.ts <email> <password-min-12-chars>')
    process.exit(1)
  }
  const passwordHash = await argon2.hash(parsed.password, { type: argon2.argon2id })
  const user = await prisma.user.upsert({
    where: { email: parsed.email.toLowerCase() },
    create: { email: parsed.email.toLowerCase(), passwordHash, role: 'ADMIN' },
    update: { passwordHash, role: 'ADMIN' },
  })
  await prisma.auditLog.create({ data: { userId: user.id, action: 'admin.bootstrap', entity: 'user', entityId: String(user.id) } })
  console.log(`Admin ready: ${user.email}`)
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})

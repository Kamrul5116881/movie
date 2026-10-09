import { cpSync, existsSync } from 'node:fs'

const src = 'src/generated/prisma'
const dest = 'dist-server/src/generated/prisma'

if (!existsSync(src)) {
  console.error(`Prisma client not found at ${src}. Run "npm run db:generate" first.`)
  process.exit(1)
}

cpSync(src, dest, { recursive: true })
console.log(`Copied ${src} -> ${dest}`)

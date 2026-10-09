import { createHash, randomBytes, randomUUID } from 'node:crypto'
import argon2 from 'argon2'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from './db.js'
import { env } from './config.js'

const hashToken = (token: string) => createHash('sha256').update(`${token}:${env.SESSION_SECRET}`).digest('hex')
export async function login(email: string, password: string) { const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } }); if (!user || !(await argon2.verify(user.passwordHash, password))) return null; const token = randomBytes(32).toString('hex'); await prisma.session.create({ data: { id: randomUUID(), tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) } }); return { token, user: { id: user.id, email: user.email, role: user.role } } }
export async function currentUser(request: FastifyRequest) { const token = request.cookies.session; if (!token) return null; const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } }); if (!session || session.expiresAt < new Date()) return null; return session.user }
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) { const user = await currentUser(request); if (!user || user.role !== 'ADMIN') { await reply.code(401).send({ error: 'Admin authentication required' }); return null } return user }
export const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 }

import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials)
          
          const user = await prisma.user.findUnique({
            where: { email }
          })

          if (!user || !user.password) {
            return null
          }

          // Check if email is verified
          if (!user.emailVerified) {
            throw new Error('Please verify your email address before signing in.')
          }

          const isPasswordValid = await bcrypt.compare(password, user.password)
          
          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          }
        } catch (error) {
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/signin',
  },
  events: {
    async linkAccount({ user, account, profile }) {
      // This event is called when a new account is linked
      console.log('Account linked:', { userId: user.id, provider: account.provider })
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google OAuth, check if we need to link accounts
      if (account?.provider === 'google' && user.email) {
        try {
          // Check if there's an existing user with this email
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })

          if (existingUser) {
            // Check if Google account is already linked to this user
            const existingAccount = await prisma.account.findFirst({
              where: {
                userId: existingUser.id,
                provider: 'google'
              }
            })

            if (!existingAccount) {
              // Link the Google account to the existing user
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                }
              })
            }
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
          // Don't block the sign-in process
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // When user signs in, store their data in the token
      if (user) {
        token.id = user.id
        token.role = user.role
        token.name = user.name || undefined
        token.email = user.email || undefined
        token.image = user.image || undefined
      }
      
      // For OAuth providers, we might need to fetch additional user data
      if (account?.provider === 'google' && user?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
          })
          
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.name = dbUser.name || user.name || undefined
            token.email = dbUser.email
            token.image = dbUser.image || user.image || undefined
          }
        } catch (error) {
          console.error('Error fetching user data in JWT callback:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.image = token.image as string
      }
      return session
    },
  },
}
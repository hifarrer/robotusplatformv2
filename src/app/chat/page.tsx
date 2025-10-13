import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ChatInterface } from '@/components/chat-interface'

export default async function ChatPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user is admin and redirect to admin dashboard
  if (session.user.role === 'ADMIN') {
    redirect('/admin')
  }

  return <ChatInterface />
}
'use client'

import { signOut, useSession } from 'next-auth/react'
import { User, Settings, CreditCard, LogOut, Shield } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function UserMenu() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if user is admin
    if (session?.user?.email === 'admin@robotus.ai') {
      setIsAdmin(true)
    }
  }, [session])

  if (!session?.user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none focus:ring-2 focus:ring-primary rounded-full">
          <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
            <AvatarImage src={session.user.image || ''} />
            <AvatarFallback className="bg-gray-700 text-white">
              {session.user.name?.[0] || <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <>
            <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer text-red-500">
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Profile & Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/pricing')} className="cursor-pointer">
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Plans & Pricing</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => signOut({ callbackUrl: '/auth/signin' })} 
          className="cursor-pointer text-red-600 dark:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


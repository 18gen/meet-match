'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, X, Mail, Check } from 'lucide-react';
import type { User } from '@/app/page';

interface UserManagerProps {
  users: User[];
  onAddUser: (user: User) => void;
  onRemoveUser: (userId: string) => void;
}

export function UserManager({ users, onAddUser, onRemoveUser }: UserManagerProps) {
  const { data: session } = useSession();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsConnecting(true);
    try {
      const result = await signIn('google', { 
        callbackUrl: '/',
        redirect: false 
      });
      
      if (result?.ok && session) {
        const newUser: User = {
          id: session.user?.email || Date.now().toString(),
          email: session.user?.email || '',
          name: session.user?.name || session.user?.email?.split('@')[0] || '',
          avatar: session.user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${session.user?.email}`,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken
        };
        onAddUser(newUser);
      }
    } catch (error) {
      console.error('Google sign-in failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add User Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleGoogleSignIn}
          disabled={isConnecting}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isConnecting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Googleカレンダーで接続
            </>
          )}
        </Button>
      </div>

      {/* Connected Users */}
      {users.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              接続済みユーザー ({users.length})
            </h4>
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                    <Check className="h-3 w-3 mr-1" />
                    接続済み
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveUser(user.id)}
                    className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">まだユーザーが接続されていません</p>
          <p className="text-xs">開始するにはGmailアドレスを追加してください</p>
        </div>
      )}
    </div>
  );
}
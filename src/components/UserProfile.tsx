'use client';
import { useUser, SignOutButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  PopoverFooter,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function UserProfile() {
  const { user } = useUser();
  const navigate = useNavigate();

  if (!user) return null;

  // Get user's first name and email
  const firstName = user.firstName || 'User';
  const email = user.primaryEmailAddress?.emailAddress || '';
  const imageUrl = user.imageUrl;

  // Create initials from first name (or email if no name)
  const initials = firstName
    ? firstName.substring(0, 2).toUpperCase()
    : email.substring(0, 2).toUpperCase();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={imageUrl} alt={firstName} />
            <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-62 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border-gray-200 dark:border-zinc-700">
        <PopoverHeader>
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={imageUrl} alt={firstName} />
              <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <PopoverTitle className="text-gray-900 dark:text-white">{user.fullName || firstName}</PopoverTitle>
              <PopoverDescription className="text-xs text-gray-600 dark:text-gray-400">{email}</PopoverDescription>
            </div>
          </div>
        </PopoverHeader>
        <PopoverBody className="space-y-1 px-2 py-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white"
            size="sm"
            onClick={() => navigate('/profile')}
          >
            <User className="mr-2 h-4 w-4" />
            View Profile
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white"
            size="sm"
            onClick={() => navigate('/settings')}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </PopoverBody>
        <PopoverFooter>
          <SignOutButton redirectUrl="/">
            <Button 
              variant="outline" 
              className="w-full bg-transparent border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700" 
              size="sm"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </SignOutButton>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
}

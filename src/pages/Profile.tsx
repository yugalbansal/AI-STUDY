import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import { Camera, Mail, User as UserIcon, Calendar, Shield, Edit2, Save, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Profile() {
  const { user } = useUser();
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress || '';
  const imageUrl = user.imageUrl;
  const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'Unknown';

  const initials = (user.firstName || email)
    .substring(0, 2)
    .toUpperCase();

  const handleSaveName = async () => {
    if (!firstName.trim()) {
      toast.error('First name cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      toast.success('Profile updated successfully!');
      setIsEditingName(false);
    } catch (error) {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setIsEditingName(false);
  };

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setIsLoading(true);
      try {
        await user.setProfileImage({ file });
        toast.success('Profile picture updated successfully!');
      } catch (error) {
        toast.error('Failed to update profile picture. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <Helmet>
        <title>Profile - Vector Mind AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 relative">
            <div className="absolute -bottom-16 left-8">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-white dark:border-zinc-800 shadow-xl">
                  <AvatarImage src={imageUrl} alt={user.fullName || 'User'} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-3xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button 
                  onClick={handleImageUpload}
                  className="absolute bottom-2 right-2 bg-white dark:bg-zinc-700 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-20 pb-8 px-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                {isEditingName ? (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveName}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={handleCancel}
                        disabled={isLoading}
                        variant="outline"
                        className="dark:border-zinc-600 dark:text-gray-300"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {user.fullName || 'Welcome!'}
                      </h1>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                    {!user.firstName && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Click the edit icon to add your name
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Profile Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Member Since</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{createdAt}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Account Status</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="mt-6 bg-white dark:bg-zinc-800 rounded-3xl shadow-xl border border-gray-200 dark:border-zinc-700 p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Account Information</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">User ID</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{user.id.substring(0, 12)}...</span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">Email Verified</span>
              </div>
              <span className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                Verified
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

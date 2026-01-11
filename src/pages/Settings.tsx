import { useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { 
  Lock, 
  FileText, 
  HelpCircle,  
  Eye, 
  Trash2,
  ChevronRight,
  LucideIcon,
  Key,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SettingItem {
  icon: LucideIcon;
  label: string;
  description: string;
  variant: 'button' | 'badge' | 'link';
  action?: () => void | Promise<void>;
  loading?: boolean;
  badge?: string;
  href?: string;
  danger?: boolean;
}

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  if (!user) return null;

  const hasPassword = user.passwordEnabled;

  const handleResetPassword = async () => {
    if (!hasPassword) {
      // OAuth users don't have a password yet
      toast.info('You signed in with Google. Set a password to enable email/password login.', {
        duration: 4000,
      });
    }
    setShowPasswordModal(true);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsResettingPassword(true);
    try {
      if (hasPassword) {
        // User has a password, require current password
        await user.updatePassword({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        });
        toast.success('Password updated successfully!');
      } else {
        // OAuth user setting password for first time
        await user.updatePassword({
          newPassword: passwordData.newPassword,
        });
        toast.success('Password set successfully! You can now login with email/password.');
      }
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error?.errors?.[0]?.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:bansalyugal3@gmail.com?subject=Support Request - Vector Mind AI';
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword && hasPassword) {
      toast.error('Please enter your password to confirm deletion');
      return;
    }

    setIsDeleting(true);
    try {
      // For users with password, verify it first
      if (hasPassword && deletePassword) {
        try {
          await user.updatePassword({
            currentPassword: deletePassword,
            newPassword: deletePassword, // Same password, just to verify
          });
        } catch (error) {
          toast.error('Incorrect password. Please try again.');
          setIsDeleting(false);
          return;
        }
      }

      // Delete the account
      await user.delete();
      toast.success('Account deleted successfully. Redirecting...');
      setShowDeleteModal(false);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      const errorMessage = error?.errors?.[0]?.message || error?.message || 'Unknown error';
      
      // Handle reverification required for OAuth users
      if (errorMessage.toLowerCase().includes('reverification')) {
        toast.error('For security, you need to sign back in with Google before deleting your account.', {
          duration: 4000,
        });
        setShowDeleteModal(false);
        setIsDeleting(false);
        // Sign out and redirect to login
        setTimeout(async () => {
          await signOut();
          window.location.href = '/login';
        }, 2000);
      } else {
        toast.error(`Failed to delete account: ${errorMessage}`);
        setIsDeleting(false);
      }
    }
  };

  const settingsSections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Security',
      items: [
        {
          icon: Lock,
          label: hasPassword ? 'Reset Password' : 'Set Password',
          description: hasPassword ? 'Change your account password' : 'Enable email/password login',
          action: handleResetPassword,
          loading: isResettingPassword,
          variant: 'button',
        },
      ],
    },
    {
      title: 'Support & Legal',
      items: [
        {
          icon: HelpCircle,
          label: 'Contact Support',
          description: 'Get help from our support team',
          action: handleContactSupport,
          variant: 'button',
        },
        {
          icon: FileText,
          label: 'Privacy Policy',
          description: 'Read our privacy policy',
          action: () => navigate('/privacy'),
          variant: 'button',
        },
        {
          icon: FileText,
          label: 'Terms of Service',
          description: 'Read our terms of service',
          action: () => navigate('/terms'),
          variant: 'button',
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: Trash2,
          label: 'Delete Account',
          description: 'Permanently delete your account',
          action: handleDeleteAccount,
          variant: 'button',
          danger: true,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <Helmet>
        <title>Settings - Vector Mind AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {settingsSections.map((section) => (
            <div
              key={section.title}
              className="bg-white dark:bg-zinc-800 rounded-3xl shadow-xl border border-gray-200 dark:border-zinc-700 overflow-hidden"
            >
              <div className="px-8 py-5 border-b border-gray-200 dark:border-zinc-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{section.title}</h2>
              </div>

              <div className="p-4">
                {section.items.map((item, index) => {
                  const Icon = item.icon;
                  
                  return (
                    <div
                      key={index}
                      className={`group flex items-center justify-between p-4 rounded-xl transition-colors ${
                        item.variant === 'button' || item.variant === 'link'
                          ? 'hover:bg-gray-50 dark:hover:bg-zinc-700/50 cursor-pointer'
                          : ''
                      } ${index !== section.items.length - 1 ? 'border-b border-gray-100 dark:border-zinc-700/50' : ''}`}
                      onClick={() => {
                        if (item.variant === 'button' && item.action) {
                          item.action();
                        }
                      }}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-3 rounded-xl ${
                          item.danger
                            ? 'bg-red-100 dark:bg-red-900/20'
                            : 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            item.danger
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${
                            item.danger
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {item.label}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {item.badge && (
                          <span className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                            {item.badge}
                          </span>
                        )}

                        {item.variant === 'button' && !item.loading && (
                          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-transform" />
                        )}

                        {item.variant === 'link' && (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </a>
                        )}

                        {item.loading && (
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                  {hasPassword ? 'Change Password' : 'Set Password'}
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {hasPassword ? 'Enter your current and new password' : 'Set a password to enable email/password login'}
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {hasPassword && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                    required
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                  required
                  minLength={8}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Must be at least 8 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResettingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    Delete Account
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                disabled={isDeleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4">
              <p className="text-sm text-red-800 dark:text-red-300">
                <strong>Warning:</strong> Deleting your account will permanently remove all your data, including:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-400 mt-2 space-y-1 ml-4 list-disc">
                <li>Profile information</li>
                <li>Chat history</li>
                <li>Documents and uploads</li>
                <li>All generated content</li>
              </ul>
            </div>

            {hasPassword && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all"
                  disabled={isDeleting}
                  autoFocus
                />
              </div>
            )}

            {!hasPassword && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> For security, you may need to re-authenticate with Google. If required, you'll be automatically signed out and redirected to sign in again before deletion.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAccount}
                disabled={isDeleting || (hasPassword && !deletePassword)}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

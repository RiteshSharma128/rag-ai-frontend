'use client';


import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/lib/api';
import { User, Lock, Bell, Palette, Save, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

const Section = ({ icon: Icon, title, children }: any) => (
  <div className="glass rounded-2xl p-6">
    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-800">
      <Icon className="w-4 h-4 text-brand-400" />
      <h2 className="text-sm font-semibold text-white">{title}</h2>
    </div>
    {children}
  </div>
);

export default function SettingsPage() {
  const { user, updateUser, refreshUser } = useAuth();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileForm, setProfileForm] = useState({ name: '' });

useEffect(() => {
  if (user?.name) {
    setProfileForm({ name: user.name });
  }
}, [user]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('name', profileForm.name);
      await authAPI.updateProfile(formData);
      updateUser({ name: profileForm.name });
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setSavingPassword(true);
    try {
      await authAPI.changePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const inputCls = "w-full bg-surface-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Section icon={User} title="Profile">
        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600/25 border border-brand-500/30 flex items-center justify-center text-xl font-bold text-brand-300">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <p className="text-xs text-brand-400 capitalize">{user?.role}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
            <input
              value={profileForm.name}
              onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input value={user?.email || ''} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
          </div>

          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </Section>

      {/* Password */}
      <Section icon={Lock} title="Change Password">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
          <button
            onClick={savePassword}
            disabled={savingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
          >
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </div>
      </Section>

      {/* Account info */}
      <Section icon={Bell} title="Account Info">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-800/50">
            <span className="text-slate-400">Account ID</span>
            <span className="text-slate-300 font-mono text-xs">{user?._id?.slice(-8)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/50">
            <span className="text-slate-400">Role</span>
            <span className="text-brand-400 capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-400">Tenant</span>
            <span className="text-slate-300">{user?.tenant?.name || 'Personal workspace'}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}

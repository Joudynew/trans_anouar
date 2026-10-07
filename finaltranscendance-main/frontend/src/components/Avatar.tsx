import React from 'react';

interface AvatarProps {
  user?: { avatar_url?: string | null; full_name?: string } | null;
  size?: number;
  className?: string;
}

export function Avatar({ user, size = 40, className = '' }: AvatarProps) {
  const fullName = user?.full_name ?? '';
  const initials = fullName.charAt(0).toUpperCase() || '?';
  const avatarUrl = user?.avatar_url;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white font-bold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
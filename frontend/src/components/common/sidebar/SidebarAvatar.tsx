import { initialsAvatarFallback } from '../../../utils/avatar';

interface SidebarAvatarProps {
  name?: string | null;
  imageUrl?: string | null;
  sizeClassName?: string;
  className?: string;
}

export default function SidebarAvatar({
  name,
  imageUrl,
  sizeClassName = 'w-12 h-12',
  className = '',
}: SidebarAvatarProps) {
  const resolvedImageUrl = imageUrl || initialsAvatarFallback((name || 'User').trim() || 'User');

  return (
    <div
      className={`${sizeClassName} overflow-hidden rounded-full border border-black/5 shadow-sm shrink-0 ${className}`.trim()}
    >
      <img
        src={resolvedImageUrl}
        alt={name || 'profile'}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

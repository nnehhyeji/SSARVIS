import { initialsAvatarFallback } from '../../utils/avatar';

export type AvatarRowItem = {
  userId: number;
  nickname: string;
  customId: string;
  profileImageUrl: string;
};

type AvatarRowProps = {
  title: string;
  items: AvatarRowItem[];
  onUserClick?: (item: AvatarRowItem) => void;
};

export default function AvatarRow({ title, items, onUserClick }: AvatarRowProps) {
  return (
    <section className="space-y-5">
      <h2 className="text-[26px] font-black tracking-tight text-gray-900">{title}</h2>
      <div className="flex items-center gap-6 overflow-x-auto py-3">
        {items.map((item) => (
          <div key={item.userId} className="w-24 shrink-0 text-center">
            <button
              type="button"
              onClick={() => onUserClick?.(item)}
              title={`@${item.customId || item.nickname}`}
              className="p-1 active:scale-95"
            >
              <div className="h-24 w-24 overflow-hidden rounded-full transition-transform duration-200 hover:scale-105">
                <img
                  src={item.profileImageUrl || initialsAvatarFallback(item.nickname)}
                  alt={item.nickname}
                  className="h-full w-full object-cover"
                />
              </div>
            </button>
            {item.customId ? (
              <p className="mt-0.5 truncate text-center text-xs font-normal text-gray-500">
                {item.customId}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

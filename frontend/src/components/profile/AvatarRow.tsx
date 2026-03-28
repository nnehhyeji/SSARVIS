import { avatarFallback } from '../../utils/avatar';

export type AvatarRowItem = {
  userId: number;
  nickname: string;
  profileImageUrl: string;
};

type AvatarRowProps = {
  title: string;
  items: AvatarRowItem[];
};

export default function AvatarRow({ title, items }: AvatarRowProps) {
  return (
    <section className="space-y-5">
      <h2 className="text-[26px] font-black tracking-tight text-gray-900">{title}</h2>
      <div className="flex gap-6 overflow-x-auto pb-2">
        {items.map((item) => (
          <img
            key={item.userId}
            src={item.profileImageUrl || avatarFallback(item.nickname)}
            alt={item.nickname}
            title={item.nickname}
            className="h-24 w-24 shrink-0 rounded-full object-cover"
          />
        ))}
      </div>
    </section>
  );
}

export default function UserRow({ user }) {
  return (
    <li className="flex items-center gap-3 border-b border-gray-200 py-2 dark:border-white/10">
      <img className="size-10 shrink-0 rounded-full" src={user.avatar} alt="" />
      <div className="min-w-0 grow">
        <p className="truncate font-medium">{user.name}</p>
        <p className="overflow-hidden text-sm text-ellipsis whitespace-nowrap text-gray-500">{user.email}</p>
      </div>
      <span className="rounded-xs bg-(--badge-bg) px-2 py-0.5 text-xs text-(--badge-fg) box-decoration-clone">{user.role}</span>
    </li>
  )
}

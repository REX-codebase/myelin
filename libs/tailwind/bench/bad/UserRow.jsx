export default function UserRow({ user }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <img className="h-10 w-10 flex-shrink-0 rounded-full" src={user.avatar} alt="" />
      <div className="flex-grow min-w-0">
        <p className="truncate font-medium">{user.name}</p>
        <p className="overflow-hidden overflow-ellipsis whitespace-nowrap text-sm text-gray-500">{user.email}</p>
      </div>
    </li>
  )
}

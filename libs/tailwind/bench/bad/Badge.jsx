export function Badge({ children }) {
  return (
    <span className="bg-[--badge-bg] text-[--badge-fg] decoration-clone rounded px-2 py-0.5 text-xs">
      {children}
    </span>
  )
}

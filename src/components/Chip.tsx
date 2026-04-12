export function Chip({ label, active, onClick, disabled }: {
  label: string; active: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all select-none
        ${active ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500"}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}>
      {label}
    </button>
  );
}

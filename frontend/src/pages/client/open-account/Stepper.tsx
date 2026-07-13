export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {steps.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  active
                    ? 'bg-afriland text-white ring-4 ring-red-100'
                    : done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? '✓' : index + 1}
              </span>
              <span
                className={`hidden text-xs font-semibold sm:block ${
                  active ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span
                className={`h-[2px] flex-1 rounded-full ${done ? 'bg-emerald-400' : 'bg-gray-200'}`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

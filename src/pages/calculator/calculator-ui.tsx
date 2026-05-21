export function Field({
  label,
  children,
  className = "",
  title,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={className}>
      <label
        title={title}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-black/50 cursor-help"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function CalcSelect({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full min-h-[44px] rounded-xl border border-foreground/15 bg-white/80 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 cursor-pointer"
    >
      {children}
    </select>
  );
}

export function CalcInput({
  value,
  onChange,
  type = "number",
  step,
  min,
  disabled,
  placeholder,
}: {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  step?: number | string;
  min?: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      step={step}
      min={min}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full min-h-[44px] rounded-xl border border-foreground/15 bg-white/80 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 disabled:opacity-40"
    />
  );
}

export function Checkbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 mt-3 cursor-pointer select-none"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded accent-orange-500 flex-shrink-0"
      />
      <span className="text-sm font-semibold text-black/80">{label}</span>
    </label>
  );
}

export function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-white/60 p-5 backdrop-blur-md">
      {title && (
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-black/40 flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

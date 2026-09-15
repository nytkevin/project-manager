import type { AuthFieldProps } from "../auth.types";

export function AuthField({
  label,
  name,
  type,
  value,
  error,
  placeholder,
  hint,
  onChange,
}: AuthFieldProps) {
  const messageId = `${name}-message`;

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-zinc-200">
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
        className={`w-full rounded-xl border bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:ring-2 ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
            : "border-zinc-700 focus:border-white focus:ring-white/20"
        }`}
      />

      <p
        id={messageId}
        className={error ? "text-sm text-red-400" : "text-xs text-zinc-400"}
      >
        {error || hint}
      </p>
    </div>
  );
}

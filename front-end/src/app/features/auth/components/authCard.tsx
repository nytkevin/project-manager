import { AuthCardProps } from "../auth.types";

export function AuthCard({ eyebrow, title, children }: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d0d] p-8 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            {eyebrow}
          </p>

          <h1 className="mt-3 text-3xl font-semibold text-white">{title}</h1>
        </div>

        {children}
      </div>
    </main>
  );
}

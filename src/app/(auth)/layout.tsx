export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-black/10 bg-background shadow-2xl shadow-black/10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-black p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-10 inline-flex rounded-full border border-white/15 px-3 py-1 text-sm text-white/70">
              Mini Ticket Management
            </div>
            <h1 className="max-w-lg text-5xl font-semibold tracking-tight">
              Manage support tickets without the clutter.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/65">
              Create, assign, and close tickets from one simple dashboard.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {["New tickets", "Being fixed", "Resolved"].map((status) => (
              <div
                key={status}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-white/5"
              >
                <p className="text-white/45">Status</p>
                <p className="mt-2 font-medium">{status}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="p-5 sm:p-8 lg:p-10">{children}</section>
      </div>
    </main>
  );
}

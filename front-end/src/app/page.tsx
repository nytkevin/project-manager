import Link from "next/link";

const features = [
  {
    title: "Projects",
    description:
      "Create and organize projects so related work, members, tasks, and information stay together.",
  },
  {
    title: "Task Management",
    description:
      "Break projects into actionable tasks with statuses, priorities, and deadlines.",
  },
  {
    title: "Assignments",
    description:
      "Assign work clearly so every team member knows what they are responsible for.",
  },
  {
    title: "Progress Tracking",
    description:
      "Track task and project progress without constantly asking for updates.",
  },
  {
    title: "Collaboration",
    description:
      "Keep project discussions and shared context connected to the work.",
  },
  {
    title: "Secure Authentication",
    description:
      "Protect accounts and project information with secure authentication.",
  },
  {
    title: "Roles & Permissions",
    description:
      "Control what project managers, team members, and administrators can access.",
  },
  {
    title: "Simple Workspace",
    description:
      "Keep the interface focused so teams can spend more time working and less time searching.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create a project",
    description:
      "Set up a shared workspace for the project and the people involved.",
  },
  {
    number: "02",
    title: "Add your team",
    description: "Invite team members and give them the right level of access.",
  },
  {
    number: "03",
    title: "Create and assign tasks",
    description:
      "Turn project goals into clear tasks with owners, statuses, and deadlines.",
  },
  {
    number: "04",
    title: "Track progress",
    description:
      "Keep work updated so everyone can understand where the project stands.",
  },
];

const roles = [
  {
    title: "Project Managers",
    description:
      "Create projects, organize work, assign responsibilities, manage members, and monitor progress.",
  },
  {
    title: "Team Members",
    description:
      "View assigned tasks, update progress, track deadlines, and collaborate with the rest of the team.",
  },
  {
    title: "Administrators",
    description:
      "Manage users, permissions, platform access, and oversee activity across the system.",
  },
];

export default function Home() {
  return (
    <main className="bg-[#05070d] text-white">
      {/* HERO */}
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute left-1/2 top-0 h-150 w-225 -translate-x-1/2 rounded-full bg-blue-600/15 blur-[160px]" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 lg:px-8">
          <nav className="flex h-20 items-center justify-between border-b border-white/10">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              Project<span className="text-blue-500">Manager</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm text-zinc-300 transition hover:text-white"
              >
                Log in
              </Link>

              <Link
                href="/register"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500"
              >
                Sign up
              </Link>
            </div>
          </nav>

          <div className="flex flex-1 items-center justify-center py-24 text-center">
            <div className="max-w-4xl">
              <div className="mx-auto mb-6 w-fit rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
                One workspace. One clear direction.
              </div>

              <h1 className="text-5xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                Plan work.
                <span className="block text-blue-500">
                  Keep everyone moving.
                </span>
              </h1>

              <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
                Project Manager helps teams plan projects, organize tasks,
                assign work, track progress, and collaborate from one shared
                workspace.
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href="/register"
                  className="rounded-xl bg-blue-600 px-7 py-3 font-medium shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
                >
                  Get started
                </Link>

                <a
                  href="#problem"
                  className="rounded-xl border border-white/10 bg-white/5 px-7 py-3 font-medium transition hover:bg-white/10"
                >
                  Learn more
                </a>
              </div>
            </div>
          </div>

          <a
            href="#problem"
            className="pb-10 text-center text-sm text-zinc-600 transition hover:text-zinc-400"
          >
            Scroll to explore ↓
          </a>
        </div>
      </section>

      {/* PROBLEM */}
      <section
        id="problem"
        className="flex min-h-[85vh] items-center border-t border-white/5 bg-[#080a10] px-6 py-24"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-blue-500">
              The problem
            </p>

            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Project work gets scattered.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
              When planning happens across chats, notes, spreadsheets, and
              documents, important information gets lost. Responsibilities
              become unclear, deadlines are easier to miss, and understanding
              the current state of a project takes more effort than it should.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              "Important tasks get buried in conversations",
              "Responsibilities become unclear",
              "Progress updates become inconsistent",
              "Deadlines become harder to track",
            ].map((problem) => (
              <div
                key={problem}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/3 p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  ×
                </div>

                <p className="text-zinc-300">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-blue-500">
              Everything in one place
            </p>

            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Built around the way projects actually move.
            </h2>

            <p className="mt-6 text-lg leading-8 text-zinc-400">
              From creating the project to completing the final task, Project
              Manager keeps the people, work, responsibilities, and progress
              connected.
            </p>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-[#0b0e16] p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-500/30"
              >
                <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-semibold text-blue-400">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <h3 className="text-lg font-semibold">{feature.title}</h3>

                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="border-y border-white/5 bg-[#080a10] px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-500">
              How it works
            </p>

            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              From idea to completion.
            </h2>
          </div>

          <div className="mt-20 grid gap-4 lg:grid-cols-4">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-white/10 bg-[#0b0e16] p-7"
              >
                <span className="text-4xl font-semibold text-blue-500/30">
                  {step.number}
                </span>

                <h3 className="mt-8 text-xl font-semibold">{step.title}</h3>

                <p className="mt-3 leading-7 text-zinc-500">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-500">
              Designed for teams
            </p>

            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              The right tools for every role.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {roles.map((role) => (
              <article
                key={role.title}
                className="rounded-3xl border border-white/10 bg-[#0b0e16] p-8"
              >
                <div className="mb-8 h-1 w-12 rounded-full bg-blue-500" />

                <h3 className="text-2xl font-semibold">{role.title}</h3>

                <p className="mt-4 leading-7 text-zinc-400">
                  {role.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* OUTCOME */}
      <section className="border-y border-white/5 bg-[#080a10] px-6 py-32">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-blue-500">
              The outcome
            </p>

            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Less time searching.
              <span className="block text-blue-500">
                More time getting things done.
              </span>
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
              Users can log in and immediately understand what projects they
              belong to, what work needs attention, who owns each task, and how
              much progress has been made.
            </p>
          </div>

          <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-8">
            <div className="space-y-6">
              {[
                ["Clear ownership", "Every task has a responsible person."],
                ["Visible progress", "Know where work stands without asking."],
                ["Shared context", "Project information stays together."],
                [
                  "Controlled access",
                  "Users only access what they are allowed to.",
                ],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="border-b border-white/10 pb-6 last:border-0 last:pb-0"
                >
                  <h3 className="font-medium text-white">{title}</h3>
                  <p className="mt-2 text-sm text-zinc-500">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-6 py-32">
        <div className="absolute left-1/2 top-1/2 h-100 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/15 blur-[140px]" />

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-500">
            Your work. Organized.
          </p>

          <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
            Bring your projects together.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Create your workspace, organize the work that matters, and give your
            team one clear place to move projects forward.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="rounded-xl bg-blue-600 px-7 py-3 font-medium transition hover:bg-blue-500"
            >
              Create account
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-white/10 bg-white/5 px-7 py-3 font-medium transition hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>

        <footer className="relative mx-auto mt-32 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-8 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Project<span className="text-blue-500">Manager</span>
          </p>

          <p>Plan. Assign. Track. Deliver.</p>
        </footer>
      </section>
    </main>
  );
}

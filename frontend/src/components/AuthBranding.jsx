const APP_NAME = "Jagiri's Family App";
const TAGLINE = 'Your shared family tree, events, and memories.';

export function AuthBranding() {
  return (
    <div className="mb-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-500 dark:text-primary-400">
        Welcome
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
        {APP_NAME}
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-400">{TAGLINE}</p>
    </div>
  );
}

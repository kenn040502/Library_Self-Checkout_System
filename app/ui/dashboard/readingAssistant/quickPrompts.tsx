'use client';

type QuickPromptsProps = {
  onPick: (prompt: string) => void;
  disabled?: boolean;
};

const PROMPTS: string[] = [
  'How do I renew a loan?',
  'What happens if a book is overdue?',
  'Find me a fantasy novel',
  'Recommend something light for the weekend',
  'How do I place a hold?',
  'Computer science textbooks I can borrow now',
];

export default function QuickPrompts({ onPick, disabled }: QuickPromptsProps) {
  return (
    <div
      role="list"
      aria-label="Suggested prompts"
      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-hairline [&::-webkit-scrollbar-track]:bg-transparent dark:[&::-webkit-scrollbar-thumb]:bg-dark-hairline"
    >
      {PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          role="listitem"
          onClick={() => onPick(prompt)}
          disabled={disabled}
          className="shrink-0 whitespace-nowrap rounded-full border border-hairline bg-surface-soft px-3.5 py-1.5 font-sans text-body-sm text-body transition hover:border-primary/40 hover:bg-primary/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-hairline dark:bg-dark-surface-soft dark:text-on-dark-soft dark:hover:border-dark-primary/40 dark:hover:bg-dark-primary/10 dark:hover:text-on-dark"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

type FaqItem = {
  question: string;
  answer: string | React.ReactNode;
};

type FaqSection = {
  id: string;
  title: string;
  items: FaqItem[];
};

const sections: FaqSection[] = [
  {
    id: 'how-to-borrow',
    title: 'How to Borrow a Book',
    items: [
      {
        question: 'How do I borrow a book?',
        answer:
          'Go to Borrow in the sidebar, then scan the barcode on the book\'s back cover using your camera or type the barcode number manually. Confirm the book details and submit — the loan is recorded immediately.',
      },
      {
        question: 'Can I borrow multiple books at once?',
        answer:
          'Students can borrow up to 3 books at a time. You\'ll see an error if you\'ve reached your limit.',
      },
      {
        question: 'Can I place a hold on a book that\'s already on loan?',
        answer:
          'Yes. Find the book in the Catalogue and use the Hold option. You\'ll receive a notification when it becomes available.',
      },
    ],
  },
	  {
	    id: 'due-dates',
	    title: 'Loan Period & Due Dates',
	    items: [
	      {
	        question: 'How long can I keep a borrowed book?',
	        answer:
	          'The maximum loan period (including renewals) is up to 30 days from the original borrow date. Your current due date is shown in My Books.',
	      },
	      {
	        question: 'Can I renew my loan?',
	        answer:
	          'Yes. Go to My Books, find the loan, and tap Renew. Each renewal extends the due date by 14 days and you can renew up to 2 times. Renewal may be blocked if someone has placed a hold on the book, you have overdue items, unpaid fines, or your membership has expired.',
	      },
	      {
	        question: 'What happens if I return a book late?',
	        answer: (
	          <>
	            Overdue loans are flagged in the system and borrowing may be blocked until the item is returned.
	            If you need help, visit the library desk at Level 1 or email{' '}
	            <a
	              href="mailto:library@swinburne.edu.my"
	              className="font-medium text-primary underline-offset-2 hover:underline"
	            >
	              library@swinburne.edu.my
	            </a>
	            .
	          </>
	        ),
	      },
	    ],
	  },
  {
    id: 'returning',
    title: 'Returning Books',
    items: [
	      {
	        question: 'How do I return a book?',
	        answer:
	          'Bring the physical book to the library service desk (Level 1). A staff member will scan the book to record the return and you will receive a notification once it is processed.',
	      },
	      {
	        question: 'What if the return scan fails?',
	        answer:
	          'If the barcode cannot be scanned, library staff can enter the barcode number manually. If the barcode is damaged or unreadable, bring the book to the library desk for assistance.',
	      },
	      {
	        question: 'What if a book is damaged when I return it?',
	        answer:
	          'Tell the library staff at the service desk when you return the book. They will record the condition during check-in so the item can be handled appropriately.',
	      },
    ],
  },
  {
    id: 'scanner',
    title: 'Using the Barcode Scanner',
    items: [
	      {
	        question: 'How do I use the camera barcode scanner?',
	        answer:
	          'Tap the camera icon on the Borrow page. Hold the book\'s barcode steady within the frame — the scan is automatic. Ensure you\'re in a well-lit area for best results.',
	      },
      {
        question: 'The scanner isn\'t working. What should I do?',
        answer:
          'Check that your browser has camera permissions enabled. On mobile, try refreshing the page. You can always switch to manual barcode entry by typing the number directly into the field.',
      },
      {
        question: 'Can I scan from the Camera Scan page?',
        answer:
          'Yes — the Camera Scan shortcut in the sidebar opens a full-screen scanner optimised for mobile. Point your camera at the barcode and it will auto-detect and process the book.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Notifications',
    items: [
      {
        question: 'How do I sign in?',
        answer:
          'Use your Swinburne Microsoft account (student ID@swinburne.edu.my). Click Sign in on the login page and authenticate with your university credentials.',
      },
      {
        question: 'What notifications will I receive?',
        answer:
          'You\'ll get notifications for loan confirmations, due-date reminders, hold availability, and return confirmations. Manage your alerts in the Notifications inbox.',
      },
      {
        question: 'How do I update my profile?',
        answer:
          'Go to Profile in the sidebar to view and update your display name and preferences.',
      },
      {
        question: 'Who do I contact for help?',
        answer: (
          <>
            Visit the library desk at Level 1 or email{' '}
            <a
              href="mailto:library@swinburne.edu.my"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              library@swinburne.edu.my
            </a>
            .
          </>
        ),
      },
    ],
  },
];

function AccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-hairline last:border-0 dark:border-dark-hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-sans text-[14px] font-medium text-ink dark:text-on-dark">
          {item.question}
        </span>
        <ChevronDownIcon
          className={clsx(
            'mt-0.5 h-4 w-4 flex-shrink-0 text-muted transition-transform duration-200 dark:text-on-dark-soft',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <p className="pb-4 font-sans text-[14px] leading-relaxed text-body dark:text-on-dark-soft">
          {item.answer}
        </p>
      )}
    </div>
  );
}

export default function FaqAccordion() {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id} id={`${section.id}-title`} className="scroll-mt-6">
          <h2 className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-widest text-muted dark:text-on-dark-soft">
            {section.title}
          </h2>
          <div className="rounded-card border border-hairline bg-canvas px-5 dark:border-dark-hairline dark:bg-dark-canvas">
            {section.items.map((item, i) => (
              <AccordionItem key={i} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

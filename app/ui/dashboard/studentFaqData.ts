export type StudentFaqSection = {
  id: string;
  title: string;
  description: string;
  items: Array<{
    question: string;
    answer: string[];
    tags?: string[];
    contactLink?: {
      label: string;
      href: string;
      zendesk?: boolean;
    };
  }>;
};

export const studentFaqSections: StudentFaqSection[] = [
  {
    id: 'how-to-borrow',
    title: 'How to Borrow a Book',
    description: 'A step-by-step walkthrough of the self-checkout process from start to finish.',
    items: [
      {
        question: 'Step 1 — Find the book you want to borrow',
        answer: [
          'Go to Borrow Books from the side navigation or the bottom menu.',
          'You have two ways to find a title:',
          '• Search by title, author, or ISBN — type in the search box and select the correct item from the results.',
          '• Scan the barcode — tap the camera icon on the Borrow Books page and point it at the barcode on the back cover of the book. The system will identify the title automatically.',
        ],
        tags: ['Search', 'Barcode', 'Scanner'],
      },
      {
        question: 'Step 2 — Confirm the loan details',
        answer: [
          'Once the book is found, the system will display the title, copy details, and your due date.',
          'The default loan period is 14 days from today. Your due date is calculated and shown before you confirm.',
          'You can borrow a maximum of 3 books at a time. If you have already reached your limit, you must return a book before borrowing another.',
          'If you have any overdue items, the system will block new checkouts until those books are returned.',
        ],
        tags: ['Due date', 'Loan limit', 'Overdue'],
      },
      {
        question: 'Step 3 — Complete the checkout',
        answer: [
          'Tap "Borrow" to confirm. The loan is recorded instantly and will appear under My Books → Current Loans.',
          'No library staff or physical stamp is needed — the self-checkout handles everything.',
          'Important: ensure all books are checked out before removing them from the bookshelves area. The library\'s RFID security system will trigger an alarm if a book has not been properly checked out — this applies to all use, including in-house reading.',
          'You will receive a notification confirming the loan and a reminder as your due date approaches.',
        ],
        tags: ['Checkout', 'My Books', 'Notifications'],
        contactLink: {
          label: 'Go to My Books',
          href: '/dashboard/my-books',
        },
      },
    ],
  },
  {
    id: 'due-dates',
    title: 'Loan Period & Due Dates',
    description: 'Understanding how long you can keep a book, renewals, and what happens when it is overdue.',
    items: [
      {
        question: 'How long can I keep a borrowed book?',
        answer: [
          'The standard loan period is 14 days from the date you borrow the book.',
          'Your exact due date is shown at checkout and is listed in My Books → Current Loans at any time.',
          'The maximum loan period (including renewals) cannot exceed 30 days from the original borrow date.',
        ],
        tags: ['14 days', '30 days', 'Loan period'],
      },
      {
        question: 'Where can I see my due dates?',
        answer: [
          'Open My Books from the side navigation — your active loans are listed under the Current Loans tab, showing the title, borrow date, and due date for each item.',
          'Your dashboard home also highlights any loans due within the next 3 days.',
          'You can also check the Notifications page for upcoming due date reminders sent by the system.',
        ],
        tags: ['My Books', 'Dashboard', 'Notifications'],
        contactLink: {
          label: 'View My Books',
          href: '/dashboard/my-books',
        },
      },
      {
        question: 'Can I renew my loan before it is due?',
        answer: [
          'Yes. Open My Books → Current Loans and tap "Renew" on the book you want to extend.',
          'Each renewal extends the due date by 14 days. You can renew a loan up to 2 times.',
          'Renewal is blocked if: another student has placed a hold on the title, you have any overdue loans, you have unpaid fines, or your library membership has expired. The reason will be shown on your loan card.',
        ],
        tags: ['Renewal', 'Extension', 'Holds'],
        contactLink: {
          label: 'View My Books',
          href: '/dashboard/my-books',
        },
      },
      {
        question: 'What happens if I return the book late?',
        answer: [
          'Overdue items are flagged in the system and you will receive a reminder notification.',
          'While any book is overdue, you will not be able to borrow new titles until the overdue item is returned.',
          'Return the book as soon as possible to the library service desk on Level 1 and ensure the return is recorded in the system.',
        ],
        tags: ['Overdue', 'Late return', 'Borrow block'],
        contactLink: {
          label: 'Email library@swinburne.edu.my',
          href: 'mailto:library@swinburne.edu.my',
        },
      },
    ],
  },
  {
    id: 'returning',
    title: 'Returning Books',
    description: 'How to return a book and make sure the record is updated correctly.',
    items: [
      {
        question: 'How do I return a book?',
        answer: [
          'Bring the physical book back to the library service desk on Level 1.',
          'A staff member will scan the book to mark it as returned in the system.',
          'You can verify the return by checking My Books → Current Loans — the item should disappear once the return is processed.',
          'If you returned the book but it still shows as active, wait a few minutes and refresh the page.',
        ],
        tags: ['Return', 'Service desk', 'Level 1'],
      },
      {
        question: 'The book I returned is still showing as active. What should I do?',
        answer: [
          'Returns are processed by library staff. If the return was not scanned at the desk, the item will remain on your record.',
          'Contact the library service desk with your student ID and the book title to have the record corrected.',
          'You can also email the library directly — include your student ID and the title that needs updating.',
        ],
        tags: ['Return', 'Record', 'Service desk'],
        contactLink: {
          label: 'Email library@swinburne.edu.my',
          href: 'mailto:library@swinburne.edu.my',
        },
      },
    ],
  },
  {
    id: 'holds',
    title: 'Holds & Reservations',
    description: 'How to reserve a book that is currently on loan and manage your reservation queue.',
    items: [
      {
        question: 'What is a hold and how do I place one?',
        answer: [
          'A hold (reservation) lets you queue for a book that is currently borrowed by another student.',
          'When all copies of a title are on loan, you can place a hold from the Borrow Books page.',
          'You will be notified when a copy becomes available and is ready for pickup.',
        ],
        tags: ['Hold', 'Reservation', 'Queue'],
        contactLink: {
          label: 'Browse books',
          href: '/dashboard/book/items',
        },
      },
      {
        question: 'How long do I have to pick up a book when my hold is ready?',
        answer: [
          'When your hold is promoted to "ready", you have 3 days to collect the book from the library service desk on Level 1.',
          'You will receive a notification with the exact pickup deadline.',
          'If you do not collect the book within the 3-day window, the hold expires automatically and the copy is made available to the next person in the queue.',
        ],
        tags: ['Hold', 'Pickup', '3 days'],
      },
      {
        question: 'How do I check or cancel my reservations?',
        answer: [
          'Go to My Books and open the Reservations tab.',
          'You will see all active holds with their current status — "queued" (waiting) or "ready" (pickup available).',
          'To cancel a hold, tap the cancel option next to the reservation. Cancelling removes you from the queue permanently.',
        ],
        tags: ['Hold', 'Cancel', 'My Books'],
        contactLink: {
          label: 'View My Books',
          href: '/dashboard/my-books',
        },
      },
      {
        question: 'Can I still renew a book if someone has placed a hold on it?',
        answer: [
          'No. If another student has placed a hold on the same title, the renewal option will be blocked.',
          'This ensures the book can be returned on time so the hold can be fulfilled for the next student.',
          'You can still see the reason for the block on your loan card in My Books → Current Loans.',
        ],
        tags: ['Renewal', 'Hold', 'Block'],
      },
    ],
  },
  {
    id: 'scanner',
    title: 'Using the Barcode Scanner',
    description: 'Tips for scanning book barcodes reliably using the camera on your device.',
    items: [
      {
        question: 'How do I use the camera scanner to borrow a book?',
        answer: [
          'On the Borrow Books page, tap the camera icon to open the barcode scanner.',
          'Point your device camera at the barcode on the back cover of the book. Hold it steady and make sure the barcode is within the frame.',
          'The scanner detects the barcode automatically. Once found, the book details will load and you can proceed with checkout.',
          'The scanner works best in good lighting and when the barcode is held flat and parallel to the camera (not at an angle).',
        ],
        tags: ['Scanner', 'Camera', 'Borrow'],
        contactLink: {
          label: 'Open Borrow Books',
          href: '/dashboard/book/checkout',
        },
      },
      {
        question: 'The scanner is not detecting the barcode. What should I try?',
        answer: [
          'Ensure the barcode is clean and not torn, bent, or obscured.',
          'Try better lighting — move closer to a light source or enable your device torch if available.',
          'Hold the camera 10–15 cm away from the barcode and keep it parallel to the barcode (avoid steep angles).',
          'Hold the device steady for 1–2 seconds — slight movement can cause missed frames.',
          'If the scanner still fails, use the search box to look up the title by name or ISBN instead.',
        ],
        tags: ['Scanner', 'Troubleshooting', 'Barcode'],
      },
    ],
  },
  {
    id: 'account',
    title: 'Your Account & Notifications',
    description: 'Managing your profile, contact details, and staying on top of reminders.',
    items: [
      {
        question: 'How do I sign in to the dashboard?',
        answer: [
          'Sign in using your Swinburne Microsoft account (your student email ending in @student.swinburne.edu.my).',
          'Personal email accounts are not supported.',
          'If you are redirected in a loop or cannot sign in, clear your browser cookies and try again. If the problem persists, contact the IT help desk.',
        ],
        tags: ['Login', 'Microsoft', 'Student email'],
        contactLink: {
          label: 'Open help desk portal',
          href: 'https://helpdesk.swinburne.edu.my/',
          zendesk: true,
        },
      },
      {
        question: 'How do I update my contact details?',
        answer: [
          'Go to My Profile from the side navigation.',
          'Edit your display name, email, or phone number and save the changes.',
          'Keeping your contact details up to date ensures you receive due date reminders and hold pickup notices.',
        ],
        tags: ['Profile', 'Contact', 'Notifications'],
        contactLink: {
          label: 'Open My Profile',
          href: '/dashboard/profile',
        },
      },
      {
        question: 'Why am I receiving overdue reminders?',
        answer: [
          'The system sends reminders when a borrowed item is approaching or has passed its due date.',
          'Check My Books → Current Loans to see which item is overdue.',
          'If you have already returned the book but the reminder is still appearing, the return may not have been recorded by staff — contact the service desk with your student ID.',
          'While an item is overdue, new checkouts are blocked until the item is returned and processed.',
        ],
        tags: ['Notifications', 'Overdue', 'Reminders'],
        contactLink: {
          label: 'Email library@swinburne.edu.my',
          href: 'mailto:library@swinburne.edu.my',
        },
      },
      {
        question: 'How many books can I borrow at once?',
        answer: [
          'You can borrow a maximum of 3 books at any one time.',
          'To borrow a new title when you are at your limit, you must return one of your current loans first.',
          'Your current loan count is always visible on your dashboard home.',
        ],
        tags: ['Loan limit', '3 books', 'Dashboard'],
        contactLink: {
          label: 'View dashboard',
          href: '/dashboard',
        },
      },
      {
        question: 'Can I let someone else borrow using my account?',
        answer: [
          'No. You must never lend your student ID or share your account with anyone, or borrow items on someone else\'s behalf.',
          'All items checked out on your account are entirely your responsibility, including any fines or replacement costs that arise.',
          'If you lose your student ID card, report it to the library immediately so your account can be protected.',
        ],
        tags: ['ID card', 'Account', 'Responsibility'],
        contactLink: {
          label: 'Email library@swinburne.edu.my',
          href: 'mailto:library@swinburne.edu.my',
        },
      },
    ],
  },
  {
    id: 'fines-lost',
    title: 'Fines & Lost Items',
    description: 'What to do if you have outstanding fines or have lost or damaged a borrowed item.',
    items: [
      {
        question: 'How do I pay library fines?',
        answer: [
          'You can pay fines at the library counter using an e-wallet by scanning the QR code available at the desk.',
          'If you are unable to visit in person, email library@swinburne.edu.my and the library will provide a payment QR code.',
          'Borrowing is suspended while fines remain unpaid, so settle them as soon as possible.',
        ],
        tags: ['Fines', 'Payment', 'E-wallet'],
        contactLink: {
          label: 'Email library@swinburne.edu.my',
          href: 'mailto:library@swinburne.edu.my',
        },
      },
      {
        question: 'What happens if I lose or damage a borrowed book?',
        answer: [
          'You are required to pay the replacement cost of the item plus an administration fee of RM 50.00.',
          'The replacement cost is based on the current retail price, or the average price for that subject area if the title is no longer in print.',
          'You may also replace the item with a new copy or the latest edition of the same book.',
          'Borrowing and renewal will remain suspended until the outstanding charges are settled or the item is replaced.',
        ],
        tags: ['Lost', 'Damaged', 'Replacement', 'Fee'],
        contactLink: {
          label: 'Email library@swinburne.edu.my',
          href: 'mailto:library@swinburne.edu.my',
        },
      },
    ],
  },
];

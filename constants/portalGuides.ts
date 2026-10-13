import { PortalGuideData } from '../components/common/ContextualHelpDrawer';

export const TEAM_PORTAL_GUIDE_DATA: PortalGuideData = {
  portalName: 'JTF Team Management Portal',
  badge: 'Ops & Admin',
  portalDescription:
    'The operational nerve center for Just The Funny. Manage personnel rosters, conservatory classes, shows, ticketing, room scheduling, CRM inquiries, inventory, and theater settings.',
  currentSectionKey: 'dashboard',
  sections: {
    dashboard: {
      title: 'Dashboard',
      icon: '📊',
      description:
        'Live executive summary of theater operations. View high-priority action items (pending rentals, web inquiries, unsigned welcome packages, refunds, makeups) and key conservatory / personnel statistics.',
      workflow: [
        'Review the "Action Required" banner at the top for urgent tasks needing staff attention.',
        'Click directly on any action tile (e.g., Rental Inquiries, Contact Messages) to jump to that specific CRM queue.',
        'Check upcoming show, workshop, and active class enrollment progress bars.',
        'Inspect the Personnel Breakdown to view counts for active students, cast members, and crew.',
      ],
      tips: [
        'Every metric card and action tile is interactive—clicking it takes you straight to the relevant management page.',
        'The timestamp indicates the last live sync with the Supabase database.',
      ],
    },
    'crm-operations': {
      title: 'Theater CRM & Ops',
      icon: '🏢',
      description:
        'Unified operations management for space bookings, customer ticket refunds, tuition credits, class makeup vouchers, welcome package compliance, venue rentals, and public web inquiries.',
      workflow: [
        'Space Scheduling: Reserve Main Stage, Second Stage, Classroom A, or Green Room with automated collision detection.',
        'Ticket Refunds: Process customer refund requests with approved/rejected tracking.',
        'Tuition Credits: Manage credit balances for conservatory students withdrawing or rescheduling.',
        'Class Makeups: Track student absence makeup vouchers and match them with available class dates.',
        'Welcome Packages: Track signed student agreements—Level 1 enrollments are automatically flagged for signature.',
        'Venue Rentals & Gigs: Manage incoming rental quotes, contracts, deposit payments, and event milestones.',
        'Contact Inquiries: View and resolve incoming web messages received from the public website.',
      ],
      tips: [
        'Google Sheets webhooks automatically populate rentals and contact messages in real time.',
        'Double-booking prevention stops conflicting space reservations on the same stage.',
      ],
    },
    scheduling: {
      title: 'Master Schedule',
      icon: '📅',
      description:
        'Master theater schedule calendar combining public shows, rehearsals, conservatory classes, workshops, and private space bookings.',
      workflow: [
        'Filter by room (Main Stage, Second Stage, Classrooms) or event type.',
        'Inspect start and end times to identify open rehearsal slots or venue availability.',
        'Switch between month, week, or agenda views to plan upcoming programming.',
      ],
      tips: [
        'Always check the schedule before confirming external rental inquiries or private gigs.',
      ],
    },
    'show-management': {
      title: 'Shows & Production',
      icon: '🎬',
      description:
        'Create and schedule public shows, assign director and cast lineups, track ticket sales, and manage crew duty assignments.',
      workflow: [
        'Schedule a new show by specifying title, date, time, venue stage, and director.',
        'Assign cast members and set caller / host roles.',
        'Assign crew duties (sound, lights, door/concessions, stage manager).',
        'Review ticket sales integration and attendee counts.',
      ],
      tips: [
        'Shows published here automatically appear on the Cast and Director portals for performer call-times and setlists.',
      ],
    },
    'class-management': {
      title: 'Classes & Conservatory',
      icon: '📘',
      description:
        'Conservatory curriculum management. Create class offerings, assign instructors, manage enrollment caps, and track student attendance and graduation progress.',
      workflow: [
        'Create class offerings specifying level (Level 1–5, English or Spanish), day, time, and room.',
        'Assign lead instructors and teaching assistants.',
        'Enroll students and monitor capacity limits.',
        'Track graduation requirements and eligibility for next-level promotions.',
      ],
      tips: [
        'Newly enrolled Level 1 students automatically trigger a welcome package signature requirement in the CRM.',
      ],
    },
    'student-directory': {
      title: 'Student Directory',
      icon: '🎓',
      description:
        'Full roster of current and former conservatory students. Access individual student profiles, enrollment history, attendance records, skill evaluations, and tuition credit balances.',
      workflow: [
        'Search by student name or filter by active, graduated, or inactive status.',
        'Click a student to view their detailed profile, past classes, and attendance history.',
        'Log instructor feedback, notes, or tuition credit adjustments.',
      ],
      tips: [
        'Use the student profile to quickly see which welcome package documents have been completed.',
      ],
    },
    'personnel-management': {
      title: 'Company Roster',
      icon: '🗂️',
      description:
        'Master personnel database covering all company members: cast performers, directors, instructors, bartenders, and production crew.',
      workflow: [
        'Add new company members with contact info, emergency contacts, and headshots.',
        'Manage primary roles (Cast, Crew, Instructor, Director, Admin).',
        'Inspect individual availability submissions and historical assignments.',
      ],
      tips: [
        'Keeping contact information and emails up to date ensures login access and automated notifications function correctly.',
      ],
    },
    inventory: {
      title: 'Concessions & Theater Inventory',
      icon: '📦',
      description:
        'Track bar and concession inventory, merch stock, theater supplies, and reorder levels.',
      workflow: [
        'Log current stock counts for beverages, snacks, and merchandise.',
        'Review low-stock alerts before weekend show runs.',
        'Update supplier information and wholesale unit costs.',
      ],
      tips: [
        'Perform weekly inventory audits on Sunday night after weekend performances.',
      ],
    },
    settings: {
      title: 'Settings & Integrations',
      icon: '⚙️',
      description:
        'Portal system settings, Google Sheets integration links, Apps Script webhook generator, and environment configurations.',
      workflow: [
        'Access Google Sheets & Webhooks tab to view live Sheet IDs and Drive shortcuts.',
        'Use the 1-click script copier to get ready-to-run Google Apps Script code whenever new Google Forms or Sheets are created.',
        'Configure portal branding, default rooms, and notification destinations.',
      ],
      tips: [
        'Apps Script webhooks run securely within your Google account without exposing sheets publicly to anyone with a link.',
      ],
    },
    'account-recovery': {
      title: 'Account Help & Access',
      icon: '🔧',
      description:
        'Support tools for user login issues, password resets, role permissions, and portal routing.',
      workflow: [
        'Look up a user’s auth email to verify if their account has been invited or activated.',
        'Assign appropriate portal roles via the User Roles & Logins section.',
        'Guide users to the central JTF Portal Hub if they need to switch roles.',
      ],
      tips: [
        'All users authenticate via Supabase Auth; role changes take effect immediately on next page refresh.',
      ],
    },
  },
};

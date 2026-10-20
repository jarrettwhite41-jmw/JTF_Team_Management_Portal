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
        'Unified operations command center for space bookings, ticket refunds, tuition credits, class makeup vouchers, welcome package compliance, venue rentals & deals, cold/warm outreach prospect leads, contact inquiries, and customer communication logs.',
      workflow: [
        'Venue Rentals & Gigs: Track rental bookings and outside gigs through Inquiry, Quoted, Contract Sent, Deposit Received, and Paid in Full stages with financial KPI metrics (quoted, agreed, paid, balance due). Convert confirmed inquiries directly into calendar events.',
        'Outreach & Prospect Pipeline: Manage organizational prospects, corporate clients, schools, and partner leads with status pipelines (Prospecting, Pitch Sent, Under Discussion, Won/Converted, Inactive). One-click "Convert to Event / Rental" pushes winning outreach leads directly into the venue deal pipeline.',
        'Space Scheduling: Reserve Main Stage, Second Stage, Classroom A, or Green Room with automated collision detection.',
        'Ticket Refunds: Process customer refund and store credit requests from Square POS and Eventbrite with approved/processed tracking.',
        'Tuition Credits: Manage credit balances for conservatory students withdrawing, dropping, or rescheduling without messy spreadsheet math.',
        'Class Makeups: Track student absence makeup vouchers and match them with available class dates.',
        'Welcome Packages: Track signed student agreements—Level 1 enrollments are automatically flagged for signature compliance.',
        'Contact Inquiries: View, triage, and resolve incoming web messages received from the public website, automatically synchronized from Google Forms/Sheets.',
        'Communication Log: Review customer interaction history across email, phone, ticketing, class credit, and venue rental inquiries.',
      ],
      tips: [
        'Rentals & Deals: Review financial metrics (Quoted vs Agreed vs Paid vs Due) directly above the deals table to gauge pipeline health.',
        'Outreach Pipeline: Use "+ Add Outreach Lead" to record prospect accounts, target decision makers, pitch dates, and next follow-up dates.',
        'One-Click Conversion: When an outreach deal is won, click "Convert to Event / Rental" to seamlessly bridge the record into venue rentals.',
        'Google Sheets two-way sync keeps venue deals and outreach leads automatically aligned with co-owner Google Sheets.',
        'Responsive mobile card views allow theater managers to approve refunds, makeups, check packets, and update deals seamlessly from their phones without horizontal scrolling.',
        'Double-booking prevention stops conflicting space reservations on the same stage.',
      ],
      crossPortalImpact: [
        {
          portal: 'Master Schedule & Calendar',
          description: 'Confirmed space reservations and approved rental events instantly block stage and room slots, preventing instructors or directors from conflicting bookings.',
        },
        {
          portal: 'Instructor Portal (Makeups & Packets)',
          description: 'Approved class makeup vouchers allow instructors to verify student attendance without penalizing normal cohort caps, while welcome package compliance ensures onboarding paperwork is complete before session 1.',
        },
        {
          portal: 'Directors & Production',
          description: 'Confirmed private rentals and outside gigs on main stages block weekend rehearsal and performance slots across all director lineups.',
        },
      ],
    },
    'venue-rentals': {
      title: 'Rentals & Deal Pipeline',
      icon: '🏛️',
      description:
        'End-to-end venue rentals and outside gigs pipeline. Manage incoming quotes, contracts, deposit payments, event dates, room assignments, and financial milestones.',
      workflow: [
        'Review the financial KPI banner: Quoted Value, Agreed Value, Collected to Date, and Outstanding Balance Due.',
        'Track stage progression: Inquiry → Quoted → Contract Sent → Deposit Received → Paid in Full → Completed.',
        'Click "+ Add Deal" to record a new private event, corporate workshop, or outside theater rental with client contact details, rate, and dates.',
        'Open any deal card or row to edit details, assign stages (Main Stage, Second Stage, etc.), adjust fees, log notes, or sync writebacks to Google Sheets.',
        'Use "Convert to Event / Rental" to automatically bridge confirmed bookings into the Master Calendar.',
      ],
      tips: [
        'Real-time writeback to the co-owner Google Sheet automatically keeps financial partners informed without manual spreadsheet data entry.',
        'Touch-optimized mobile cards let you check client contacts, event dates, and payment balances on the fly.',
      ],
      crossPortalImpact: [
        {
          portal: 'Master Schedule & Operations',
          description: 'Confirmed rentals lock stage availability and prevent scheduling conflicts across public shows, rehearsals, and classes.',
        },
      ],
    },
    'outreach-leads': {
      title: 'Outreach & Prospect Pipeline',
      icon: '🎯',
      description:
        'Cold and warm client development CRM for corporate workshops, team-building sessions, school field trips, touring shows, and community partnerships.',
      workflow: [
        'Track prospect account stages: Prospecting → Pitch Sent → Under Discussion → Won / Converted → Inactive.',
        'Click "+ Add Outreach Lead" to capture organization name, contact persona, email, phone, estimated offer value, next action, and follow-up deadline.',
        'Filter leads by pipeline status or search by company, contact person, or owner.',
        'When a client is ready to book, click "Convert to Event / Rental" on the lead modal to instantly generate a venue rental deal in the rentals pipeline.',
        'Sync directly with Google Sheets (gid=1576425752) for two-way collaborative account management.',
      ],
      tips: [
        'Set next actions and follow-up dates to keep business development efforts organized.',
        'Use the mobile card view to quickly tap phone or email shortcuts before sales calls.',
      ],
      crossPortalImpact: [
        {
          portal: 'Venue Rentals & Production',
          description: 'Converted outreach leads automatically seed rental pipeline entries with all client history and contact info intact.',
        },
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
      crossPortalImpact: [
        {
          portal: 'Directors Portal',
          description: 'Assigning a director gives them instant access in their portal to view performer availability, build the show setlist, and assign stage chores.',
        },
        {
          portal: 'Cast & Crew Portal',
          description: 'Published show dates immediately appear on performer calendars and trigger monthly availability submission deadlines.',
        },
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
      crossPortalImpact: [
        {
          portal: 'Instructor Portal',
          description: 'Creating a class and assigning a teacher instantly populates the teacher’s dashboard and generates weekly attendance rosters.',
        },
        {
          portal: 'Operations CRM',
          description: 'New Level 1 student enrollments automatically open an "Unsigned Welcome Package" compliance item in the CRM.',
        },
      ],
    },
    'season-planner': {
      title: 'Season & Curriculum Planner',
      icon: '🗓️',
      description:
        'Interactive master planning canvas for staging entire conservatory sessions, public show seasons, and intensive workshops before publishing them to the live schedules.',
      workflow: [
        'Create a Planning Season specifying Season Name, Start Date, End Date, and initial notes.',
        'Delete unwanted seasons with the 🗑️ Delete Season button when resetting seasonal planning drafts.',
        'Stage draft items: choose item type (Class, Show, or Workshop), curriculum level/title, date, room, and lead instructor/director.',
        'Smart scheduling defaults: Classes default to recurring multi-week cohorts (7:30 PM - 10:00 PM) with start and end dates. Shows default to single-day events (9:00 PM - 11:00 PM), and workshops are single-day intensives.',
        'Remove unwanted draft items at any time directly from the item edit modal ("🗑️ Remove Draft Item"), calendar cards, or the table ledger.',
        'Inspect real-time collision detection: the engine automatically verifies room double-booking, teacher day preferences, and instructor blackout/vacation dates.',
        'Toggle between Calendar, Weekly Schedule, and Summary Ledger views to visualize load and venue usage across weeks.',
        'Review collision warnings (e.g. "Instructor is marked unavailable on Mondays", "Instructor has a submitted blackout date on 2026-11-10; substitute needed").',
        'When ready, publish the season to instantly commit all draft classes and shows into the production live tables.',
      ],
      tips: [
        'Draft items remain safely staged in the draft plan without altering current live student classes or public show tickets until you explicitly publish.',
        'Only classes span multiple weeks with an end date; shows and workshops automatically treat dates as single-day events.',
        'You can delete individual draft items directly from the modal footer or by tapping the 🗑️ icon on any schedule card.',
        'Deleting a planning season cascades automatically, cleanly removing all draft items without leaving orphaned records.',
      ],
      crossPortalImpact: [
        {
          portal: 'Instructor Portal (Teaching Availability)',
          description: 'The Season Planner directly queries teachers’ submitted recurring day availability, class level preferences, and specific blackout dates to warn staff of conflicts.',
        },
        {
          portal: 'Master Schedule & Production',
          description: 'Publishing a season commits all scheduled classes and shows into live database offering tables and calendars across the company.',
        },
      ],
    },
    'skills-management': {
      title: 'Curriculum & Skills Rubric',
      icon: '⭐',
      description:
        'Master competency frameworks and skill progression rubrics for conservatory Levels 1 through 5, youth programs, and specialty conservatory workshops.',
      workflow: [
        'Review and define competency rubrics per level (e.g., Fundamentals, Scenework, Characters & Games, Longform).',
        'Audit instructor evaluations and student milestone progress.',
        'Verify prerequisite criteria for students advancing between levels.',
      ],
      tips: [
        'Aligning rubrics ensures consistent standards when multiple instructors teach different cohorts of the same level.',
      ],
      crossPortalImpact: [
        {
          portal: 'Instructor Portal',
          description: 'Skills rubrics defined here determine the competencies teachers evaluate during in-class progress check-ins.',
        },
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
      crossPortalImpact: [
        {
          portal: 'Instructor Portal',
          description: 'Attendance marks and private student evaluations recorded by instructors sync directly into the student’s permanent company record here.',
        },
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
      crossPortalImpact: [
        {
          portal: 'Portal Access & Hub',
          description: 'Enabling Cast, Director, or Instructor status here grants corresponding permission in the database, allowing users to enter those respective portals.',
        },
        {
          portal: 'Directors Portal Lineups',
          description: 'Only members flagged as active Cast or Crew appear in the Director’s performer pool when assembling weekend show rosters.',
        },
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
        'Portal system settings, Google Sheets integration links, Apps Script webhook generator, Squarespace website widgets, and environment configurations.',
      workflow: [
        'Access Google Sheets & Webhooks tab to view live Sheet IDs and Drive shortcuts for events, outreach leads, contact inquiries, and auditions.',
        'Squarespace Website Widgets: Access the Squarespace Widgets tab to generate embeddable HTML/JS code snippets for your public /shows and /classes pages. Real-time sync matches Eventbrite ticket links authoritatively while safely handling internal events.',
        'Use the 1-click script copier to get ready-to-run Google Apps Script code with automatic sheet and GID matching for rental deals and outreach leads.',
        'Run the dedicated sync runner (e.g. syncOutreachSheetOnly or syncEventsOnly) directly inside Apps Script to immediately backfill historical spreadsheet rows into Supabase.',
        'Configure portal branding, default rooms, and notification destinations.',
      ],
      tips: [
        'Squarespace widgets run read-only Supabase RPC queries that require zero manual website maintenance whenever seasons or ticket links update.',
        'Apps Script webhooks run securely within your Google account without exposing sheets publicly to anyone with a link.',
        'The generated Apps Script automatically normalizes column headers and matches tabs by name or GID ID (e.g. gid=1576425752 for outreach leads).',
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

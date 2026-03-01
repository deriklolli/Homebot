export interface HelpSection {
  heading: string;
  body: string;
  screenshot?: string; // alt text describing what screenshot to add
}

export interface HelpTopic {
  slug: string;
  name: string;
  icon: string; // icon component name from @/components/icons
  summary: string;
  keywords: string;
  sections: HelpSection[];
}

export const helpTopics: HelpTopic[] = [
  {
    slug: "dashboard",
    name: "Understanding the Dashboard",
    icon: "GridIcon",
    summary:
      "Your home at a glance — tasks, projects, spending trends, and alerts in one place.",
    keywords: "dashboard home overview tasks projects spending alerts appointments",
    sections: [
      {
        heading: "Overview",
        body: "The Dashboard is the first thing you see when you log in. It provides a snapshot of everything happening with your home — active projects, upcoming service appointments, inventory alerts, and your task list. Think of it as your home's command center.",
        screenshot: "Dashboard page showing all widgets: tasks, projects, spending chart, and alerts",
      },
      {
        heading: "Task List",
        body: "The Tasks card lets you create and manage a simple to-do list for your home. Click the input field, type a task name, and press the + button or Enter to add it. Click the circle next to a task to mark it complete — it'll get a strikethrough and an orange checkmark. Click a task's text to rename it inline, and use the X button to delete it. Tasks are saved to your account and persist across sessions.",
        screenshot: "Tasks card with a mix of completed and incomplete tasks",
      },
      {
        heading: "Active Projects",
        body: "The Projects widget shows your in-progress home improvement projects with their current status and budget. Each project card displays the project name, status badge, and total spending. Click any project to jump to its detail page. If you have no active projects, the widget shows a prompt to create your first one.",
        screenshot: "Projects widget showing 2-3 active projects with status badges",
      },
      {
        heading: "Spending Trends",
        body: "The Spending chart tracks your home-related expenses over the past several months. It pulls cost data from your projects, services, and inventory purchases to display an area chart of monthly spending. Hover over the chart to see exact amounts for each month. This helps you spot seasonal patterns and plan your budget.",
        screenshot: "Spending trends area chart showing monthly home expenses",
      },
      {
        heading: "Alerts & Reminders",
        body: "The Dashboard surfaces alerts for items that need your attention — inventory items due for reorder, services approaching their next due date, and warranties about to expire. Alerts appear as colored badges so you can quickly see what needs action. Click any alert to navigate to the relevant item's detail page.",
        screenshot: "Dashboard alert cards showing overdue inventory and upcoming service reminders",
      },
    ],
  },
  {
    slug: "projects",
    name: "How to Create and Manage Projects",
    icon: "WrenchIcon",
    summary:
      "Track home improvement projects with budgets, milestones, invoices, and contractor links.",
    keywords: "projects improvements renovations costs contractors timeline milestones status budget invoices",
    sections: [
      {
        heading: "Creating a Project",
        body: "Navigate to Projects from the sidebar and click the \"Add Project\" button. Give your project a descriptive name (e.g., \"Kitchen Renovation\" or \"Deck Repair\"), set an initial status (Planning, In Progress, or Complete), and optionally enter a budget amount. You can also add a brief description and select a category to help organize your projects.",
        screenshot: "Add Project form with name, status, budget, and description fields",
      },
      {
        heading: "Tracking Status and Budget",
        body: "Each project has a status badge that you can update as work progresses — from Planning to In Progress to Complete. The budget tracker shows your total budget versus actual spending, calculated from invoices and cost entries you add. The progress bar fills in as spending approaches the budget, turning red if you go over.",
        screenshot: "Project detail page showing status badge and budget progress bar",
      },
      {
        heading: "Adding Notes and Milestones",
        body: "Use the timeline on the project detail page to log notes, milestones, and updates. Click \"Add Event\" to create a new timeline entry with a date, description, and optional type (Note, Milestone, or Update). The timeline displays entries in chronological order so you have a complete history of the project from start to finish.",
        screenshot: "Project timeline showing a sequence of notes and milestone entries",
      },
      {
        heading: "Uploading Invoices",
        body: "Attach invoices and receipts to your project by clicking \"Add Invoice\" on the detail page. Upload a photo or PDF of the invoice — HOMEBOT will attempt to extract the total amount automatically using OCR. You can also manually enter the amount and add a description. Invoices are tallied into the project's total spending.",
        screenshot: "Invoice upload area showing a scanned receipt with extracted amount",
      },
      {
        heading: "Linking Contractors",
        body: "Connect contractors from your directory to a project so you always know who did the work. On the project detail page, click \"Link Contractor\" and select from your saved contractors. Linked contractors appear on the project page with their contact info and specialty, making it easy to reach out for follow-up work or warranty questions.",
        screenshot: "Project detail page showing linked contractors with contact information",
      },
    ],
  },
  {
    slug: "home-assets",
    name: "Add and Track Home Assets",
    icon: "HomeIcon",
    summary:
      "Catalog appliances and systems with make, model, warranty, and auto consumable suggestions.",
    keywords: "assets appliances systems make model serial warranty consumables suggestions import csv",
    sections: [
      {
        heading: "What Are Home Assets?",
        body: "Home Assets is your catalog of every major appliance and system in your home — from your HVAC system and water heater to your dishwasher and garage door opener. Each asset entry stores the make, model, serial number, purchase date, and warranty expiration. This information is invaluable for maintenance, warranty claims, and insurance purposes.",
        screenshot: "Home Assets page showing categorized list of assets with status indicators",
      },
      {
        heading: "Adding an Asset",
        body: "There are two ways to add an asset. You can click the \"+ Add\" button next to any category heading (e.g., Kitchen, HVAC, Plumbing), or click on a placeholder row to pre-fill the asset name. Fill in as many details as you can — the make and model are especially important because they unlock automatic consumable suggestions. Set the purchase date and warranty expiration to enable warranty tracking.",
        screenshot: "Add Asset form with fields for name, make, model, serial number, and dates",
      },
      {
        heading: "Automatic Consumable Suggestions",
        body: "When you save an asset with a make and model number, HOMEBOT uses AI to identify filters, replacement parts, and other consumables that need periodic replacement for that specific product. For example, adding a Honeywell furnace might automatically create inventory items for the correct air filter size with a recommended 90-day replacement schedule and a direct purchase link. These suggestions appear in your Home Inventory automatically.",
        screenshot: "Asset detail page showing auto-generated consumable suggestions with purchase links",
      },
      {
        heading: "Warranty Tracking",
        body: "Each asset can have a warranty expiration date. HOMEBOT displays the warranty status on the asset detail page — showing whether coverage is active, expiring soon (within 30 days), or expired. Assets with warranties expiring soon are flagged with an alert so you can take action, file claims, or consider extended warranty options before coverage ends.",
        screenshot: "Asset detail showing warranty status badges (Active, Expiring Soon, Expired)",
      },
      {
        heading: "Importing from a Spreadsheet",
        body: "If you already have a list of your home assets, you can bulk-import them. On the Home Assets page, click the \"Import\" button and upload a CSV or Excel (.xlsx) file. HOMEBOT will map your columns to the appropriate fields — asset name, category, make, model, serial number, purchase date, and warranty expiration. After import, consumable suggestions are generated automatically for any assets with make and model information.",
        screenshot: "CSV import dialog showing column mapping and preview of imported data",
      },
    ],
  },
  {
    slug: "inventory",
    name: "Managing Home Inventory",
    icon: "PackageIcon",
    summary:
      "Track consumables with reorder reminders, purchase links, and home asset connections.",
    keywords: "inventory consumables filters batteries reorder reminders alerts purchase buy links",
    sections: [
      {
        heading: "What Is Home Inventory?",
        body: "Home Inventory tracks the recurring consumables your home needs — air filters, water filters, batteries, light bulbs, cleaning supplies, and more. Unlike a simple shopping list, each inventory item has a reorder frequency so HOMEBOT can remind you when it's time to purchase replacements. Items can also link directly to purchase pages for quick reordering.",
        screenshot: "Inventory list page showing items with status indicators and reorder dates",
      },
      {
        heading: "Adding an Inventory Item",
        body: "Go to Home Inventory from the sidebar and click \"Add Item.\" Enter the item name, select a category, and set the reorder frequency (e.g., every 30 days, every 3 months, every year). You can also add a purchase URL — HOMEBOT will automatically fetch a product thumbnail image from the link. Optionally, link the item to a home asset so it appears on the asset's detail page.",
        screenshot: "Add Inventory Item form with name, category, frequency, and purchase URL fields",
      },
      {
        heading: "Reorder Reminders",
        body: "Each inventory item has a reorder frequency and a \"last ordered\" date. HOMEBOT calculates the next reminder date and shows a countdown on each item. When an item is due within 7 days, it gets flagged with an alert on both the Inventory page and the Dashboard. If you've enabled notifications in Settings, you'll also receive an email or SMS reminder.",
        screenshot: "Inventory item showing 'Due in 3 days' alert badge with reorder button",
      },
      {
        heading: "Quick Purchase Links",
        body: "When you add a purchase URL to an inventory item, HOMEBOT displays a \"Buy Now\" button that opens the product page directly. The item's detail page also shows a product card with the thumbnail image scraped from the URL. This makes reordering as simple as clicking a button when you get a reminder — no searching required.",
        screenshot: "Inventory detail page showing product card with thumbnail and Buy Now button",
      },
      {
        heading: "Linking to Home Assets",
        body: "Inventory items can be linked to specific home assets. For example, a furnace filter links to your HVAC system, or a water filter links to your refrigerator. When items are auto-generated from consumable suggestions, this link is created automatically. For manually-added items, edit the item and select a home asset from the dropdown. Linked items appear under \"Tracked Inventory\" on the asset's detail page.",
        screenshot: "Inventory item edit form showing home asset dropdown selection",
      },
    ],
  },
  {
    slug: "services",
    name: "Scheduling Home Services",
    icon: "ClipboardCheckIcon",
    summary:
      "Log recurring maintenance services with providers, due dates, costs, and frequencies.",
    keywords: "services maintenance hvac pest control gutter cleaning providers due dates frequency cost",
    sections: [
      {
        heading: "What Are Home Services?",
        body: "Home Services tracks the recurring maintenance your home needs — HVAC inspections, pest control treatments, gutter cleaning, lawn care, chimney sweeps, and more. Each service entry records the provider, cost, frequency, and due dates so you never miss a scheduled maintenance appointment.",
        screenshot: "Services list page showing services with providers and next due dates",
      },
      {
        heading: "Adding a Service",
        body: "Navigate to Home Services from the sidebar and click \"Add Service.\" Enter the service name (e.g., \"HVAC Inspection\"), select or enter the service provider, set the cost, and choose a frequency (monthly, quarterly, semi-annually, or annually). Set the last service date and HOMEBOT will automatically calculate the next due date.",
        screenshot: "Add Service form with name, provider, cost, frequency, and date fields",
      },
      {
        heading: "Tracking Due Dates",
        body: "HOMEBOT calculates the next due date for each service based on the frequency and last service date. Services due within 7 days are flagged with an alert on the Services page and the Dashboard. When a service is overdue, the alert turns red. After completing a service, update the last service date to reset the countdown for the next occurrence.",
        screenshot: "Service entry showing 'Due in 5 days' countdown with provider contact info",
      },
      {
        heading: "Service History",
        body: "Each service maintains a history of past completions with dates and costs. This helps you track total spending on each type of maintenance over time and provides a record for insurance or home sale documentation. You can view the complete service history on the service's detail page.",
        screenshot: "Service detail page showing history of past completions with dates and costs",
      },
      {
        heading: "Calendar Integration",
        body: "All service due dates automatically appear on the Calendar page. You can view them in either the week or month view alongside inventory reminders and other events. If you subscribe to your HOMEBOT calendar via the iCal feed, service reminders will sync to your phone's native calendar app.",
        screenshot: "Calendar month view highlighting upcoming service appointments",
      },
    ],
  },
  {
    slug: "contractors",
    name: "Building Your Contractor Directory",
    icon: "UsersIcon",
    summary:
      "Save contractor contact info, specialties, ratings, and link them to projects.",
    keywords: "contractors directory contact phone email ratings specialties logo projects",
    sections: [
      {
        heading: "Why Track Contractors?",
        body: "Over time, you'll work with many contractors — plumbers, electricians, roofers, landscapers, and more. The Contractors directory gives you one place to store their contact information, specialties, and your ratings of their work. When you need to hire for a new project, you'll have a trusted directory to reference instead of searching from scratch.",
        screenshot: "Contractors list page showing contractor cards with ratings and specialties",
      },
      {
        heading: "Adding a Contractor",
        body: "Go to Contractors from the sidebar and click \"Add Contractor.\" Enter the contractor's name, specialty (e.g., Plumbing, Electrical, HVAC), phone number, email, and website. If you provide a website URL, HOMEBOT will attempt to fetch the company's logo automatically to display on the contractor card.",
        screenshot: "Add Contractor form with name, specialty, contact fields, and website input",
      },
      {
        heading: "Rating and Reviewing",
        body: "After working with a contractor, you can rate their work using a 5-star rating system on their detail page. Add notes about the quality of work, communication, pricing, and whether you'd hire them again. These ratings help you remember your experience when considering contractors for future projects.",
        screenshot: "Contractor detail page showing star rating and review notes",
      },
      {
        heading: "Linking to Projects",
        body: "Connect contractors to the projects they worked on. When viewing a contractor's detail page, you can see all linked projects — giving you a complete history of their work on your home. Similarly, from a project's detail page, you can see which contractors were involved. This cross-linking makes it easy to trace who did what work and when.",
        screenshot: "Contractor detail page showing linked projects with dates and costs",
      },
    ],
  },
  {
    slug: "calendar",
    name: "Using the Calendar",
    icon: "CalendarIcon",
    summary:
      "View upcoming services, inventory reminders, and events — sync to your phone via iCal.",
    keywords: "calendar week month events reminders ical subscribe phone sync appointments",
    sections: [
      {
        heading: "Calendar Views",
        body: "The Calendar page offers two views — week and month. Toggle between them using the buttons at the top of the page. The week view shows a detailed day-by-day layout, while the month view gives you a broader overview. Navigate forward and backward using the arrow buttons, or click \"Today\" to jump back to the current date.",
        screenshot: "Calendar page showing month view with colored event dots on various dates",
      },
      {
        heading: "What Appears on the Calendar",
        body: "The calendar automatically populates with events from across HOMEBOT: service due dates, inventory reorder reminders, and any custom events you create. Each event type has a distinct color so you can quickly identify what's coming up. Click any event to see its details or navigate to the related service or inventory item.",
        screenshot: "Calendar week view showing different event types with color coding",
      },
      {
        heading: "Subscribing from Your Phone",
        body: "You can sync your HOMEBOT calendar to your phone so events appear alongside your personal calendar. On the Calendar page, click the \"Subscribe\" button to copy the iCal feed URL. On iPhone, go to Settings \u2192 Calendar \u2192 Accounts \u2192 Add Account \u2192 Other \u2192 Add Subscribed Calendar and paste the URL. On Android, open Google Calendar \u2192 Settings \u2192 Add calendar \u2192 From URL. Events will sync automatically and stay up to date.",
        screenshot: "Subscribe button with iCal URL and instructions for iPhone and Android",
      },
      {
        heading: "Creating Custom Events",
        body: "In addition to auto-generated reminders, you can create custom calendar events for any home-related appointments or deadlines. Click on a date in the calendar or use the \"Add Event\" button to create a new entry with a title, date, time, and optional notes. Custom events appear alongside your service and inventory reminders.",
        screenshot: "Add Event dialog with title, date, time, and notes fields",
      },
    ],
  },
  {
    slug: "settings",
    name: "Customizing Your Settings",
    icon: "GearIcon",
    summary:
      "Set your property name, switch themes, and configure email or SMS notifications.",
    keywords: "settings theme dark light property name email sms notifications preferences appearance",
    sections: [
      {
        heading: "Property Name",
        body: "Give your property a name — like your street address (\"1715 Red Hawk Trail\") or a nickname (\"Lake House\"). This name appears in the Dashboard header, making HOMEBOT feel personalized to your home. Enter the name in the Property section and click Save. You can change it anytime.",
        screenshot: "Property name input field showing an example address",
      },
      {
        heading: "Appearance / Theme",
        body: "Choose between Light, Dark, or System theme. Light mode uses a warm cream background with white cards. Dark mode switches to a dark palette that's easier on the eyes at night. System mode automatically matches your device's appearance setting — if your phone or computer switches to dark mode at sunset, HOMEBOT will follow along.",
        screenshot: "Theme selector showing Light, Dark, and System buttons with Light selected",
      },
      {
        heading: "Email Notifications",
        body: "Toggle on Email notifications to receive alerts at your account email address when inventory items are due for reorder or services are approaching their next due date. Emails are sent a few days before the due date so you have time to take action. Your notification email is the same address you used to create your account.",
        screenshot: "Email notification toggle in the enabled state showing the user's email address",
      },
      {
        heading: "SMS Notifications",
        body: "If you prefer text messages, toggle on SMS notifications and enter your phone number. HOMEBOT will send text message alerts for the same events as email — inventory reorder reminders and service due dates. You can enable both email and SMS, or just one. Click \"Save preferences\" after making any changes to ensure they take effect.",
        screenshot: "SMS notification toggle with phone number input field",
      },
    ],
  },
];

"use client";

import { useEffect, useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Gift,
  Globe2,
  Home,
  LayoutDashboard,
  ListChecks,
  Mail,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Trophy,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { cn, formatDate, formatTime } from "@/lib/utils";

type Child = {
  id: string;
  name: string;
  role: string;
  points: number;
  weekly: number;
  monthly: number;
  streak: number;
  color: string;
  badges: string[];
};

type Reward = {
  id: string;
  title: string;
  description: string;
  cost: number;
  category: string;
  quantity: number;
  status: "available" | "limited" | "archived";
  tint: string;
};

type FamilyEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  start: string;
  end: string;
  location: string;
  category: string;
  assigned: string[];
  color: string;
  reminder: string;
};

type Transaction = {
  id: string;
  date: string;
  child: string;
  activity: string;
  earned: number;
  redeemed: number;
  balance: number;
  notes: string;
};

type Notice = {
  id: string;
  message: string;
  detail: string;
  read: boolean;
  createdAt: string;
};

type Section = "dashboard" | "rewards" | "calendar" | "notifications" | "settings";
type CalendarView = "month" | "week" | "day" | "agenda";
type RewardSheetChild = "jiya" | "lakhan";

const queryClient = new QueryClient();

const seedChildren: Child[] = [
  {
    id: "lakhan",
    name: "Lakshan",
    role: "Child",
    points: 730,
    weekly: 165,
    monthly: 610,
    streak: 9,
    color: "from-sky-500 to-cyan-400",
    badges: ["Reading Rocket", "Chore Champ", "Kindness Streak"]
  },
  {
    id: "jiya",
    name: "Jiya",
    role: "Child",
    points: 420,
    weekly: 120,
    monthly: 390,
    streak: 6,
    color: "from-fuchsia-500 to-rose-400",
    badges: ["Homework Hero", "Helper Badge"]
  }
];

const seedRewards: Reward[] = [
  {
    id: "screen-time",
    title: "Extra Screen Time",
    description: "30 bonus minutes after homework is complete.",
    cost: 120,
    category: "Screen Time",
    quantity: 8,
    status: "available",
    tint: "from-cyan-400 to-blue-500"
  },
  {
    id: "family-movie",
    title: "Pick Family Movie",
    description: "Choose Friday night movie and snacks.",
    cost: 260,
    category: "Family Activities",
    quantity: 3,
    status: "limited",
    tint: "from-amber-300 to-orange-500"
  },
  {
    id: "lego-kit",
    title: "Mini Building Kit",
    description: "Redeem for a small building toy or craft kit.",
    cost: 480,
    category: "Toys",
    quantity: 2,
    status: "limited",
    tint: "from-emerald-400 to-teal-500"
  },
  {
    id: "dessert",
    title: "Special Dessert",
    description: "Choose dessert for a family dinner.",
    cost: 180,
    category: "Treats",
    quantity: 10,
    status: "available",
    tint: "from-pink-400 to-rose-500"
  }
];

const today = new Date();
const isoDay = (offset: number, hour = 9, minute = 0) => {
  const date = new Date(today);
  date.setDate(today.getDate() + offset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const seedEvents: FamilyEvent[] = [
  {
    id: "parent-teacher",
    title: "Parent Teacher Conference",
    description: "Bring reading folder and latest homework packet.",
    date: isoDay(1, 16, 0),
    start: "4:00 PM",
    end: "4:45 PM",
    location: "Lincoln Elementary",
    category: "School",
    assigned: ["Lakshan", "Parent"],
    color: "bg-sky-500",
    reminder: "1 hour"
  },
  {
    id: "soccer",
    title: "Soccer Practice",
    description: "Cleats, water, and blue jersey.",
    date: isoDay(2, 18, 30),
    start: "6:30 PM",
    end: "7:30 PM",
    location: "Riverside Field",
    category: "Sports",
    assigned: ["Jiya"],
    color: "bg-emerald-500",
    reminder: "15 minutes"
  },
  {
    id: "dentist",
    title: "Family Dentist",
    description: "Back-to-back cleanings for both children.",
    date: isoDay(5, 10, 0),
    start: "10:00 AM",
    end: "11:15 AM",
    location: "Smile Studio",
    category: "Appointments",
    assigned: ["Lakshan", "Jiya"],
    color: "bg-violet-500",
    reminder: "1 day"
  },
  {
    id: "game-night",
    title: "Board Game Night",
    description: "Lakshan chooses the first game, Jiya chooses dessert.",
    date: isoDay(6, 19, 0),
    start: "7:00 PM",
    end: "8:30 PM",
    location: "Home",
    category: "Family",
    assigned: ["Lakshan", "Jiya", "Parent"],
    color: "bg-amber-500",
    reminder: "1 hour"
  }
];

const seedTransactions: Transaction[] = [
  { id: "t1", date: isoDay(-1), child: "Lakshan", activity: "Reading", earned: 40, redeemed: 0, balance: 730, notes: "Finished two chapters" },
  { id: "t2", date: isoDay(-1), child: "Jiya", activity: "Good Behavior", earned: 35, redeemed: 0, balance: 420, notes: "Helped with dinner" },
  { id: "t3", date: isoDay(-3), child: "Lakshan", activity: "Reward Redemption", earned: 0, redeemed: 120, balance: 690, notes: "Extra Screen Time" },
  { id: "t4", date: isoDay(-4), child: "Jiya", activity: "Homework", earned: 55, redeemed: 0, balance: 385, notes: "Math packet complete" }
];

const seedNotifications: Notice[] = [
  { id: "n1", message: "Points added", detail: "Lakshan earned 40 points for reading.", read: false, createdAt: isoDay(-1, 18, 20) },
  { id: "n2", message: "Event reminder", detail: "Parent Teacher Conference is tomorrow.", read: false, createdAt: isoDay(0, 8, 0) },
  { id: "n3", message: "Reward redeemed", detail: "Extra Screen Time was redeemed this week.", read: true, createdAt: isoDay(-3, 17, 30) }
];

const rewardSheetChildren = [
  { id: "jiya", name: "Jiya", homeTask: "Wash dishes" },
  { id: "lakhan", name: "Lakshan", homeTask: "Vacuum home" }
] as const satisfies readonly { id: RewardSheetChild; name: string; homeTask: string }[];

const rewardSheetTasks = [
  { key: "wake", label: "Wake up on time", points: 1 },
  { key: "karate", label: "Kihon/Kumite/Kata", points: 1 },
  { key: "puzzles", label: "Assigned puzzles", points: 1 },
  { key: "bags", label: "Pack/Unpack bags", points: 1 },
  { key: "chess", label: "2 Chess.com games", points: 1 },
  { key: "classes", label: "Day classes", points: 1 },
  { key: "homeTask", label: "Home task", points: 1 }
] as const;

function App() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [children, setChildren] = useState(seedChildren);
  const [rewards, setRewards] = useState(seedRewards);
  const [events, setEvents] = useState(seedEvents);
  const [transactions, setTransactions] = useState(seedTransactions);
  const [notifications, setNotifications] = useState(seedNotifications);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [selectedChild, setSelectedChild] = useState("lakhan");
  const [rewardSheetChild, setRewardSheetChild] = useState<RewardSheetChild>("jiya");
  const [rewardToolsOpen, setRewardToolsOpen] = useState(false);
  const [openWebGroups, setOpenWebGroups] = useState<Record<string, boolean>>({});
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const { data } = useQuery({
    queryKey: ["family-seed"],
    queryFn: async () => ({ loaded: true }),
    initialData: { loaded: true },
    staleTime: Infinity
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const startSidebarResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    const resize = (moveEvent: PointerEvent) => {
      setSidebarWidth(Math.min(420, Math.max(236, startWidth + moveEvent.clientX - startX)));
    };
    const stopResize = () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
    };
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize);
  };

  const totalPoints = children.reduce((sum, child) => sum + child.points, 0);
  const pendingRewards = rewards.filter((reward) => reward.quantity > 0 && reward.status !== "archived").length;
  const upcomingEvents = events
    .filter((event) => new Date(event.date).getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const categories = ["All", ...Array.from(new Set(rewards.map((reward) => reward.category)))];
  const filteredRewards = rewards.filter((reward) => {
    const matchesSearch = `${reward.title} ${reward.description}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || reward.category === category;
    return matchesSearch && matchesCategory;
  });
  const monthDays = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);

  const addNotification = (message: string, detail: string) => {
    setNotifications((current) => [
      { id: crypto.randomUUID(), message, detail, read: false, createdAt: new Date().toISOString() },
      ...current
    ]);
  };

  const redeemReward = () => {
    if (!selectedReward) return;
    const child = children.find((item) => item.id === selectedChild);
    if (!child || child.points < selectedReward.cost || selectedReward.quantity < 1) return;

    setChildren((current) =>
      current.map((item) =>
        item.id === child.id ? { ...item, points: item.points - selectedReward.cost, weekly: Math.max(0, item.weekly - selectedReward.cost) } : item
      )
    );
    setRewards((current) =>
      current.map((reward) => (reward.id === selectedReward.id ? { ...reward, quantity: Math.max(0, reward.quantity - 1) } : reward))
    );
    setTransactions((current) => [
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        child: child.name,
        activity: "Reward Redemption",
        earned: 0,
        redeemed: selectedReward.cost,
        balance: child.points - selectedReward.cost,
        notes: selectedReward.title
      },
      ...current
    ]);
    addNotification("Reward redeemed", `${child.name} redeemed ${selectedReward.title}.`);
    setSelectedReward(null);
  };

  const createReward = (formData: FormData) => {
    const title = String(formData.get("reward-name") || "Custom Reward");
    const cost = Number(formData.get("reward-cost") || 100);
    const reward: Reward = {
      id: crypto.randomUUID(),
      title,
      description: String(formData.get("reward-description") || "A new family reward."),
      cost,
      category: String(formData.get("reward-category") || "Custom"),
      quantity: Number(formData.get("reward-quantity") || 1),
      status: "available",
      tint: "from-teal-400 to-lime-400"
    };
    setRewards((current) => [reward, ...current]);
    addNotification("Reward created", `${title} is now available for ${cost} points.`);
  };

  const addPoints = (formData: FormData) => {
    const childId = String(formData.get("child"));
    const points = Number(formData.get("points") || 0);
    const activity = String(formData.get("activity") || "Custom Activity");
    const notes = String(formData.get("notes") || "");
    const child = children.find((item) => item.id === childId);
    if (!child || !points) return;
    setChildren((current) => current.map((item) => (item.id === childId ? { ...item, points: item.points + points, weekly: item.weekly + points, monthly: item.monthly + points } : item)));
    setTransactions((current) => [
      { id: crypto.randomUUID(), date: new Date().toISOString(), child: child.name, activity, earned: points, redeemed: 0, balance: child.points + points, notes },
      ...current
    ]);
    addNotification("Points added", `${child.name} earned ${points} points for ${activity}.`);
  };

  const createEvent = (formData: FormData) => {
    const title = String(formData.get("event-title") || "New Event");
    const date = String(formData.get("event-date") || new Date().toISOString().slice(0, 10));
    const event: FamilyEvent = {
      id: crypto.randomUUID(),
      title,
      description: String(formData.get("event-description") || ""),
      date: new Date(`${date}T${String(formData.get("event-start") || "09:00")}:00`).toISOString(),
      start: timeToLabel(String(formData.get("event-start") || "09:00")),
      end: timeToLabel(String(formData.get("event-end") || "10:00")),
      location: String(formData.get("event-location") || "Home"),
      category: String(formData.get("event-category") || "Family"),
      assigned: String(formData.get("event-assigned") || "Lakshan,Jiya").split(",").map((item) => item.trim()).filter(Boolean),
      color: String(formData.get("event-color") || "bg-teal-500"),
      reminder: String(formData.get("event-reminder") || "1 hour")
    };
    setEvents((current) => [event, ...current]);
    addNotification("Event created", `${title} was added to the family calendar.`);
  };

  const moveEventToDate = (eventId: string, day: Date) => {
    setEvents((current) =>
      current.map((event) => {
        if (event.id !== eventId) return event;
        const original = new Date(event.date);
        const next = new Date(day);
        next.setHours(original.getHours(), original.getMinutes(), 0, 0);
        return { ...event, date: next.toISOString() };
      })
    );
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(20,184,166,0.24),transparent_28%),radial-gradient(circle_at_84%_0%,rgba(244,114,182,0.18),transparent_24%),linear-gradient(135deg,#f8fafc,#edf7f5_42%,#f5f3ff)] text-slate-950 transition-colors dark:bg-[radial-gradient(circle_at_12%_8%,rgba(45,212,191,0.16),transparent_28%),radial-gradient(circle_at_84%_0%,rgba(244,114,182,0.12),transparent_24%),linear-gradient(135deg,#020617,#0f172a_46%,#13251f)] dark:text-white">
      <div className="mx-auto flex w-full max-w-[1520px] gap-4 px-3 py-3 sm:px-5 lg:px-6">
        <aside
          className="sticky top-3 hidden h-[calc(100vh-1.5rem)] shrink-0 flex-col rounded-[1.75rem] border border-white/80 bg-white/70 p-4 shadow-panel backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60 lg:flex"
          style={{ width: sidebarWidth }}
        >
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-teal-300 dark:text-slate-950">
              <Home className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">Family Rewards</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Calendar HQ</p>
            </div>
          </div>
          <nav className="mt-5 space-y-2">
            {navItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white",
                    activeSection === item.id && "bg-slate-950 text-white shadow-glow hover:bg-slate-950 hover:text-white dark:bg-white dark:text-slate-950 dark:hover:bg-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </button>
                {item.id === "rewards" && activeSection === "rewards" && (
                  <button
                    onClick={() => setRewardToolsOpen(true)}
                    className="ml-10 mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Create rewards
                  </button>
                )}
                {item.id === "calendar" && (
                  <div className="mt-2 space-y-2">
                    {sidebarWebGroups.map((group) => (
                      <div key={group.label}>
                        <button
                          type="button"
                          onClick={() => setOpenWebGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
                          aria-expanded={Boolean(openWebGroups[group.label])}
                          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                          <Globe2 className="h-5 w-5" />
                          <span className="flex-1">{group.label}</span>
                          <ChevronRight className={cn("h-4 w-4 transition-transform", openWebGroups[group.label] && "rotate-90")} />
                        </button>
                        {openWebGroups[group.label] && (
                          <div className="ml-10 mt-1 space-y-1">
                            {group.links.map((link) => (
                              <a
                                key={link.href}
                                href={link.href}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                              >
                                {link.label}
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="mt-auto rounded-3xl bg-slate-950 p-5 text-white dark:bg-white dark:text-slate-950">
            <p className="text-sm font-semibold">Family plan</p>
            <p className="mt-2 text-xs leading-5 opacity-70">2 children, 4 upcoming events, private Supabase-ready workspace.</p>
            <div className="mt-5 flex -space-x-2">
              {["L", "J", "P", "G"].map((avatar) => (
                <span key={avatar} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-950 bg-teal-200 text-xs font-bold text-slate-950 dark:border-white">
                  {avatar}
                </span>
              ))}
            </div>
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            onPointerDown={startSidebarResize}
            className="absolute -right-2 top-8 h-[calc(100%-4rem)] w-4 cursor-col-resize rounded-full transition hover:bg-teal-300/30"
          />
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-3 z-30 mb-4 flex items-center justify-between rounded-[1.5rem] border border-white/80 bg-white/75 px-4 py-3 shadow-panel backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Today</p>
              <h1 className="truncate text-lg font-semibold sm:text-2xl">Welcome back, Ganesh Family</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/sign-in" className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white sm:inline-flex">
                Sign in
              </Link>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setActiveSection("notifications")}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white transition hover:-translate-y-0.5 dark:bg-teal-300 dark:text-slate-950"
                aria-label="Open notifications"
              >
                <Bell className="h-5 w-5" />
                {notifications.some((item) => !item.read) && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />}
              </button>
            </div>
          </header>

          <nav className="mb-4 grid grid-cols-5 gap-2 lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex h-12 items-center justify-center rounded-2xl border border-white/70 bg-white/72 text-slate-500 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-400",
                  activeSection === item.id && "bg-slate-950 text-white dark:bg-teal-300 dark:text-slate-950"
                )}
                aria-label={item.label}
              >
                <item.icon className="h-5 w-5" />
              </button>
            ))}
          </nav>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24 }}
            >
              {activeSection === "dashboard" && (
                <Dashboard
                  loaded={data.loaded}
                  children={children}
                  totalPoints={totalPoints}
                  pendingRewards={pendingRewards}
                  upcomingEvents={upcomingEvents}
                  transactions={transactions}
                  rewards={rewards}
                  setActiveSection={setActiveSection}
                />
              )}
              {activeSection === "rewards" && (
                <Rewards
                  children={children}
                  rewards={filteredRewards}
                  transactions={transactions}
                  categories={categories}
                  activeSheetChild={rewardSheetChild}
                  setActiveSheetChild={setRewardSheetChild}
                  search={search}
                  category={category}
                  setSearch={setSearch}
                  setCategory={setCategory}
                  openRewardTools={() => setRewardToolsOpen(true)}
                  setSelectedReward={setSelectedReward}
                />
              )}
              {activeSection === "calendar" && (
                <Calendar
                  events={events}
                  view={calendarView}
                  setView={setCalendarView}
                  monthCursor={monthCursor}
                  setMonthCursor={setMonthCursor}
                  monthDays={monthDays}
                  createEvent={createEvent}
                  moveEventToDate={moveEventToDate}
                  setEvents={setEvents}
                />
              )}
              {activeSection === "notifications" && (
                <Notifications notifications={notifications} setNotifications={setNotifications} />
              )}
              {activeSection === "settings" && <SettingsPanel theme={theme} setTheme={setTheme} />}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      <AnimatePresence>
        {rewardToolsOpen && (
          <RewardToolsModal
            familyChildren={children}
            createReward={(formData) => {
              createReward(formData);
              setRewardToolsOpen(false);
            }}
            addPoints={(formData) => {
              addPoints(formData);
              setRewardToolsOpen(false);
            }}
            onClose={() => setRewardToolsOpen(false)}
          />
        )}
        {selectedReward && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-panel dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-teal-700 dark:text-teal-200">Redeem reward</p>
                  <h2 className="mt-1 text-2xl font-semibold">{selectedReward.title}</h2>
                </div>
                <button className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => setSelectedReward(null)} aria-label="Close modal">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{selectedReward.description}</p>
              <label className="mt-5 block text-sm font-medium">
                Child
                <select value={selectedChild} onChange={(event) => setSelectedChild(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name} - {child.points} pts
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm dark:bg-white/10">
                <div className="flex justify-between">
                  <span>Cost</span>
                  <strong>{selectedReward.cost} pts</strong>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Available</span>
                  <strong>{selectedReward.quantity}</strong>
                </div>
              </div>
              <button onClick={redeemReward} className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 dark:bg-teal-300 dark:text-slate-950">
                Confirm redemption
              </button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

const navItems: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings }
];

const sidebarWebGroups = [
  {
    label: "FAMILY WEB",
    links: [
      { label: "Ganesh", href: "https://ganesh-sap-spark.lovable.app/" },
      { label: "Jiya", href: "https://art-empress-engine.lovable.app/" },
      { label: "Lakshan", href: "https://happy-url-craft.lovable.app/" }
    ]
  },
  {
    label: "OTHER WEB",
    links: [
      { label: "Chess lab", href: "https://chess-platform-chi.vercel.app/" },
      { label: "Expense tracker", href: "https://expense-tracker-frontend-hys6.onrender.com/" }
    ]
  }
] as const;

function Dashboard({
  loaded,
  children,
  totalPoints,
  pendingRewards,
  upcomingEvents,
  transactions,
  rewards,
  setActiveSection
}: {
  loaded: boolean;
  children: Child[];
  totalPoints: number;
  pendingRewards: number;
  upcomingEvents: FamilyEvent[];
  transactions: Transaction[];
  rewards: Reward[];
  setActiveSection: (section: Section) => void;
}) {
  const stats = [
    { label: "Total family points", value: totalPoints.toLocaleString(), icon: Trophy, tone: "bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-200" },
    { label: "Pending rewards", value: pendingRewards, icon: Gift, tone: "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200" },
    { label: "Upcoming events", value: upcomingEvents.length, icon: CalendarDays, tone: "bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200" },
    { label: "Redeemed this month", value: "6", icon: Check, tone: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200" }
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-panel dark:bg-white dark:text-slate-950 sm:p-8">
          <div className="absolute right-6 top-6 hidden h-28 w-28 rounded-full bg-teal-300/20 blur-3xl sm:block" />
          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-100 dark:bg-slate-950/10 dark:text-teal-700">
                <Sparkles className="h-4 w-4" />
                {loaded ? "Live dashboard" : "Loading"}
              </p>
              <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Rewards, routines, and the next family moment in one calm place.</h2>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/68 dark:text-slate-600">
                Parents can add points, create rewards, and manage events. Children can see balances, redeem rewards, and track what is coming up.
              </p>
            </div>
            <div className="min-w-[220px] rounded-3xl border border-white/10 bg-white/10 p-5 dark:border-slate-950/10 dark:bg-slate-950/5">
              <p className="text-sm opacity-70">{formatDate(new Date())}</p>
              <div className="mt-5 flex -space-x-3">
                {children.map((child) => (
                  <div key={child.id} className={cn("flex h-14 w-14 items-center justify-center rounded-full border-4 border-slate-950 bg-gradient-to-br text-lg font-bold text-white dark:border-white", child.color)}>
                    {child.name[0]}
                  </div>
                ))}
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-slate-950 bg-white text-sm font-bold text-slate-950 dark:border-white">+2</div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {children.map((child) => (
            <motion.div whileHover={{ y: -4 }} key={child.id} className="glass rounded-[1.5rem] p-5 shadow-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white", child.color)}>{child.name[0]}</div>
                  <div>
                    <p className="font-semibold">{child.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{child.role}</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-white/10">{child.streak} day streak</span>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Current points</p>
                  <p className="mt-1 text-4xl font-semibold">{child.points}</p>
                </div>
                <WalletCards className="h-10 w-10 text-teal-500" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <motion.article whileHover={{ y: -3 }} key={stat.label} className="glass rounded-[1.5rem] p-5 shadow-panel">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", stat.tone)}>
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="mt-5 text-3xl font-semibold">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Upcoming events" action="Open calendar" onAction={() => setActiveSection("calendar")}>
          <div className="space-y-3">
            {upcomingEvents.slice(0, 4).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </Panel>
        <Panel title="Monthly points activity">
          <div className="grid min-h-[245px] grid-cols-7 items-end gap-3">
            {[38, 64, 45, 78, 52, 92, 70].map((value, index) => (
              <div key={index} className="flex flex-col items-center gap-3">
                <div className="relative h-44 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${value}%` }}
                    transition={{ delay: index * 0.05, duration: 0.5 }}
                    className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-teal-500 to-lime-300"
                  />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="Quick reward redemption" action="Browse rewards" onAction={() => setActiveSection("rewards")}>
          <div className="grid gap-3">
            {rewards.slice(0, 3).map((reward) => (
              <div key={reward.id} className="flex items-center justify-between rounded-2xl bg-slate-100 p-3 dark:bg-white/10">
                <div className="flex items-center gap-3">
                  <div className={cn("h-11 w-11 rounded-2xl bg-gradient-to-br", reward.tint)} />
                  <div>
                    <p className="text-sm font-semibold">{reward.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{reward.cost} pts</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Recently earned points">
          <div className="space-y-3">
            {transactions.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-100 p-3 text-sm dark:bg-white/10">
                <div>
                  <p className="font-semibold">{item.child}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.activity}</p>
                </div>
                <span className={cn("font-semibold", item.earned ? "text-emerald-600" : "text-rose-500")}>{item.earned ? `+${item.earned}` : `-${item.redeemed}`}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Reward redemption trends">
          <div className="space-y-4">
            {["Screen Time", "Treats", "Family Activities", "Toys"].map((label, index) => (
              <div key={label}>
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="text-slate-500 dark:text-slate-400">{[42, 28, 18, 12][index]}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-white/10">
                  <div className="h-2 rounded-full bg-slate-950 dark:bg-teal-300" style={{ width: `${[42, 28, 18, 12][index]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Rewards({
  children,
  rewards,
  transactions,
  categories,
  activeSheetChild,
  setActiveSheetChild,
  search,
  category,
  setSearch,
  setCategory,
  openRewardTools,
  setSelectedReward
}: {
  children: Child[];
  rewards: Reward[];
  transactions: Transaction[];
  categories: string[];
  activeSheetChild: RewardSheetChild;
  setActiveSheetChild: (child: RewardSheetChild) => void;
  search: string;
  category: string;
  setSearch: (value: string) => void;
  setCategory: (value: string) => void;
  openRewardTools: () => void;
  setSelectedReward: (reward: Reward) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={openRewardTools}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 dark:bg-teal-300 dark:text-slate-950"
          >
            <Plus className="h-4 w-4" />
            Create rewards
          </button>
        </div>
        <RewardWorksheet activeChild={activeSheetChild} setActiveChild={setActiveSheetChild} />
        <Panel title="Rewards overview">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <Search className="h-5 w-5 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rewards" className="w-full bg-transparent text-sm outline-none" />
            </label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900">
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {rewards.map((reward) => (
              <motion.article whileHover={{ y: -4 }} key={reward.id} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className={cn("h-32 bg-gradient-to-br", reward.tint)}>
                  <div className="flex h-full items-end justify-between p-5 text-white">
                    <Gift className="h-10 w-10" />
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">{reward.category}</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{reward.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{reward.description}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-white/10">{reward.status}</span>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Point cost</p>
                      <p className="text-2xl font-semibold">{reward.cost}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Available</p>
                      <p className="text-2xl font-semibold">{reward.quantity}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedReward(reward)} className="mt-5 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:bg-teal-300 dark:text-slate-950">
                    Redeem reward
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </Panel>
        <Panel title="Points history">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Child</th>
                  <th className="pb-3">Activity</th>
                  <th className="pb-3">Earned</th>
                  <th className="pb-3">Redeemed</th>
                  <th className="pb-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {transactions.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3">{formatDate(item.date)}</td>
                    <td className="py-3 font-medium">{item.child}</td>
                    <td className="py-3">{item.activity}</td>
                    <td className="py-3 text-emerald-600">{item.earned || "-"}</td>
                    <td className="py-3 text-rose-500">{item.redeemed || "-"}</td>
                    <td className="py-3 font-semibold">{item.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Leaderboard">
          <div className="space-y-3">
            {[...children]
              .sort((left, right) => right.points - left.points)
              .map((child, index) => (
                <div key={child.id} className="flex items-center justify-between rounded-2xl bg-slate-100 p-3 dark:bg-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{child.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{child.badges[0]}</p>
                    </div>
                  </div>
                  <strong>{child.points}</strong>
                </div>
              ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function RewardToolsModal({
  familyChildren,
  createReward,
  addPoints,
  onClose
}: {
  familyChildren: Child[];
  createReward: (formData: FormData) => void;
  addPoints: (formData: FormData) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 cursor-default" onClick={onClose} />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-tools-title"
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-panel dark:bg-slate-950 sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Rewards</p>
            <h2 id="reward-tools-title" className="mt-1 text-2xl font-semibold">
              Create rewards & add points
            </h2>
          </div>
          <button className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} aria-label="Close rewards tools">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <h3 className="text-lg font-semibold">Create reward</h3>
            <form action={createReward} className="mt-4 space-y-3">
              <Input name="reward-name" label="Name" placeholder="Ice cream trip" />
              <Input name="reward-description" label="Description" placeholder="Choose a weekend dessert stop" />
              <div className="grid grid-cols-2 gap-3">
                <Input name="reward-cost" label="Point cost" type="number" placeholder="220" />
                <Input name="reward-quantity" label="Quantity" type="number" placeholder="3" />
              </div>
              <Input name="reward-category" label="Category" placeholder="Treats" />
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-300 dark:text-slate-950">
                <Plus className="h-4 w-4" />
                Add reward
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <h3 className="text-lg font-semibold">Add points</h3>
            <form action={addPoints} className="mt-4 space-y-3">
              <label className="block text-sm font-medium">
                Child
                <select name="child" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900">
                  {familyChildren.map((child) => (
                    <option value={child.id} key={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </label>
              <Input name="activity" label="Activity" placeholder="Chores" />
              <Input name="points" label="Points earned" type="number" placeholder="50" />
              <Input name="notes" label="Notes" placeholder="Cleaned room and folded laundry" />
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-300 dark:text-slate-950">
                <Award className="h-4 w-4" />
                Award points
              </button>
            </form>
          </section>
        </div>
      </motion.section>
    </motion.div>
  );
}

function RewardWorksheet({
  activeChild,
  setActiveChild
}: {
  activeChild: RewardSheetChild;
  setActiveChild: (child: RewardSheetChild) => void;
}) {
  const activeChildInfo = rewardSheetChildren.find((child) => child.id === activeChild) ?? rewardSheetChildren[0];
  const days = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => index + 1);
  }, []);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(today).replace(" ", "'");
  const [sheetValues, setSheetValues] = useState<Record<string, string>>({});

  const valueKey = (day: number, task: string) => `${activeChild}-${day}-${task}`;
  const updateCell = (day: number, task: string, value: string) => {
    const clean = value.replace(/[^\d]/g, "").slice(0, 2);
    setSheetValues((current) => ({ ...current, [valueKey(day, task)]: clean }));
  };

  const countsTowardTotal = (task: (typeof rewardSheetTasks)[number]) => {
    if (task.key === "wake") return false;
    if (task.key === "homeTask" && activeChildInfo.homeTask === "Wash dishes") return false;
    return true;
  };

  const getRowTotal = (day: number) =>
    rewardSheetTasks.reduce((sum, task) => sum + (countsTowardTotal(task) ? Number(sheetValues[valueKey(day, task.key)] || 0) : 0), 0);

  return (
    <Panel title="Daily rewards sheets">
      <div className="mb-5 grid gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/10 sm:grid-cols-2">
        {rewardSheetChildren.map((child) => (
          <button
            key={child.id}
            onClick={() => setActiveChild(child.id)}
            className={cn(
              "rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-white",
              activeChild === child.id && "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white"
            )}
          >
            {child.name}
          </button>
        ))}
      </div>
      <div className="min-h-[420px] max-h-[calc(100vh-310px)] resize-y overflow-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-100 text-xs uppercase tracking-[0.11em] text-slate-500 dark:bg-white/10 dark:text-slate-300">
              <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-100 px-3 py-3 dark:border-white/10 dark:bg-slate-900">
                {monthLabel}
              </th>
              {rewardSheetTasks.map((task) => (
                <th key={task.key} className="border-b border-r border-slate-200 px-3 py-3 dark:border-white/10">
                  <span>{task.key === "homeTask" ? activeChildInfo.homeTask : task.label}</span>
                </th>
              ))}
              <th className="border-b border-slate-200 px-3 py-3 dark:border-white/10">Total</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={`${activeChild}-${day}`} className="odd:bg-white even:bg-slate-50 dark:odd:bg-transparent dark:even:bg-white/5">
                <td className="sticky left-0 z-10 border-r border-slate-200 bg-inherit px-3 py-2 text-right font-semibold tabular-nums dark:border-white/10">
                  {day}
                </td>
                {rewardSheetTasks.map((task) => (
                  <td key={task.key} className="border-r border-slate-200 p-0 dark:border-white/10">
                    <input
                      aria-label={`${activeChildInfo.name} ${task.key === "homeTask" ? activeChildInfo.homeTask : task.label} day ${day}`}
                      inputMode="numeric"
                      value={sheetValues[valueKey(day, task.key)] ?? ""}
                      onChange={(event) => updateCell(day, task.key, event.target.value)}
                      placeholder=" "
                      className="h-10 w-full min-w-[118px] border-0 bg-transparent px-3 text-center text-sm font-semibold outline-none transition focus:bg-teal-50 dark:focus:bg-teal-300/10"
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-center">
                  <span className="inline-flex min-w-14 justify-center rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white dark:bg-teal-300 dark:text-slate-950">
                    {getRowTotal(day)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Calendar({
  events,
  view,
  setView,
  monthCursor,
  setMonthCursor,
  monthDays,
  createEvent,
  moveEventToDate,
  setEvents
}: {
  events: FamilyEvent[];
  view: CalendarView;
  setView: (view: CalendarView) => void;
  monthCursor: Date;
  setMonthCursor: (date: Date) => void;
  monthDays: Date[];
  createEvent: (formData: FormData) => void;
  moveEventToDate: (eventId: string, day: Date) => void;
  setEvents: React.Dispatch<React.SetStateAction<FamilyEvent[]>>;
}) {
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(monthCursor);
  const visibleEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dayEvents = visibleEvents.filter((event) => new Date(event.date).toDateString() === new Date().toDateString());

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <section className="space-y-4">
        <Panel title="Family calendar">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="rounded-full border border-slate-200 p-2 dark:border-white/10" aria-label="Previous month">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="min-w-[190px] text-center text-xl font-semibold">{monthLabel}</h2>
              <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="rounded-full border border-slate-200 p-2 dark:border-white/10" aria-label="Next month">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 rounded-2xl bg-slate-100 p-1 dark:bg-white/10">
              {(["month", "week", "day", "agenda"] as CalendarView[]).map((item) => (
                <button key={item} onClick={() => setView(item)} className={cn("rounded-xl px-3 py-2 text-xs font-semibold capitalize text-slate-500", view === item && "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white")}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          {view === "month" && (
            <div className="mt-5">
              <div className="calendar-grid mb-2 grid gap-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="calendar-grid grid gap-2">
                {monthDays.map((day) => {
                  const inMonth = day.getMonth() === monthCursor.getMonth();
                  const eventsForDay = visibleEvents.filter((event) => new Date(event.date).toDateString() === day.toDateString());
                  return (
                    <div
                      key={day.toISOString()}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(drop) => moveEventToDate(drop.dataTransfer.getData("text/plain"), day)}
                      className={cn("min-h-[116px] rounded-2xl border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-white/5", !inMonth && "opacity-35")}
                    >
                      <p className="text-xs font-semibold">{day.getDate()}</p>
                      <div className="mt-2 space-y-1">
                        {eventsForDay.slice(0, 3).map((event) => (
                          <div key={event.id} draggable onDragStart={(drag) => drag.dataTransfer.setData("text/plain", event.id)} className={cn("cursor-grab truncate rounded-lg px-2 py-1 text-[11px] font-semibold text-white", event.color)}>
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view !== "month" && (
            <div className="mt-5 space-y-3">
              {(view === "day" ? dayEvents : visibleEvents.slice(0, view === "week" ? 7 : 12)).map((event) => (
                <EventDetail key={event.id} event={event} setEvents={setEvents} />
              ))}
            </div>
          )}
        </Panel>
      </section>
      <aside className="space-y-4">
        <Panel title="Create event">
          <form action={createEvent} className="space-y-3">
            <Input name="event-title" label="Event title" placeholder="Piano lesson" />
            <Input name="event-description" label="Description" placeholder="Bring lesson book" />
            <Input name="event-date" label="Date" type="date" />
            <div className="grid grid-cols-2 gap-3">
              <Input name="event-start" label="Start" type="time" />
              <Input name="event-end" label="End" type="time" />
            </div>
            <Input name="event-location" label="Location" placeholder="Community center" />
            <Input name="event-assigned" label="Assigned members" placeholder="Lakshan, Jiya" />
            <div className="grid grid-cols-2 gap-3">
              <Input name="event-category" label="Category" placeholder="School" />
              <label className="block text-sm font-medium">
                Reminder
                <select name="event-reminder" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900">
                  {["15 minutes", "1 hour", "1 day", "1 week"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium">
              Color category
              <select name="event-color" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900">
                {["bg-sky-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"].map((item) => (
                  <option value={item} key={item}>
                    {item.replace("bg-", "").replace("-500", "")}
                  </option>
                ))}
              </select>
            </label>
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-300 dark:text-slate-950">
              <Plus className="h-4 w-4" />
              Add event
            </button>
          </form>
        </Panel>
        <Panel title="Next 7 days">
          <div className="space-y-3">
            {visibleEvents.slice(0, 5).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function Notifications({
  notifications,
  setNotifications
}: {
  notifications: Notice[];
  setNotifications: React.Dispatch<React.SetStateAction<Notice[]>>;
}) {
  return (
    <Panel title="Notification center">
      <div className="mb-5 flex justify-end">
        <button onClick={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-teal-300 dark:text-slate-950">
          Mark all read
        </button>
      </div>
      <div className="grid gap-3">
        {notifications.map((notice) => (
          <article key={notice.id} className={cn("rounded-2xl border p-4", notice.read ? "border-slate-200 bg-white/50 dark:border-white/10 dark:bg-white/5" : "border-teal-300 bg-teal-50 dark:border-teal-300/30 dark:bg-teal-300/10")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{notice.message}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{notice.detail}</p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(notice.createdAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function SettingsPanel({ theme, setTheme }: { theme: "light" | "dark"; setTheme: (theme: "light" | "dark") => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Family settings">
        <div className="space-y-4">
          <Input label="Family name" name="family-name" placeholder="Ganesh Family" />
          <Input label="Invite member email" name="invite" placeholder="guardian@example.com" />
          <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-300 dark:text-slate-950">
            <Mail className="h-4 w-4" />
            Send invite
          </button>
        </div>
      </Panel>
      <Panel title="Account and theme">
        <div className="space-y-4">
          <Input label="Name" name="name" placeholder="Parent" />
          <Input label="Email" name="email" placeholder="parent@example.com" />
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/10">
            {(["light", "dark", "system"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setTheme(item === "system" ? "light" : item)}
                className={cn("rounded-xl px-3 py-2 text-sm font-semibold capitalize text-slate-500", (item === theme || (item === "system" && theme === "light")) && "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <section className="glass rounded-[1.5rem] p-5 shadow-panel sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action ? (
          <button onClick={onAction} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
            {action}
          </button>
        ) : (
          <MoreHorizontal className="h-5 w-5 text-slate-400" />
        )}
      </div>
      {children}
    </section>
  );
}

function Input({ label, name, placeholder, type = "text" }: { label: string; name: string; placeholder?: string; type?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input name={name} type={type} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 dark:border-white/10 dark:bg-white/5" />
    </label>
  );
}

function EventRow({ event }: { event: FamilyEvent }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-100 p-3 dark:bg-white/10">
      <div className={cn("h-12 w-2 rounded-full", event.color)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{event.title}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {formatDate(event.date)} at {event.start}
        </p>
      </div>
      <Clock className="h-4 w-4 text-slate-400" />
    </div>
  );
}

function EventDetail({ event, setEvents }: { event: FamilyEvent; setEvents: React.Dispatch<React.SetStateAction<FamilyEvent[]>> }) {
  const duplicate = () =>
    setEvents((current) => [
      { ...event, id: crypto.randomUUID(), title: `${event.title} copy`, date: isoDay(7, new Date(event.date).getHours(), new Date(event.date).getMinutes()) },
      ...current
    ]);
  const remove = () => setEvents((current) => current.filter((item) => item.id !== event.id));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("h-3 w-3 rounded-full", event.color)} />
            <h3 className="font-semibold">{event.title}</h3>
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{event.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[event.category, event.location, event.reminder, ...event.assigned].map((item) => (
              <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-white/10">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={duplicate} className="rounded-full border border-slate-200 p-2 dark:border-white/10" aria-label="Duplicate event">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={remove} className="rounded-full border border-slate-200 p-2 text-rose-500 dark:border-white/10" aria-label="Delete event">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function buildMonthGrid(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function timeToLabel(time: string) {
  const [hourString, minuteString] = time.split(":");
  const date = new Date();
  date.setHours(Number(hourString), Number(minuteString || 0), 0, 0);
  return formatTime(date);
}

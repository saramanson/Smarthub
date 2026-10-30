"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import {
  Award,
  Bell,
  Camera,
  CalendarDays,
  Check,
  CircleCheckBig,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Gift,
  Globe2,
  Heart,
  Home,
  LayoutDashboard,
  Leaf,
  ListChecks,
  Mail,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Save,
  Settings,
  ShoppingBasket,
  Sparkles,
  Star,
  Sun,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  Utensils,
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

type PantryItem = {
  id: string;
  purchased: boolean;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

type Expense = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  bill?: BillAttachment;
};

type ChoreFrequency = "Daily" | "Weekly" | "Monthly" | "Annual";
type ChoreAssignee = "Ganesh" | "Nisha" | "Jiya" | "Lakshan";

type Chore = {
  id: string;
  title: string;
  category: string;
  frequency: ChoreFrequency;
  schedule: string;
  assignee: ChoreAssignee;
  completed: boolean;
  completedAt?: string;
};

const choreFamilyMembers: Array<{ name: ChoreAssignee; role: string; initials: string; color: string; softColor: string }> = [
  { name: "Ganesh", role: "Father", initials: "G", color: "#0f766e", softColor: "bg-teal-100 text-teal-800 dark:bg-teal-300/15 dark:text-teal-100" },
  { name: "Nisha", role: "Mother", initials: "N", color: "#db2777", softColor: "bg-pink-100 text-pink-800 dark:bg-pink-300/15 dark:text-pink-100" },
  { name: "Jiya", role: "Daughter", initials: "J", color: "#7c3aed", softColor: "bg-violet-100 text-violet-800 dark:bg-violet-300/15 dark:text-violet-100" },
  { name: "Lakshan", role: "Son", initials: "L", color: "#0284c7", softColor: "bg-sky-100 text-sky-800 dark:bg-sky-300/15 dark:text-sky-100" }
];

function isChoreAssignee(value: string): value is ChoreAssignee {
  return choreFamilyMembers.some((member) => member.name === value);
}

type BillAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: string;
};

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const expenseBillDatabaseName = "smart-home-expense-bills";
const expenseBillStoreName = "bills";
const maxBillFileSize = 25 * 1024 * 1024;

function isSupportedBillFile(file: File) {
  return file.type === "application/pdf" || file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|pdf)$/i.test(file.name);
}

function openExpenseBillDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(expenseBillDatabaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(expenseBillStoreName)) request.result.createObjectStore(expenseBillStoreName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open bill storage."));
  });
}

async function saveExpenseBill(file: File): Promise<BillAttachment> {
  const attachment: BillAttachment = { id: crypto.randomUUID(), name: file.name, type: file.type || "application/octet-stream", size: file.size, addedAt: new Date().toISOString() };
  const database = await openExpenseBillDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(expenseBillStoreName, "readwrite");
      transaction.objectStore(expenseBillStoreName).put(file, attachment.id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save bill attachment."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Could not save bill attachment."));
    });
    return attachment;
  } finally {
    database.close();
  }
}

async function readExpenseBill(id: string) {
  const database = await openExpenseBillDatabase();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const request = database.transaction(expenseBillStoreName, "readonly").objectStore(expenseBillStoreName).get(id);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(request.error ?? new Error("Could not read bill attachment."));
    });
  } finally {
    database.close();
  }
}

async function deleteExpenseBill(id: string) {
  const database = await openExpenseBillDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(expenseBillStoreName, "readwrite");
      transaction.objectStore(expenseBillStoreName).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not delete bill attachment."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Could not delete bill attachment."));
    });
  } finally {
    database.close();
  }
}

type MenuMeal = {
  id: string;
  day: number;
  slot: "Breakfast" | "Lunch" | "Dinner" | "Snacks & drinks";
  name: string;
  isVeg: boolean;
  swapSuggestion?: string;
};

type MenuSide = {
  id: string;
  day: number;
  label: string;
  name: string;
  note?: string;
};

type Section = "dashboard" | "rewards" | "calendar" | "pantry" | "chores" | "expense" | "menu-planner" | "notifications" | "settings";
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

const legacyGrocerySeed: PantryItem[] = [
  { id: "pantry-01", purchased: false, category: "Dals & Pulses", name: "Split Pigeon Peas (Thuvaram Paruppu / துவரம் பருப்பு)", quantity: 2, unit: "kg", unitPrice: 4.5 },
  { id: "pantry-02", purchased: false, category: "Dals & Pulses", name: "Split Yellow Mung Dal (Paasi Paruppu / பாசி பருப்பு)", quantity: 1, unit: "kg", unitPrice: 3.99 },
  { id: "pantry-03", purchased: false, category: "Dals & Pulses", name: "Split Bengal Gram / Chana Dal (Kadalai Paruppu / கடலை பருப்பு)", quantity: 1, unit: "kg", unitPrice: 3.49 },
  { id: "pantry-04", purchased: false, category: "Dals & Pulses", name: "Split Black Gram / Urad Dal (Ulutham Paruppu / உளுத்தம் பருப்பு)", quantity: 1, unit: "kg", unitPrice: 4.29 },
  { id: "pantry-05", purchased: false, category: "Dals & Pulses", name: "Red Lentils / Masoor Dal (Masoor Paruppu / மசூர் பருப்பு)", quantity: 1, unit: "kg", unitPrice: 3.29 },
  { id: "pantry-06", purchased: false, category: "Dals & Pulses", name: "Chickpeas / Kabuli Chana (Kondaikadalai / கொண்டைக்கடலை)", quantity: 2, unit: "kg", unitPrice: 3.89 },
  { id: "pantry-07", purchased: true, category: "Grains & Flours", name: "Basmati Rice (Basmati Arisi / பாசுமதி அரிசி)", quantity: 5, unit: "kg", unitPrice: 14.99 },
  { id: "pantry-08", purchased: true, category: "Grains & Flours", name: "Whole Wheat Flour / Atta (Godhumai Maavu / கோதுமை மாவு)", quantity: 10, unit: "kg", unitPrice: 12.99 },
  { id: "pantry-09", purchased: false, category: "Grains & Flours", name: "Sona Masoori Rice (Sona Masoori Arisi / சோனா மசூரி அரிசி)", quantity: 5, unit: "kg", unitPrice: 11.49 },
  { id: "pantry-10", purchased: false, category: "Grains & Flours", name: "Semolina / Rava (Sooji / ரவை)", quantity: 1, unit: "kg", unitPrice: 2.49 },
  { id: "pantry-11", purchased: false, category: "Grains & Flours", name: "Flattened Rice / Poha (Aval / அவல்)", quantity: 1, unit: "kg", unitPrice: 2.99 },
  { id: "pantry-12", purchased: true, category: "Spices & Masalas", name: "Turmeric Powder (Manjal Thool / மஞ்சள் தூள்)", quantity: 1, unit: "pack", unitPrice: 2.99 },
  { id: "pantry-13", purchased: false, category: "Spices & Masalas", name: "Cumin Seeds (Seeragam / சீரகம்)", quantity: 1, unit: "pack", unitPrice: 3.49 },
  { id: "pantry-14", purchased: false, category: "Spices & Masalas", name: "Mustard Seeds (Kadugu / கடுகு)", quantity: 1, unit: "pack", unitPrice: 2.29 },
  { id: "pantry-15", purchased: false, category: "Spices & Masalas", name: "Kashmiri Red Chili (Kashmiri Milagai / காஷ்மீரி மிளகாய்)", quantity: 1, unit: "pack", unitPrice: 3.99 },
  { id: "pantry-16", purchased: false, category: "Spices & Masalas", name: "Coriander Powder (Malli Thool / மல்லித் தூள்)", quantity: 1, unit: "pack", unitPrice: 2.79 },
  { id: "pantry-17", purchased: false, category: "Spices & Masalas", name: "Garam Masala (Garam Masala / கரம் மசாலா)", quantity: 1, unit: "pack", unitPrice: 4.49 },
  { id: "pantry-18", purchased: false, category: "Spices & Masalas", name: "Asafoetida / Hing (Perungayam / பெருங்காயம்)", quantity: 1, unit: "tin", unitPrice: 3.99 },
  { id: "pantry-19", purchased: false, category: "Spices & Masalas", name: "Green Cardamom (Elakkai / ஏலக்காய்)", quantity: 1, unit: "pack", unitPrice: 5.99 },
  { id: "pantry-20", purchased: true, category: "Oils & Ghee", name: "Clarified Butter / Ghee (Nei / நெய்)", quantity: 1, unit: "jar", unitPrice: 16.99 },
  { id: "pantry-21", purchased: false, category: "Oils & Ghee", name: "Mustard Oil (Kadugu Ennai / கடுகு எண்ணெய்)", quantity: 1, unit: "bottle", unitPrice: 6.49 },
  { id: "pantry-22", purchased: false, category: "Oils & Ghee", name: "Sunflower Cooking Oil (Sooriyagandhi Ennai / சூரியகாந்தி எண்ணெய்)", quantity: 2, unit: "bottle", unitPrice: 7.99 },
  { id: "pantry-23", purchased: false, category: "Oils & Ghee", name: "Cold Pressed Coconut Oil (Thengai Ennai / தேங்காய் எண்ணெய்)", quantity: 1, unit: "jar", unitPrice: 5.49 },
  { id: "pantry-24", purchased: false, category: "Dairy & Fresh", name: "Paneer / Cottage Cheese (Paneer / பன்னீர்)", quantity: 2, unit: "pack", unitPrice: 5.99 },
  { id: "pantry-25", purchased: false, category: "Dairy & Fresh", name: "Curd / Yogurt (Thayir / தயிர்)", quantity: 1, unit: "tub", unitPrice: 4.29 },
  { id: "pantry-26", purchased: false, category: "Dairy & Fresh", name: "Fresh Whole Milk (Pasum Paal / பசும் பால்)", quantity: 1, unit: "gallon", unitPrice: 4.19 },
  { id: "pantry-27", purchased: false, category: "Dairy & Fresh", name: "Salted Butter (Vennai / வெண்ணெய்)", quantity: 1, unit: "pack", unitPrice: 5.49 },
  { id: "pantry-28", purchased: true, category: "Produce & Aromatics", name: "Red Onions (Vengayam / வெங்காயம்)", quantity: 5, unit: "lb", unitPrice: 3.99 },
  { id: "pantry-29", purchased: false, category: "Produce & Aromatics", name: "Fresh Ginger (Inji / இஞ்சி)", quantity: 1, unit: "lb", unitPrice: 1.99 },
  { id: "pantry-30", purchased: false, category: "Produce & Aromatics", name: "Fresh Garlic (Poondu / பூண்டு)", quantity: 2, unit: "pack", unitPrice: 2.49 },
  { id: "pantry-31", purchased: false, category: "Produce & Aromatics", name: "Green Chilies (Pachai Milagai / பச்சை மிளகாய்)", quantity: 1, unit: "pack", unitPrice: 1.49 },
  { id: "pantry-32", purchased: false, category: "Produce & Aromatics", name: "Curry Leaves & Cilantro (Kariveppilai & Kothamalli / கரிவேப்பிலை & கொத்தமல்லி)", quantity: 2, unit: "bunch", unitPrice: 1.99 },
  { id: "pantry-33", purchased: false, category: "Meat & Seafood", name: "Fresh Chicken (Kozhi / கோழி)", quantity: 2, unit: "kg", unitPrice: 8.99 },
  { id: "pantry-34", purchased: false, category: "Meat & Seafood", name: "Mutton / Goat Meat (Aattukari / ஆட்டுக்கறி)", quantity: 1, unit: "kg", unitPrice: 18.99 },
  { id: "pantry-35", purchased: false, category: "Meat & Seafood", name: "Fresh Fish (Meen / மீன்)", quantity: 1, unit: "kg", unitPrice: 12.99 },
  { id: "pantry-36", purchased: false, category: "Meat & Seafood", name: "Fresh Prawns (Eral / இறால்)", quantity: 1, unit: "kg", unitPrice: 11.99 },
  { id: "pantry-37", purchased: false, category: "Meat & Seafood", name: "Eggs (Muttai / முட்டை)", quantity: 1, unit: "pack", unitPrice: 4.49 },
  { id: "pantry-38", purchased: false, category: "Vegetables", name: "Tomatoes (Thakkali / தக்காளி)", quantity: 2, unit: "kg", unitPrice: 2.99 },
  { id: "pantry-39", purchased: false, category: "Vegetables", name: "Potatoes (Urulaikizhangu / உருளைக்கிழங்கு)", quantity: 2, unit: "kg", unitPrice: 2.49 },
  { id: "pantry-40", purchased: false, category: "Vegetables", name: "Brinjal (Kathirikai / கத்திரிக்காய்)", quantity: 1, unit: "kg", unitPrice: 3.49 },
  { id: "pantry-41", purchased: false, category: "Vegetables", name: "Okra (Vendakkai / வெண்டைக்காய்)", quantity: 1, unit: "kg", unitPrice: 3.99 },
  { id: "pantry-42", purchased: false, category: "Vegetables", name: "Drumstick (Murungakkai / முருங்கைக்காய்)", quantity: 1, unit: "pack", unitPrice: 2.99 },
  { id: "pantry-43", purchased: false, category: "Vegetables", name: "Carrots (Carrot / கேரட்)", quantity: 1, unit: "kg", unitPrice: 2.49 },
  { id: "pantry-44", purchased: false, category: "Vegetables", name: "Green Beans (Beans / பீன்ஸ்)", quantity: 1, unit: "kg", unitPrice: 3.49 },
  { id: "pantry-45", purchased: false, category: "Fruits", name: "Bananas (Vazhaipazham / வாழைப்பழம்)", quantity: 1, unit: "bunch", unitPrice: 2.49 },
  { id: "pantry-46", purchased: false, category: "Fruits", name: "Apples (Aappil / ஆப்பிள்)", quantity: 2, unit: "kg", unitPrice: 3.99 },
  { id: "pantry-47", purchased: false, category: "Fruits", name: "Mangoes (Mambazham / மாம்பழம்)", quantity: 1, unit: "box", unitPrice: 8.99 },
  { id: "pantry-48", purchased: false, category: "Fruits", name: "Pomegranate (Mathulai / மாதுளை)", quantity: 2, unit: "pack", unitPrice: 4.49 },
  { id: "pantry-49", purchased: false, category: "Fruits", name: "Sweet Lime (Sathukudi / சாத்துக்குடி)", quantity: 1, unit: "kg", unitPrice: 3.99 },
  { id: "pantry-50", purchased: false, category: "Fruits", name: "Grapes (Thiratchai / திராட்சை)", quantity: 1, unit: "pack", unitPrice: 3.49 },
  { id: "pantry-51", purchased: false, category: "Snacks", name: "Murukku (Murukku / முறுக்கு)", quantity: 2, unit: "pack", unitPrice: 3.49 },
  { id: "pantry-52", purchased: false, category: "Snacks", name: "Madras Mixture (Mixture / மிக்சர்)", quantity: 1, unit: "pack", unitPrice: 3.99 },
  { id: "pantry-53", purchased: false, category: "Snacks", name: "Banana Chips (Nenthiran Chips / நேந்திரம் சிப்ஸ்)", quantity: 2, unit: "pack", unitPrice: 3.29 },
  { id: "pantry-54", purchased: false, category: "Snacks", name: "Thattai (Thattai / தட்டை)", quantity: 1, unit: "pack", unitPrice: 3.49 },
  { id: "pantry-55", purchased: false, category: "Snacks", name: "Ribbon Pakoda (Ribbon Pakoda / ரிப்பன் பக்கோடா)", quantity: 1, unit: "pack", unitPrice: 3.49 },
  { id: "pantry-56", purchased: false, category: "Snacks", name: "Peanut Chikki (Kadalai Mittai / கடலை மிட்டாய்)", quantity: 2, unit: "pack", unitPrice: 2.99 },
  { id: "pantry-57", purchased: false, category: "Snacks", name: "Chocolates (Chocolate / சாக்லேட்)", quantity: 2, unit: "pack", unitPrice: 3.99 },
  { id: "pantry-58", purchased: false, category: "Snacks", name: "Biscuits (Biscuits / பிஸ்கட்)", quantity: 2, unit: "pack", unitPrice: 2.99 },
  { id: "pantry-59", purchased: false, category: "Snacks", name: "Biscotti (Biscotti / பிஸ்கோட்டி)", quantity: 1, unit: "pack", unitPrice: 4.49 },
  { id: "pantry-60", purchased: false, category: "Snacks", name: "Pretzels (Pretzels / பிரெட்ஸெல்ஸ்)", quantity: 1, unit: "pack", unitPrice: 3.49 }
];

const householdInventorySeed: ReadonlyArray<readonly [boolean, string, string, number, string, number]> = [
  [false, "Personal care", "Antiperspirant / Deodorant", 2, "stick", 4.99],
  [false, "Personal care", "Bath soap / Hand soap", 4, "bar", 1.49],
  [false, "Personal care", "Condoms / Other b.c.", 1, "pack", 9.99],
  [false, "Personal care", "Cosmetics", 1, "item", 12.5],
  [true, "Personal care", "Cotton swabs / Balls", 1, "pack", 2.79],
  [false, "Personal care", "Facial cleanser", 1, "bottle", 6.49],
  [false, "Personal care", "Facial tissue", 3, "box", 1.99],
  [false, "Personal care", "Hair gel / Spray", 1, "can", 4.29],
  [true, "Personal care", "Lip balm", 2, "tube", 2.19],
  [false, "Personal care", "Moisturizing lotion", 1, "bottle", 7.99],
  [false, "Personal care", "Mouthwash", 1, "bottle", 5.49],
  [false, "Personal care", "Razors / Shaving cream", 1, "pack", 8.99],
  [true, "Personal care", "Shampoo / Conditioner", 2, "bottle", 5.99],
  [false, "Personal care", "Toilet paper", 1, "pack", 14.99],
  [false, "Personal care", "Toothpaste", 2, "tube", 3.49],
  [false, "Cleaning products", "Air freshener", 2, "spray", 3.29],
  [false, "Cleaning products", "Bathroom cleaner", 1, "bottle", 4.19],
  [false, "Cleaning products", "Bleach / Detergent", 1, "jug", 11.99],
  [true, "Cleaning products", "Dish / Dishwasher soap", 2, "bottle", 3.79],
  [false, "Cleaning products", "Garbage bags", 1, "box", 9.49],
  [false, "Cleaning products", "Glass cleaner", 1, "bottle", 3.49],
  [false, "Cleaning products", "Mop head / Vacuum bags", 1, "pack", 7.99],
  [false, "Cleaning products", "Sponges / Scrubbers", 1, "pack", 3.99],
  [false, "Kitchen", "Aluminum foil", 1, "roll", 4.49],
  [false, "Kitchen", "Napkins", 2, "pack", 2.99],
  [false, "Kitchen", "Non-stick spray", 1, "can", 3.29],
  [true, "Kitchen", "Paper towels", 1, "pack", 12.99],
  [false, "Kitchen", "Plastic wrap", 1, "roll", 3.79],
  [false, "Kitchen", "Sandwich / Freezer bags", 2, "box", 3.99],
  [false, "Kitchen", "Wax paper", 1, "roll", 2.89],
  [false, "Office supplies", "CDRs / DVDRs", 1, "pack", 6.99],
  [false, "Office supplies", "Notepad / Envelopes", 2, "pack", 3.49],
  [false, "Office supplies", "Glue / Tape", 2, "roll", 2.49],
  [false, "Office supplies", "Printer paper", 1, "ream", 7.99],
  [false, "Office supplies", "Pens / Pencils", 1, "pack", 4.99],
  [false, "Office supplies", "Postage stamps", 1, "book", 13.6],
  [false, "Other stuff", "Automotive accessories", 1, "item", 8.99],
  [false, "Other stuff", "Batteries", 2, "pack", 7.49],
  [false, "Other stuff", "Charcoal / Propane", 1, "bag", 11.99],
  [false, "Other stuff", "Flowers / Greeting card", 1, "item", 4.99],
  [false, "Other stuff", "Insect repellent", 1, "can", 5.99],
  [false, "Other stuff", "Light bulbs", 2, "pack", 6.49],
  [false, "Other stuff", "Newspaper / Magazine", 1, "issue", 4.5],
  [false, "Other stuff", "Random impulse buy", 1, "item", 5]
];

const expenseCategories = [
  "Grocery",
  "Dine out",
  "Gas",
  "Clothing",
  "Medicine",
  "Services",
  "internet",
  "water bill",
  "Electricity",
  "Petrol",
  "Insurance",
  "Tax",
  "Sports",
  "Chess",
  "Electronics",
  "others"
];

const menuDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const mealSlots: MenuMeal["slot"][] = ["Breakfast", "Lunch", "Dinner"];

const seedMenuMeals: MenuMeal[] = [
  { id: "menu-01", day: 0, slot: "Breakfast", name: "Idli with Coconut chutney", isVeg: true },
  { id: "menu-02", day: 0, slot: "Lunch", name: "Sambar rice with fries", isVeg: true, swapSuggestion: "Carrot beans poriyal or air-fried appalam" },
  { id: "menu-03", day: 0, slot: "Dinner", name: "Chapati with mixed vegetable kurma", isVeg: true },
  { id: "menu-04", day: 1, slot: "Breakfast", name: "Rava upma with vegetables", isVeg: true },
  { id: "menu-05", day: 1, slot: "Lunch", name: "Lemon rice with curd", isVeg: true },
  { id: "menu-06", day: 1, slot: "Dinner", name: "Vegetable dosa with chutney", isVeg: true },
  { id: "menu-07", day: 2, slot: "Breakfast", name: "Pesarattu with ginger chutney", isVeg: true },
  { id: "menu-08", day: 2, slot: "Lunch", name: "Curd rice with beetroot poriyal", isVeg: true },
  { id: "menu-09", day: 2, slot: "Dinner", name: "Chicken curry with rice", isVeg: false },
  { id: "menu-10", day: 3, slot: "Breakfast", name: "Pongal with sambar", isVeg: true },
  { id: "menu-11", day: 3, slot: "Lunch", name: "Rasam rice with beans poriyal", isVeg: true },
  { id: "menu-12", day: 3, slot: "Dinner", name: "Chapati with chana masala", isVeg: true },
  { id: "menu-13", day: 4, slot: "Breakfast", name: "Oats dosa with tomato chutney", isVeg: true },
  { id: "menu-14", day: 4, slot: "Lunch", name: "Vegetable biryani with raita", isVeg: true },
  { id: "menu-15", day: 4, slot: "Dinner", name: "Fish curry with rice", isVeg: false },
  { id: "menu-16", day: 5, slot: "Breakfast", name: "Appam with vegetable stew", isVeg: true },
  { id: "menu-17", day: 5, slot: "Lunch", name: "Tomato rice with cucumber salad", isVeg: true },
  { id: "menu-18", day: 5, slot: "Dinner", name: "Egg dosa with vegetable salad", isVeg: false },
  { id: "menu-19", day: 6, slot: "Breakfast", name: "Poori with potato masala", isVeg: true, swapSuggestion: "Whole-wheat phulka with potato and peas masala" },
  { id: "menu-20", day: 6, slot: "Lunch", name: "Chicken biryani with salad", isVeg: false },
  { id: "menu-21", day: 6, slot: "Dinner", name: "Idiyappam with vegetable kurma", isVeg: true }
];

const seedMenuSides: MenuSide[] = [
  { id: "side-01", day: 0, label: "Poriyal", name: "Carrot", note: "Pair with lunch or dinner" },
  { id: "side-02", day: 0, label: "Varuval", name: "Potato", note: "Pan roast with minimal oil" },
  { id: "side-03", day: 0, label: "Thuvaiyal", name: "Cilantro", note: "Pair with lunch or dinner" },
  { id: "side-04", day: 0, label: "Chutney", name: "Coconut", note: "Pair with breakfast" },
  { id: "side-05", day: 0, label: "Kootu", name: "Cabbage", note: "Pair with lunch or dinner" },
  { id: "side-06", day: 1, label: "Poriyal", name: "Beans", note: "Pair with lunch or dinner" },
  { id: "side-07", day: 1, label: "Varuval", name: "Avar", note: "Pan roast with minimal oil" },
  { id: "side-08", day: 1, label: "Thuvaiyal", name: "Curry leaves", note: "Pair with lunch or dinner" },
  { id: "side-09", day: 1, label: "Chutney", name: "Peanut", note: "Pair with breakfast" },
  { id: "side-10", day: 1, label: "Kootu", name: "Snake gourd", note: "Pair with lunch or dinner" },
  { id: "side-11", day: 2, label: "Poriyal", name: "Cauliflower", note: "Pair with lunch or dinner" },
  { id: "side-12", day: 2, label: "Varuval", name: "Yam", note: "Pan roast with minimal oil" },
  { id: "side-13", day: 2, label: "Thuvaiyal", name: "Mint leaves", note: "Pair with lunch or dinner" },
  { id: "side-14", day: 2, label: "Chutney", name: "Onion", note: "Pair with breakfast" },
  { id: "side-15", day: 2, label: "Kootu", name: "Chowchow", note: "Pair with lunch or dinner" },
  { id: "side-16", day: 3, label: "Poriyal", name: "Beetroot", note: "Pair with lunch or dinner" },
  { id: "side-17", day: 3, label: "Varuval", name: "Mushroom", note: "Pan roast with minimal oil" },
  { id: "side-18", day: 3, label: "Thuvaiyal", name: "Peerkangai", note: "Pair with lunch or dinner" },
  { id: "side-19", day: 3, label: "Chutney", name: "Lentil", note: "Pair with breakfast" },
  { id: "side-20", day: 3, label: "Kootu", name: "Sorakkai", note: "Pair with lunch or dinner" },
  { id: "side-21", day: 4, label: "Poriyal", name: "Lady's finger", note: "Pair with lunch or dinner" },
  { id: "side-22", day: 4, label: "Varuval", name: "Plantain", note: "Pan roast with minimal oil" },
  { id: "side-23", day: 4, label: "Thuvaiyal", name: "Onion & garlic", note: "Pair with lunch or dinner" },
  { id: "side-24", day: 4, label: "Chutney", name: "Mint chutney", note: "Pair with breakfast" },
  { id: "side-25", day: 4, label: "Kootu", name: "Pumpkin", note: "Pair with lunch or dinner" },
  { id: "side-26", day: 5, label: "Poriyal", name: "Tindora", note: "Pair with lunch or dinner" },
  { id: "side-27", day: 5, label: "Varuval", name: "Cauliflower", note: "Pan roast with minimal oil" },
  { id: "side-28", day: 5, label: "Thuvaiyal", name: "Urad dal", note: "Pair with lunch or dinner" },
  { id: "side-29", day: 5, label: "Chutney", name: "Tomato", note: "Pair with breakfast" },
  { id: "side-30", day: 5, label: "Kootu", name: "Cucumber", note: "Pair with lunch or dinner" },
  { id: "side-31", day: 6, label: "Poriyal", name: "Brinjal", note: "Pair with lunch or dinner" },
  { id: "side-32", day: 6, label: "Varuval", name: "Bitter gourd", note: "Pan roast with minimal oil" },
  { id: "side-33", day: 6, label: "Thuvaiyal", name: "Peanut", note: "Pair with lunch or dinner" },
  { id: "side-34", day: 6, label: "Chutney", name: "Chilli", note: "Pair with breakfast" },
  { id: "side-35", day: 6, label: "Kootu", name: "Radish", note: "Pair with lunch or dinner" }
];

const seedPantryItems: PantryItem[] = [
  ...legacyGrocerySeed,
  ...householdInventorySeed.map(([purchased, category, name, quantity, unit, unitPrice], index) => ({
    id: `household-${String(index + 1).padStart(2, "0")}`,
    purchased,
    category,
    name,
    quantity,
    unit,
    unitPrice
  }))
];

const seedChores: Chore[] = [
  ["Sweeping", "Indoor", "Daily", "Every afternoon", "Ganesh"],
  ["Drop Jiya", "Childcare", "Daily", "School / activity drop-off", "Nisha"],
  ["Lakshan poop clean", "Childcare", "Daily", "As needed", "Nisha"],
  ["Feed Lakshan", "Childcare", "Daily", "Morning and evening", "Nisha"],
  ["Drop kid (Lakshan)", "Childcare", "Daily", "School / activity drop-off", "Nisha"],
  ["Breakfast prep", "Cooking & Kitchen", "Daily", "Morning", "Nisha"],
  ["Lunch preparation", "Cooking & Kitchen", "Daily", "Morning", "Nisha"],
  ["Clean bedroom", "Family Routine", "Daily", "Evening reset", "Jiya"],
  ["Pick Lakshan", "Childcare", "Daily", "School / activity pick-up", "Nisha"],
  ["Lakshan bath", "Childcare", "Daily", "Evening", "Nisha"],
  ["Snacks to kids", "Childcare", "Daily", "Afternoon", "Nisha"],
  ["Kids homework", "Childcare", "Daily", "After school", "Jiya"],
  ["Make dinner", "Cooking & Kitchen", "Daily", "Evening", "Nisha"],
  ["Make kids sleep", "Childcare", "Daily", "Bedtime", "Nisha"],
  ["Dish washing", "Cooking & Kitchen", "Daily", "After meals", "Lakshan"],
  ["Vegetable cutting", "Cooking & Kitchen", "Daily", "Meal preparation", "Jiya"],
  ["Mopping (Mobing)", "Indoor", "Weekly", "Every 2 weeks", "Ganesh"],
  ["Toilet cleaning", "Indoor", "Weekly", "Every week", "Ganesh"],
  ["Bath tub cleaning", "Indoor", "Weekly", "Every 2 weeks", "Ganesh"],
  ["Laundry", "Indoor", "Weekly", "Monday and Friday", "Jiya"],
  ["Pool cleaning", "Outdoor & Garden", "Weekly", "Every 2 weeks", "Ganesh"],
  ["Gardening", "Outdoor & Garden", "Weekly", "Every 2 weeks", "Ganesh"],
  ["Pest control and vigilance", "Outdoor & Garden", "Weekly", "Every week", "Ganesh"],
  ["Weed plucking", "Outdoor & Garden", "Weekly", "Every 2 weeks", "Ganesh"],
  ["Book pick / drop", "Family Routine", "Weekly", "Weekly", "Jiya"],
  ["Mop floors", "Indoor", "Weekly", "Weekly", "Ganesh"],
  ["Cloth arrangement", "Indoor", "Weekly", "Weekly", "Lakshan"],
  ["Vacuum home", "Indoor", "Weekly", "Weekly", "Ganesh"],
  ["Clean kitchen", "Cooking & Kitchen", "Weekly", "Weekly", "Nisha"],
  ["Grocery purchase", "Family Routine", "Weekly", "Weekly", "Ganesh"],
  ["Glass door cleaning", "Indoor", "Monthly", "Once a month", "Ganesh"],
  ["Floor vacuum", "Indoor", "Monthly", "Once a month", "Ganesh"],
  ["Fragrance monitor", "Indoor", "Monthly", "Once a month", "Ganesh"],
  ["Kitchen countertop clean", "Cooking & Kitchen", "Monthly", "Once a month", "Nisha"],
  ["Watering plants", "Outdoor & Garden", "Monthly", "Once a month", "Jiya"],
  ["Neem water", "Outdoor & Garden", "Monthly", "Once a month", "Lakshan"],
  ["Annual deep clean & home review", "Indoor", "Annual", "Once a year", "Ganesh"]
].map(([title, category, frequency, schedule, assignee], index) => ({
  id: `chore-${String(index + 1).padStart(2, "0")}`,
  title,
  category,
  frequency: frequency as ChoreFrequency,
  schedule,
  assignee: assignee as ChoreAssignee,
  completed: false
}));

const seedChoreResponsibilities = new Map(seedChores.map((chore) => [chore.title, chore.assignee]));

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
  const [eventsReady, setEventsReady] = useState(false);
  const [pointsReady, setPointsReady] = useState(false);
  const [transactions, setTransactions] = useState(seedTransactions);
  const [notifications, setNotifications] = useState(seedNotifications);
  const [pantryItems, setPantryItems] = useState(seedPantryItems);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [menuMeals, setMenuMeals] = useState(seedMenuMeals);
  const [menuSides, setMenuSides] = useState(seedMenuSides);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [selectedChild, setSelectedChild] = useState("lakhan");
  const [rewardSheetChild, setRewardSheetChild] = useState<RewardSheetChild>("jiya");
  const [rewardToolsOpen, setRewardToolsOpen] = useState(false);
  const [pointManagerOpen, setPointManagerOpen] = useState(false);
  const [openWebGroups, setOpenWebGroups] = useState<Record<string, boolean>>({});
  const [openTaskGroups, setOpenTaskGroups] = useState<Record<string, boolean>>({ rewards: false });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("smart-home-events");
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;
      const restored = parsed.filter((candidate): candidate is FamilyEvent => {
        if (!candidate || typeof candidate !== "object") return false;
        const event = candidate as Partial<FamilyEvent>;
        return typeof event.id === "string" && typeof event.title === "string" && typeof event.description === "string" && typeof event.date === "string" && typeof event.start === "string" && typeof event.end === "string" && typeof event.location === "string" && typeof event.category === "string" && Array.isArray(event.assigned) && typeof event.color === "string" && typeof event.reminder === "string";
      });
      if (restored.length) setEvents(restored);
    } catch {
      window.localStorage.removeItem("smart-home-events");
    } finally {
      setEventsReady(true);
    }
  }, []);

  useEffect(() => {
    if (eventsReady) window.localStorage.setItem("smart-home-events", JSON.stringify(events));
  }, [events, eventsReady]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("smart-home-points");
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object") return;
      const pointData = parsed as { children?: unknown; transactions?: unknown };
      if (Array.isArray(pointData.children)) {
        const restoredChildren = pointData.children.filter((candidate): candidate is Child => {
          if (!candidate || typeof candidate !== "object") return false;
          const child = candidate as Partial<Child>;
          return typeof child.id === "string" && typeof child.name === "string" && typeof child.role === "string" && typeof child.points === "number" && typeof child.weekly === "number" && typeof child.monthly === "number" && typeof child.streak === "number" && typeof child.color === "string" && Array.isArray(child.badges);
        });
        if (restoredChildren.length) setChildren(restoredChildren);
      }
      if (Array.isArray(pointData.transactions)) {
        const restoredTransactions = pointData.transactions.filter((candidate): candidate is Transaction => {
          if (!candidate || typeof candidate !== "object") return false;
          const transaction = candidate as Partial<Transaction>;
          return typeof transaction.id === "string" && typeof transaction.date === "string" && typeof transaction.child === "string" && typeof transaction.activity === "string" && typeof transaction.earned === "number" && typeof transaction.redeemed === "number" && typeof transaction.balance === "number" && typeof transaction.notes === "string";
        });
        if (restoredTransactions.length) setTransactions(restoredTransactions);
      }
    } catch {
      window.localStorage.removeItem("smart-home-points");
    } finally {
      setPointsReady(true);
    }
  }, []);

  useEffect(() => {
    if (pointsReady) window.localStorage.setItem("smart-home-points", JSON.stringify({ children, transactions }));
  }, [children, pointsReady, transactions]);

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
    const points = Math.max(0, Math.round(Number(formData.get("points") || 0)));
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

  const managePoints = (formData: FormData) => {
    const childId = String(formData.get("manage-child"));
    const action = String(formData.get("point-action")) === "remove" ? "remove" : "add";
    const requestedPoints = Math.max(0, Math.round(Number(formData.get("manage-points") || 0)));
    const reason = String(formData.get("point-reason") || (action === "remove" ? "Missed chore" : "Family contribution"));
    const notes = String(formData.get("manage-notes") || "").trim();
    const child = children.find((item) => item.id === childId);
    if (!child || !requestedPoints) return;
    const points = action === "remove" ? Math.min(requestedPoints, child.points) : requestedPoints;
    if (!points) return;
    const change = action === "remove" ? -points : points;
    const nextBalance = Math.max(0, child.points + change);
    setChildren((current) => current.map((item) => item.id === childId ? { ...item, points: nextBalance, weekly: Math.max(0, item.weekly + change), monthly: Math.max(0, item.monthly + change) } : item));
    setTransactions((current) => [{
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      child: child.name,
      activity: action === "remove" ? `Point removal: ${reason}` : `Points added: ${reason}`,
      earned: action === "add" ? points : 0,
      redeemed: action === "remove" ? points : 0,
      balance: nextBalance,
      notes: notes || (action === "remove" ? `Removed for ${reason}` : `Added for ${reason}`)
    }, ...current]);
    addNotification(action === "remove" ? "Points removed" : "Points added", action === "remove" ? `${points} points were removed from ${child.name} for ${reason}.` : `${child.name} received ${points} points for ${reason}.`);
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
          style={{ width: sidebarCollapsed ? 88 : sidebarWidth }}
        >
          <div className={cn("flex items-center px-2 py-3", sidebarCollapsed ? "justify-center" : "gap-3")}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-teal-300 dark:text-slate-950">
              <Home className="h-6 w-6" />
            </div>
            {!sidebarCollapsed && <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">SMART - HOME</p>
            </div>}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className={cn("rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white", sidebarCollapsed && "absolute -right-3 top-6 z-10 border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950")}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>
          <nav className="mt-5 space-y-2">
            {navItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => {
                    setActiveSection(item.id);
                    if (item.id === "rewards") setOpenTaskGroups((current) => ({ ...current, rewards: activeSection !== "rewards" || !current.rewards }));
                  }}
                  aria-expanded={item.id === "rewards" ? Boolean(openTaskGroups.rewards) : undefined}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    "flex w-full items-center rounded-2xl py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white",
                    sidebarCollapsed ? "justify-center px-3" : "gap-3 px-4",
                    activeSection === item.id && "bg-slate-950 text-white shadow-glow hover:bg-slate-950 hover:text-white dark:bg-white dark:text-slate-950 dark:hover:bg-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
                  {!sidebarCollapsed && item.id === "rewards" && <ChevronRight className={cn("h-4 w-4 transition-transform", openTaskGroups.rewards && "rotate-90")} />}
                </button>
                {item.id === "rewards" && !sidebarCollapsed && activeSection === "rewards" && openTaskGroups.rewards && (
                  <div className="ml-10 mt-2 space-y-1" aria-label="Rewards options">
                    <button
                      onClick={() => setRewardToolsOpen(true)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Create rewards
                    </button>
                    <button
                      onClick={() => setPointManagerOpen(true)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <WalletCards className="h-4 w-4" />
                      Manage points
                    </button>
                  </div>
                )}
                {item.id === "menu-planner" && !sidebarCollapsed && (
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
          <div className={cn("mt-auto rounded-3xl bg-slate-950 text-white dark:bg-white dark:text-slate-950", sidebarCollapsed ? "p-3" : "p-5")}>
            {!sidebarCollapsed && <><p className="text-sm font-semibold">Family plan</p><p className="mt-2 text-xs leading-5 opacity-70">2 children, 4 upcoming events, private Supabase-ready workspace.</p></>}
            <div className={cn("flex -space-x-2", sidebarCollapsed ? "justify-center" : "mt-5")}>
              {["L", "J", "P", "G"].map((avatar) => (
                <span key={avatar} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-950 bg-teal-200 text-xs font-bold text-slate-950 dark:border-white">
                  {avatar}
                </span>
              ))}
            </div>
          </div>
          {!sidebarCollapsed && <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            onPointerDown={startSidebarResize}
            className="absolute -right-2 top-8 h-[calc(100%-4rem)] w-4 cursor-col-resize rounded-full transition hover:bg-teal-300/30"
          />}
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-3 z-30 mb-4 flex items-center justify-between rounded-[1.5rem] border border-white/80 bg-white/75 px-4 py-3 shadow-panel backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Today</p>
              <h1 className="truncate text-lg font-semibold sm:text-2xl">Welcome back, Ganesh Family</h1>
            </div>
            <div className="flex items-center gap-2">
              <PwaInstallButton />
              <a href="/signin-with-chatgpt?return_to=%2F" target="_top" className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white sm:inline-flex">
                Sign in
              </a>
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

          <nav className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:hidden">
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
                  openPointManager={() => setPointManagerOpen(true)}
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
              {activeSection === "pantry" && <Pantry items={pantryItems} setItems={setPantryItems} />}
              {activeSection === "chores" && <Chores />}
              {activeSection === "expense" && <ExpenseTracker items={expenses} setItems={setExpenses} />}
              {activeSection === "menu-planner" && <MenuPlanner meals={menuMeals} setMeals={setMenuMeals} sides={menuSides} setSides={setMenuSides} />}
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
        {pointManagerOpen && (
          <ManagePointsModal
            familyChildren={children}
            transactions={transactions}
            managePoints={(formData) => {
              managePoints(formData);
              setPointManagerOpen(false);
            }}
            onClose={() => setPointManagerOpen(false)}
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

function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAppleDevice, setIsAppleDevice] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
    setIsInstalled(standalone);
    setIsAppleDevice(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setShowInstructions(false);
      setIsInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const requestInstallation = async () => {
    if (!installPrompt) {
      if (isAppleDevice) setShowInstructions(true);
      return;
    }
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (result.outcome === "accepted") setIsInstalled(true);
  };

  if (isInstalled || (!installPrompt && !isAppleDevice)) return null;

  return (
    <>
      <button onClick={() => void requestInstallation()} className="inline-flex h-10 items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 text-sm font-semibold text-teal-800 transition hover:-translate-y-0.5 hover:bg-teal-100 dark:border-teal-300/30 dark:bg-teal-300/10 dark:text-teal-100" aria-label="Install SMART - HOME as an app">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">{installPrompt ? "Install app" : "Add to Home Screen"}</span>
      </button>
      <AnimatePresence>
        {showInstructions && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" onClick={() => setShowInstructions(false)} />
            <motion.section role="dialog" aria-modal="true" aria-labelledby="install-smart-home" initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="relative w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-panel dark:bg-slate-950">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">SMART - HOME</p><h2 id="install-smart-home" className="mt-1 text-2xl font-semibold">Add the app icon</h2></div><button onClick={() => setShowInstructions(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close install instructions"><X className="h-5 w-5" /></button></div>
              {isAppleDevice ? <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">In Safari, tap the Share button, then choose <strong>Add to Home Screen</strong>. SMART - HOME will appear as an icon and open like an app.</p> : <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Use your browser menu and choose <strong>Install SMART - HOME</strong> or <strong>Add to Home screen</strong>. If you do not see it yet, refresh once after the page has finished loading.</p>}
              <div className="mt-5 rounded-2xl bg-teal-50 p-4 text-sm text-teal-900 dark:bg-teal-300/10 dark:text-teal-100"><strong>Tip:</strong> Installing keeps SMART - HOME one tap away on desktop, Android, iPhone, or iPad.</div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const navItems: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "pantry", label: "Supplies", icon: ShoppingBasket },
  { id: "chores", label: "Chores", icon: ListChecks },
  { id: "expense", label: "Expense", icon: WalletCards },
  { id: "menu-planner", label: "Menu Planner", icon: Utensils },
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
  openPointManager,
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
  openPointManager: () => void;
  setSelectedReward: (reward: Reward) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="space-y-4">
        <div className="flex flex-wrap justify-end gap-3">
          <button
            onClick={openRewardTools}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 dark:bg-teal-300 dark:text-slate-950"
          >
            <Plus className="h-4 w-4" />
            Create rewards
          </button>
          <button
            onClick={openPointManager}
            className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm font-semibold text-teal-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-50 dark:border-teal-300/30 dark:bg-white/5 dark:text-teal-100 dark:hover:bg-teal-300/10"
          >
            <WalletCards className="h-4 w-4" />
            Manage points
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

function MenuPlanner({
  meals,
  setMeals,
  sides,
  setSides
}: {
  meals: MenuMeal[];
  setMeals: React.Dispatch<React.SetStateAction<MenuMeal[]>>;
  sides: MenuSide[];
  setSides: React.Dispatch<React.SetStateAction<MenuSide[]>>;
}) {
  const [activeDay, setActiveDay] = useState(0);
  const [view, setView] = useState<"day" | "week" | "sides">("day");
  const [search, setSearch] = useState("");
  const [mealFilter, setMealFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [mealEditor, setMealEditor] = useState<{ meal: MenuMeal | null; slot: MenuMeal["slot"] } | null>(null);
  const [sideEditor, setSideEditor] = useState<MenuSide | null | "new">(null);
  const [storageReady, setStorageReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("smart-home-menu-planner");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          const savedPlanner = parsed as { meals?: unknown; sides?: unknown };
          if (Array.isArray(savedPlanner.meals)) {
            const restoredMeals = savedPlanner.meals.filter((candidate): candidate is MenuMeal => {
              if (!candidate || typeof candidate !== "object") return false;
              const meal = candidate as Record<string, unknown>;
              return typeof meal.id === "string" && typeof meal.day === "number" && typeof meal.slot === "string" && typeof meal.name === "string" && typeof meal.isVeg === "boolean";
            });
            if (restoredMeals.length) setMeals(restoredMeals);
          }
          if (Array.isArray(savedPlanner.sides)) {
            const restoredSides = savedPlanner.sides.filter((candidate): candidate is MenuSide => {
              if (!candidate || typeof candidate !== "object") return false;
              const side = candidate as Record<string, unknown>;
              return typeof side.id === "string" && typeof side.day === "number" && typeof side.label === "string" && typeof side.name === "string";
            });
            if (restoredSides.length) {
              const restoredIds = new Set(restoredSides.map((side) => side.id));
              setSides([...restoredSides, ...seedMenuSides.filter((side) => !restoredIds.has(side.id))]);
            }
          }
        }
      }
    } catch {
      window.localStorage.removeItem("smart-home-menu-planner");
    } finally {
      setStorageReady(true);
    }
  }, [setMeals, setSides]);

  useEffect(() => {
    if (storageReady) window.localStorage.setItem("smart-home-menu-planner", JSON.stringify({ meals, sides }));
  }, [meals, sides, storageReady]);

  const searchTerm = search.trim().toLowerCase();
  const matchesMeal = (meal: MenuMeal) => (!searchTerm || meal.name.toLowerCase().includes(searchTerm)) && (mealFilter === "all" || (mealFilter === "veg" ? meal.isVeg : !meal.isVeg));
  const activeMeals = meals.filter((meal) => meal.day === activeDay);
  const vegMeals = meals.filter((meal) => meal.isVeg).length;
  const nonVegMeals = meals.length - vegMeals;
  const flaggedMeals = meals.filter((meal) => meal.swapSuggestion).length;
  const activeSides = sides.filter((side) => side.day === activeDay);
  const snackMeals = activeMeals.filter((meal) => meal.slot === "Snacks & drinks" && matchesMeal(meal));

  const saveMeal = (formData: FormData, existing: MenuMeal | null) => {
    const day = Math.min(6, Math.max(0, Number(formData.get("menu-day") || activeDay)));
    const slot = String(formData.get("menu-slot") || "Breakfast") as MenuMeal["slot"];
    const name = String(formData.get("menu-name") || "").trim();
    const isVeg = String(formData.get("menu-type") || "Veg") === "Veg";
    const swapSuggestion = String(formData.get("menu-swap") || "").trim();
    if (!name) return;
    const nextMeal: MenuMeal = { id: existing?.id ?? crypto.randomUUID(), day, slot, name, isVeg, ...(swapSuggestion ? { swapSuggestion } : {}) };
    setMeals((current) => existing ? current.map((meal) => meal.id === existing.id ? nextMeal : meal) : [...current, nextMeal]);
    setMealEditor(null);
    setNotice(existing ? "Meal updated and saved on this device." : "Meal added and saved on this device.");
  };

  const saveSide = (formData: FormData, existing: MenuSide | null) => {
    const label = String(formData.get("side-label") || "Side").trim();
    const name = String(formData.get("side-name") || "").trim();
    const note = String(formData.get("side-note") || "").trim();
    if (!name) return;
    const nextSide: MenuSide = { id: existing?.id ?? crypto.randomUUID(), day: activeDay, label, name, ...(note ? { note } : {}) };
    setSides((current) => existing ? current.map((side) => side.id === existing.id ? nextSide : side) : [...current, nextSide]);
    setSideEditor(null);
    setNotice(existing ? "Side pairing updated and saved on this device." : "Side pairing added and saved on this device.");
  };

  const applySwap = (meal: MenuMeal) => {
    if (!meal.swapSuggestion) return;
    setMeals((current) => current.map((item) => item.id === meal.id ? { ...item, name: meal.swapSuggestion ?? item.name, swapSuggestion: undefined } : item));
    setNotice("Healthy swap applied and saved on this device.");
  };

  const applyAllSwaps = () => {
    if (!flaggedMeals) return;
    setMeals((current) => current.map((meal) => meal.swapSuggestion ? { ...meal, name: meal.swapSuggestion, swapSuggestion: undefined } : meal));
    setNotice(`${flaggedMeals} healthier swap${flaggedMeals === 1 ? "" : "s"} applied and saved on this device.`);
  };

  const moveDay = (offset: number) => setActiveDay((current) => (current + offset + menuDays.length) % menuDays.length);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-panel backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 sm:p-6">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200"><Utensils className="h-5 w-5" /></div>
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold">Weekly Food Planner</h2><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200">South Indian Menu</span></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Balanced weekly meals with editable South Indian pairings.</p></div>
          </div>
          <div className="flex flex-wrap gap-2"><button onClick={applyAllSwaps} disabled={!flaggedMeals} className={cn("inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition", flaggedMeals ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-300/30 dark:bg-rose-300/10 dark:text-rose-200" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-600")}><Heart className="h-4 w-4" />{flaggedMeals} needs swap</button><button onClick={() => setMealEditor({ meal: null, slot: "Snacks & drinks" })} className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-300/30 dark:bg-teal-300/10 dark:text-teal-200"><Plus className="h-4 w-4" />Add snacks & drinks</button><button onClick={() => setMealEditor({ meal: null, slot: "Breakfast" })} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"><Plus className="h-4 w-4" />Add meal</button></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MenuMetric label="Meals planned" value={meals.length} detail="Planned this week" icon={CalendarDays} tone="bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white" />
          <MenuMetric label="Veg meals" value={vegMeals} detail="Plant-forward choices" icon={Leaf} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200" />
          <MenuMetric label="Non-veg meals" value={nonVegMeals} detail="Fish, chicken & eggs" icon={Utensils} tone="bg-amber-100 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200" />
          <MenuMetric label="Needs swap" value={flaggedMeals} detail="Lower-oil alternatives" icon={Heart} tone="bg-sky-100 text-sky-700 dark:bg-sky-300/15 dark:text-sky-200" />
        </div>
      </section>

      <section className="flex flex-col justify-between gap-3 rounded-[1.5rem] border border-white/80 bg-white/80 p-3 shadow-panel backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 lg:flex-row lg:items-center">
        <div className="flex w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/10 lg:w-auto"><button onClick={() => setView("day")} className={cn("rounded-lg px-3 py-2 text-sm font-semibold transition", view === "day" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-400")}><CalendarDays className="mr-1.5 inline h-4 w-4" />Day view</button><button onClick={() => setView("week")} className={cn("rounded-lg px-3 py-2 text-sm font-semibold transition", view === "week" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-400")}><ListChecks className="mr-1.5 inline h-4 w-4" />Weekly matrix</button><button onClick={() => setView("sides")} className={cn("rounded-lg px-3 py-2 text-sm font-semibold transition", view === "sides" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-400")}><Utensils className="mr-1.5 inline h-4 w-4" />Sides & condiments</button></div>
        <div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search meals" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5 sm:w-48" /></label><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">{(["all", "veg", "non-veg"] as const).map((filter) => <button key={filter} onClick={() => setMealFilter(filter)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition", mealFilter === filter ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-400")}>{filter === "non-veg" ? "Non-Veg" : filter === "veg" ? "Veg" : "All"}</button>)}</div></div>
      </section>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">{menuDays.map((dayName, index) => <button key={dayName} onClick={() => setActiveDay(index)} className={cn("rounded-2xl border px-3 py-3 text-center transition", activeDay === index ? "border-amber-600 bg-amber-600 text-white shadow-glow" : "border-slate-200 bg-white/75 text-slate-700 hover:bg-amber-50 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-white/10")}><span className="block text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">Day {index + 1}</span><span className="mt-1 block text-sm font-semibold">{dayName}</span></button>)}</div>

      {view === "week" ? <WeeklyMenuMatrix meals={meals} activeDay={activeDay} onEdit={(meal) => setMealEditor({ meal, slot: meal.slot })} /> : view === "sides" ? <SidesPanel day={activeDay} sides={activeSides} onCreate={() => setSideEditor("new")} onEdit={(side) => setSideEditor(side)} /> : <>
        <section className="flex items-center justify-between rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-panel backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60"><button onClick={() => moveDay(-1)} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10" aria-label="Previous day"><ChevronLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1 px-3"><h3 className="text-lg font-semibold">{menuDays[activeDay]}&apos;s Menu</h3><p className="text-sm text-slate-500 dark:text-slate-400">Breakfast, lunch, dinner, snacks and authentic side pairings</p></div><button onClick={() => moveDay(1)} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10" aria-label="Next day"><ChevronRight className="h-5 w-5" /></button></section>
        <div className="grid gap-4 xl:grid-cols-3">{mealSlots.map((slot) => { const meal = activeMeals.find((item) => item.slot === slot && matchesMeal(item)); return <MealCard key={slot} slot={slot} meal={meal} day={activeDay} onEdit={(entry) => setMealEditor({ meal: entry, slot: entry.slot })} onCreate={() => setMealEditor({ meal: null, slot })} onSwap={applySwap} />; })}</div>
        {snackMeals.length > 0 && <Panel title="Snacks & drinks"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{snackMeals.map((meal) => <button key={meal.id} onClick={() => setMealEditor({ meal, slot: meal.slot })} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-teal-400 hover:bg-teal-50 dark:border-white/10 dark:hover:bg-teal-300/10"><p className="font-semibold">{meal.name}</p><p className={cn("mt-1 text-sm", meal.isVeg ? "text-emerald-600" : "text-amber-600")}>{meal.isVeg ? "Veg" : "Non-Veg"}</p></button>)}</div></Panel>}
        <SidesPanel day={activeDay} sides={activeSides} onCreate={() => setSideEditor("new")} onEdit={(side) => setSideEditor(side)} />
      </>}
      {notice && <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 dark:border-teal-300/30 dark:bg-teal-300/10 dark:text-teal-100">{notice}</p>}
      <AnimatePresence>{mealEditor && <MenuMealEditorModal meal={mealEditor.meal} activeDay={activeDay} initialSlot={mealEditor.slot} onClose={() => setMealEditor(null)} onSave={(formData) => saveMeal(formData, mealEditor.meal)} />}{sideEditor && <MenuSideEditorModal side={sideEditor === "new" ? null : sideEditor} day={activeDay} onClose={() => setSideEditor(null)} onSave={(formData) => saveSide(formData, sideEditor === "new" ? null : sideEditor)} />}</AnimatePresence>
    </div>
  );
}

function MenuMetric({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: typeof ListChecks; tone: string }) {
  return <div className={cn("rounded-xl border border-slate-200 p-4 dark:border-white/10", tone)}><div className="flex items-center gap-3"><Icon className="h-5 w-5" /><div><p className="text-sm font-semibold">{value} {label}</p><p className="text-xs opacity-80">{detail}</p></div></div></div>;
}

function MealCard({ slot, meal, day, onEdit, onCreate, onSwap }: { slot: MenuMeal["slot"]; meal?: MenuMeal; day: number; onEdit: (meal: MenuMeal) => void; onCreate: () => void; onSwap: (meal: MenuMeal) => void }) {
  const slotStyles = { Breakfast: "border-slate-200", Lunch: "border-amber-300", Dinner: "border-sky-200", "Snacks & drinks": "border-teal-200" } as const;
  return <section className={cn("flex min-h-[270px] flex-col rounded-[1.5rem] border bg-white/85 p-5 shadow-panel dark:bg-slate-950/60", slotStyles[slot])}><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{slot}</p>{meal && <div className="flex items-center gap-2"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", meal.isVeg ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200")}>{meal.isVeg ? "Veg" : "Non-Veg"}</span><button onClick={() => onEdit(meal)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/10" aria-label={`Edit ${slot}`}><Pencil className="h-4 w-4" /></button></div>}</div>{meal ? <><p className="mt-7 text-lg font-semibold">{meal.name}</p>{meal.swapSuggestion && <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100"><p className="font-semibold">Consider a lower-oil swap</p><p className="mt-1">{meal.swapSuggestion}</p><button onClick={() => onSwap(meal)} className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500">Apply healthy swap</button></div>}</> : <div className="flex flex-1 flex-col items-center justify-center text-center"><p className="text-sm text-slate-500 dark:text-slate-400">No matching meal planned.</p><button onClick={onCreate} className="mt-3 rounded-xl border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 dark:border-teal-300/40 dark:text-teal-200 dark:hover:bg-teal-300/10">Add meal</button></div>}<div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400"><span>Day {day + 1} · {menuDays[day]}</span>{meal && <button onClick={() => onEdit(meal)} className="font-semibold text-amber-700 dark:text-amber-200">Change</button>}</div></section>;
}

function SidesPanel({ day, sides, onCreate, onEdit }: { day: number; sides: MenuSide[]; onCreate: () => void; onEdit: (side: MenuSide) => void }) {
  return <Panel title={`Sides & Condiments Pairings for ${menuDays[day]}`} action="Add pairing" onAction={onCreate}><p className="-mt-3 mb-4 text-sm text-slate-500 dark:text-slate-400">Traditional pairings to complement the day&apos;s meals.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{sides.map((side) => <button key={side.id} onClick={() => onEdit(side)} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-teal-400 hover:bg-teal-50 dark:border-white/10 dark:hover:bg-teal-300/10"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{side.label}</p><p className="mt-2 font-semibold">{side.name}</p>{side.note && <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">{side.note}</p>}</button>)}{!sides.length && <button onClick={onCreate} className="rounded-2xl border border-dashed border-slate-300 p-5 text-left text-sm text-slate-500 hover:border-teal-400 hover:text-teal-700 dark:border-white/20 dark:text-slate-400">Add a side or condiment pairing.</button>}</div></Panel>;
}

function WeeklyMenuMatrix({ meals, activeDay, onEdit }: { meals: MenuMeal[]; activeDay: number; onEdit: (meal: MenuMeal) => void }) {
  return <Panel title="Weekly menu matrix"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-[0.1em] text-slate-500 dark:border-white/10 dark:text-slate-400"><tr><th className="pb-3 font-semibold">Meal</th>{menuDays.map((day) => <th key={day} className="pb-3 px-2 text-center font-semibold">{day.slice(0, 3)}</th>)}</tr></thead><tbody className="divide-y divide-slate-200 dark:divide-white/10">{mealSlots.map((slot) => <tr key={slot}><td className="py-3 font-semibold">{slot}</td>{menuDays.map((_, day) => { const meal = meals.find((item) => item.day === day && item.slot === slot); return <td key={day} className={cn("p-2 text-center", day === activeDay && "bg-amber-50/70 dark:bg-amber-300/10")}>{meal ? <button onClick={() => onEdit(meal)} className="rounded-lg px-2 py-1 text-left text-xs hover:bg-white dark:hover:bg-slate-950">{meal.name}</button> : <span className="text-xs text-slate-400">—</span>}</td>; })}</tr>)}</tbody></table></div></Panel>;
}

function MenuMealEditorModal({ meal, activeDay, initialSlot, onClose, onSave }: { meal: MenuMeal | null; activeDay: number; initialSlot: MenuMeal["slot"]; onClose: () => void; onSave: (formData: FormData) => void }) {
  useEffect(() => { const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", closeOnEscape); return () => window.removeEventListener("keydown", closeOnEscape); }, [onClose]);
  return <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="absolute inset-0" onClick={onClose} /><motion.section role="dialog" aria-modal="true" aria-labelledby="menu-meal-editor" initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="relative w-full max-w-lg rounded-[1.5rem] bg-white p-5 shadow-panel dark:bg-slate-950 sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Menu planner</p><h2 id="menu-meal-editor" className="mt-1 text-2xl font-semibold">{meal ? "Edit meal" : "Add meal"}</h2></div><button className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} aria-label="Close meal editor"><X className="h-5 w-5" /></button></div><form action={onSave} className="space-y-3"><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Day<select name="menu-day" defaultValue={meal?.day ?? activeDay} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5">{menuDays.map((dayName, index) => <option key={dayName} value={index}>{dayName}</option>)}</select></label><label className="block text-sm font-medium">Meal<select name="menu-slot" defaultValue={meal?.slot ?? initialSlot} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5">{[...mealSlots, "Snacks & drinks" as const].map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label></div><label className="block text-sm font-medium">Meal name<input required name="menu-name" defaultValue={meal?.name ?? ""} placeholder="e.g., Vegetable millet upma" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Preference<select name="menu-type" defaultValue={meal?.isVeg === false ? "Non-Veg" : "Veg"} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5"><option>Veg</option><option>Non-Veg</option></select></label><label className="block text-sm font-medium">Optional healthy swap<input name="menu-swap" defaultValue={meal?.swapSuggestion ?? ""} placeholder="Lower-oil alternative" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5" /></label></div><button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-300 dark:text-slate-950"><Save className="h-4 w-4" />{meal ? "Save meal" : "Add meal"}</button></form></motion.section></motion.div>;
}

function MenuSideEditorModal({ side, day, onClose, onSave }: { side: MenuSide | null; day: number; onClose: () => void; onSave: (formData: FormData) => void }) {
  useEffect(() => { const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", closeOnEscape); return () => window.removeEventListener("keydown", closeOnEscape); }, [onClose]);
  return <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="absolute inset-0" onClick={onClose} /><motion.section role="dialog" aria-modal="true" aria-labelledby="menu-side-editor" initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="relative w-full max-w-lg rounded-[1.5rem] bg-white p-5 shadow-panel dark:bg-slate-950 sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">{menuDays[day]}</p><h2 id="menu-side-editor" className="mt-1 text-2xl font-semibold">{side ? "Edit pairing" : "Add pairing"}</h2></div><button className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} aria-label="Close side editor"><X className="h-5 w-5" /></button></div><form action={onSave} className="space-y-3"><label className="block text-sm font-medium">Pairing type<input name="side-label" defaultValue={side?.label ?? "Poriyal"} placeholder="Poriyal" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5" /></label><label className="block text-sm font-medium">Ingredient or dish<input required name="side-name" defaultValue={side?.name ?? ""} placeholder="Carrot" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5" /></label><label className="block text-sm font-medium">Note<input name="side-note" defaultValue={side?.note ?? ""} placeholder="Pair with lunch or dinner" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5" /></label><button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-300 dark:text-slate-950"><Save className="h-4 w-4" />Save pairing</button></form></motion.section></motion.div>;
}

function ExpenseTracker({
  items,
  setItems
}: {
  items: Expense[];
  setItems: React.Dispatch<React.SetStateAction<Expense[]>>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [notice, setNotice] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const todayString = new Date().toISOString().slice(0, 10);
  const currency = useMemo(() => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }), []);
  const chartColors = ["#0f766e", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981", "#f97316", "#6366f1", "#14b8a6", "#ef4444", "#a855f7", "#84cc16", "#06b6d4", "#64748b", "#f43f5e"];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("smart-home-expenses");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const restored = parsed.filter((candidate): candidate is Expense => {
            if (!candidate || typeof candidate !== "object") return false;
            const expense = candidate as Record<string, unknown>;
            const bill = expense.bill;
            const hasValidBill = bill === undefined || (Boolean(bill) && typeof bill === "object" && typeof (bill as Record<string, unknown>).id === "string" && typeof (bill as Record<string, unknown>).name === "string" && typeof (bill as Record<string, unknown>).type === "string" && typeof (bill as Record<string, unknown>).size === "number" && typeof (bill as Record<string, unknown>).addedAt === "string");
            return typeof expense.id === "string" && typeof expense.date === "string" && typeof expense.description === "string" && typeof expense.category === "string" && typeof expense.amount === "number" && hasValidBill;
          });
          if (restored.length) setItems(restored);
        }
      }
    } catch {
      window.localStorage.removeItem("smart-home-expenses");
    } finally {
      setStorageReady(true);
    }
  }, [setItems]);

  useEffect(() => {
    if (storageReady) window.localStorage.setItem("smart-home-expenses", JSON.stringify(items));
  }, [items, storageReady]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((item) => (!term || `${item.description} ${item.category}`.toLowerCase().includes(term)) && (category === "All" || item.category === category))
      .sort((left, right) => right.date.localeCompare(left.date));
  }, [category, items, search]);

  const weeklySpend = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return { label: formatter.format(date), amount: items.filter((item) => item.date === key).reduce((sum, item) => sum + item.amount, 0) };
    });
  }, [items]);

  const monthlySpend = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", { month: "short" });
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return { label: formatter.format(date), amount: items.filter((item) => item.date.startsWith(key)).reduce((sum, item) => sum + item.amount, 0) };
    });
  }, [items]);

  const categorySpend = useMemo(
    () => expenseCategories.map((categoryName) => ({ name: categoryName, amount: items.filter((item) => item.category === categoryName).reduce((sum, item) => sum + item.amount, 0) })).filter((item) => item.amount > 0),
    [items]
  );
  const totalSpend = items.reduce((sum, item) => sum + item.amount, 0);
  const weekSpend = weeklySpend.reduce((sum, item) => sum + item.amount, 0);
  const monthSpend = monthlySpend.at(-1)?.amount ?? 0;

  const openCreate = () => {
    setEditingExpense(null);
    setEditorOpen(true);
  };

  const saveExpense = async (formData: FormData, billFile: File | null) => {
    const description = String(formData.get("expense-description") || "").trim();
    const amount = Number(formData.get("expense-amount") || 0);
    const date = String(formData.get("expense-date") || todayString);
    const expenseCategory = String(formData.get("expense-category") || "others");
    if (!description || !Number.isFinite(amount) || amount <= 0) return;
    if (billFile && !isSupportedBillFile(billFile)) {
      setNotice("Please attach a JPEG, image, or PDF bill.");
      return;
    }
    if (billFile && billFile.size > maxBillFileSize) {
      setNotice("Bills must be 25 MB or smaller.");
      return;
    }
    const expenseId = editingExpense?.id ?? crypto.randomUUID();
    let bill = editingExpense?.bill;
    if (billFile) {
      try {
        bill = await saveExpenseBill(billFile);
      } catch {
        setNotice("The bill could not be stored on this device. Please try a smaller file.");
        return;
      }
    }
    const nextExpense: Expense = { id: expenseId, date, description, category: expenseCategory, amount, ...(bill ? { bill } : {}) };
    if (editingExpense) {
      setItems((current) => current.map((item) => (item.id === editingExpense.id ? nextExpense : item)));
      if (billFile && editingExpense.bill) void deleteExpenseBill(editingExpense.bill.id);
      setNotice("Expense updated and saved on this device.");
    } else {
      setItems((current) => [nextExpense, ...current]);
      setNotice("Expense added and saved on this device.");
    }
    setEditorOpen(false);
    setEditingExpense(null);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]));
  };

  const toggleSelectAll = () => {
    const visibleIds = visibleItems.map((item) => item.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => (allSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds]))));
  };

  const copySelected = () => {
    if (selectedIds.length !== 1) {
      setNotice("Select one expense to copy.");
      return;
    }
    const original = items.find((item) => item.id === selectedIds[0]);
    if (!original) return;
    const { bill: _bill, ...copySource } = original;
    const copy = { ...copySource, id: crypto.randomUUID(), description: `${original.description} (copy)` };
    setItems((current) => [copy, ...current]);
    setSelectedIds([copy.id]);
    setNotice("Expense copied and saved on this device.");
  };

  const deleteSelected = () => {
    if (!selectedIds.length) {
      setNotice("Select one or more expenses to delete.");
      return;
    }
    if (!window.confirm(`Delete ${selectedIds.length} selected expense${selectedIds.length === 1 ? "" : "s"}?`)) return;
    const billsToDelete = items.filter((item) => selectedIds.includes(item.id)).flatMap((item) => item.bill ? [item.bill.id] : []);
    setItems((current) => current.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    void Promise.all(billsToDelete.map(deleteExpenseBill));
    setNotice("Selected expenses deleted from this device.");
  };

  const editSelected = () => {
    if (selectedIds.length !== 1) {
      setNotice("Select one expense to edit.");
      return;
    }
    const selected = items.find((item) => item.id === selectedIds[0]);
    if (selected) {
      setEditingExpense(selected);
      setEditorOpen(true);
    }
  };

  const downloadExpenses = () => {
    const rows = items.map((item) => ({ Date: item.date, Description: item.description, Category: item.category, Type: "Debit (Expense)", "Amount ($)": item.amount, "Bill attachment": item.bill?.name ?? "" }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [{ wch: 14 }, { wch: 34 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 34 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, "expenses.xlsx", { compression: true });
    setNotice("Expenses downloaded to Excel.");
  };

  const openBill = async (bill: BillAttachment) => {
    try {
      const file = await readExpenseBill(bill.id);
      if (!file) {
        setNotice("This bill attachment is unavailable on this device.");
        return;
      }
      const url = URL.createObjectURL(file);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setNotice("This bill attachment could not be opened.");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Household finances</p>
        <h2 className="mt-1 text-3xl font-semibold">Expense</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PantryMetric label="Total spend" value={currency.format(totalSpend)} detail="All saved expenses" icon={WalletCards} tone="bg-rose-100 text-rose-700 dark:bg-rose-300/15 dark:text-rose-200" />
        <PantryMetric label="This week" value={currency.format(weekSpend)} detail="Last 7 days" icon={TrendingUp} tone="bg-amber-100 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200" />
        <PantryMetric label="This month" value={currency.format(monthSpend)} detail="Current calendar month" icon={CalendarDays} tone="bg-sky-100 text-sky-700 dark:bg-sky-300/15 dark:text-sky-200" />
        <PantryMetric label="Transactions" value={items.length.toLocaleString()} detail="Saved on this device" icon={ListChecks} tone="bg-teal-100 text-teal-700 dark:bg-teal-300/15 dark:text-teal-200" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Weekly spend">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySpend} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => currency.format(Number(value))} cursor={{ fill: "rgba(20,184,166,0.08)" }} />
                <Bar dataKey="amount" fill="#0f766e" radius={[7, 7, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Monthly spend">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpend} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => currency.format(Number(value))} />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="#bfdbfe" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="xl:col-span-2">
        <Panel title="Spend by category">
          {categorySpend.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categorySpend} dataKey="amount" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={3}>
                    {categorySpend.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => currency.format(Number(value))} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 flex-col items-center justify-center text-center">
              <TrendingUp className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 font-semibold">No spending recorded yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add an expense to see its category share.</p>
            </div>
          )}
        </Panel>
        </div>
      </div>

      <Panel title="Manage transactions">
        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col justify-between gap-3 p-3 xl:flex-row xl:items-center">
            <div className="flex flex-wrap gap-2">
              <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800"><Plus className="h-4 w-4" />Create expense</button>
              <button onClick={() => setFiltersOpen((current) => !current)} className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition", filtersOpen ? "border-teal-600 bg-teal-600 text-white dark:border-teal-300 dark:bg-teal-300 dark:text-slate-950" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10")}><Filter className="h-4 w-4" />Filter</button>
              <button onClick={downloadExpenses} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"><Download className="h-4 w-4" />Download Excel</button>
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button onClick={copySelected} disabled={selectedIds.length !== 1} className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition", selectedIds.length === 1 ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-600")}><Copy className="h-4 w-4" />Copy</button>
              <button onClick={deleteSelected} disabled={!selectedIds.length} className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition", selectedIds.length ? "border-rose-300 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-300/30 dark:bg-white/5 dark:text-rose-200 dark:hover:bg-rose-300/10" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-600")}><Trash2 className="h-4 w-4" />Delete</button>
              <button onClick={editSelected} disabled={selectedIds.length !== 1} className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition", selectedIds.length === 1 ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-600")}><Pencil className="h-4 w-4" />Edit</button>
              <button onClick={() => { window.localStorage.setItem("smart-home-expenses", JSON.stringify(items)); setNotice("Expenses saved on this device."); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"><Save className="h-4 w-4" />Save</button>
            </div>
          </div>
          {notice && <p className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">{notice}</p>}
          <AnimatePresence initial={false}>
            {filtersOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200 dark:border-white/10"><div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center"><label className="relative block min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search expenses" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5"><option value="All">All categories</option>{expenseCategories.map((categoryName) => <option key={categoryName} value={categoryName}>{categoryName}</option>)}</select></div></motion.div>}
          </AnimatePresence>
        </div>

        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Showing {visibleItems.length} of {items.length} expenses{selectedIds.length ? ` · ${selectedIds.length} selected` : ""}</p>
        <div className="max-h-[560px] overflow-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-emerald-100 text-xs uppercase tracking-[0.08em] text-emerald-950 dark:bg-emerald-300 dark:text-slate-950"><tr><th className="w-14 px-3 py-3 text-center"><input type="checkbox" checked={visibleItems.length > 0 && visibleItems.every((item) => selectedIds.includes(item.id))} onChange={toggleSelectAll} aria-label="Select all visible expenses" className="h-4 w-4 rounded border-slate-300 accent-teal-600" /></th><th className="w-32 px-3 py-3">Date</th><th className="min-w-[300px] px-3 py-3">Description</th><th className="w-44 px-3 py-3">Category</th><th className="w-32 px-3 py-3 text-right">Amount ($)</th><th className="w-56 px-3 py-3">Bill</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">{visibleItems.map((item) => <tr key={item.id} className={cn("transition-colors hover:bg-teal-50/70 dark:hover:bg-teal-300/5", selectedIds.includes(item.id) && "bg-teal-50/80 dark:bg-teal-300/10")}><td className="px-3 py-3 text-center"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} aria-label={`Select ${item.description}`} className="h-4 w-4 rounded border-slate-300 accent-teal-600" /></td><td className="px-3 py-3 tabular-nums">{item.date}</td><td className="px-3 py-3 font-medium">{item.description}</td><td className="px-3 py-3">{item.category}</td><td className="px-3 py-3 text-right font-semibold tabular-nums">{currency.format(item.amount)}</td><td className="px-3 py-3">{item.bill ? <button type="button" onClick={() => void openBill(item.bill!)} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-left text-xs font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-300/30 dark:bg-teal-300/10 dark:text-teal-100"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{item.bill.name}</span></button> : <span className="text-xs text-slate-400 dark:text-slate-500">No bill</span>}</td></tr>)}</tbody>
          </table>
        </div>
        {visibleItems.length === 0 && <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No expenses found. Create an expense to begin tracking your spend.</p>}
      </Panel>

      <AnimatePresence>{editorOpen && <ExpenseEditorModal expense={editingExpense} today={todayString} onClose={() => { setEditorOpen(false); setEditingExpense(null); }} onSave={saveExpense} />}</AnimatePresence>
    </div>
  );
}

function ExpenseEditorModal({
  expense,
  today: todayValue,
  onClose,
  onSave
}: {
  expense: Expense | null;
  today: string;
  onClose: () => void;
  onSave: (formData: FormData, billFile: File | null) => void | Promise<void>;
}) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedBill, setSelectedBill] = useState<File | null>(null);
  const [billError, setBillError] = useState("");

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const selectBill = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!isSupportedBillFile(file)) {
      setBillError("Choose a JPEG, image, or PDF bill.");
      return;
    }
    if (file.size > maxBillFileSize) {
      setBillError("Bills must be 25 MB or smaller.");
      return;
    }
    setSelectedBill(file);
    setBillError("");
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" onClick={onClose} />
      <motion.section role="dialog" aria-modal="true" aria-labelledby="expense-editor-title" initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="relative w-full max-w-lg rounded-[1.5rem] bg-white p-5 shadow-panel dark:bg-slate-950 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Expense</p><h2 id="expense-editor-title" className="mt-1 text-2xl font-semibold">{expense ? "Edit expense" : "Add expense"}</h2></div><button className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} aria-label="Close expense editor"><X className="h-5 w-5" /></button></div>
        <form action={(formData) => onSave(formData, selectedBill)} className="space-y-3">
          <label className="block text-sm font-medium">Date<input name="expense-date" type="date" defaultValue={expense?.date ?? todayValue} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5" /></label>
          <label className="block text-sm font-medium">Description<input name="expense-description" required defaultValue={expense?.description ?? ""} placeholder="Enter description" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5" /></label>
          <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Category<select name="expense-category" defaultValue={expense?.category ?? "Grocery"} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5">{expenseCategories.map((categoryName) => <option key={categoryName} value={categoryName}>{categoryName}</option>)}</select></label><label className="block text-sm font-medium">Amount ($)<input name="expense-amount" required min="0.01" step="0.01" type="number" defaultValue={expense?.amount ?? ""} placeholder="0.00" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5" /></label></div>
          <section className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/55 p-4 dark:border-teal-300/30 dark:bg-teal-300/10">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="text-sm font-semibold">Bill attachment <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span></p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Attach a photo, WhatsApp image, or PDF. On a phone, use the camera to capture the bill.</p></div>{expense?.bill && !selectedBill && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-teal-800 dark:bg-slate-950/50 dark:text-teal-100">Current: {expense.bill.name}</span>}</div>
            <input ref={uploadInputRef} type="file" accept="image/*,application/pdf,.pdf" onChange={selectBill} className="sr-only" />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={selectBill} className="sr-only" />
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => uploadInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-300/30 dark:bg-slate-950/50 dark:text-teal-100"><Upload className="h-4 w-4" />Upload photo or PDF</button><button type="button" onClick={() => cameraInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-300/30 dark:bg-slate-950/50 dark:text-teal-100"><Camera className="h-4 w-4" />Use camera</button></div>
            {selectedBill && <div className="mt-3 flex items-center gap-3 rounded-xl border border-teal-200 bg-white px-3 py-2.5 dark:border-teal-300/30 dark:bg-slate-950/50"><FileText className="h-5 w-5 shrink-0 text-teal-700 dark:text-teal-200" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{selectedBill.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{(selectedBill.size / 1024 / 1024).toFixed(1)} MB · Ready to attach</p></div><button type="button" onClick={() => setSelectedBill(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Remove selected bill"><X className="h-4 w-4" /></button></div>}
            {billError && <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-200">{billError}</p>}
          </section>
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-300 dark:text-slate-950"><Save className="h-4 w-4" />{expense ? "Save expense" : "Add expense"}</button>
        </form>
      </motion.section>
    </motion.div>
  );
}

function Chores() {
  const [chores, setChores] = useState<Chore[]>(seedChores);
  const [storageReady, setStorageReady] = useState(false);
  const [activeFrequency, setActiveFrequency] = useState<ChoreFrequency | "All">("Daily");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [assignee, setAssignee] = useState("All");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("smart-home-chores");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const restored = parsed.filter((candidate): candidate is Chore => {
            if (!candidate || typeof candidate !== "object") return false;
            const value = candidate as Partial<Chore>;
            return typeof value.id === "string" && typeof value.title === "string" && typeof value.category === "string" && typeof value.schedule === "string" && typeof value.assignee === "string" && ["Daily", "Weekly", "Monthly", "Annual"].includes(String(value.frequency));
          }).map((item) => ({
            ...item,
            assignee: isChoreAssignee(item.assignee) ? item.assignee : seedChoreResponsibilities.get(item.title) ?? "Nisha",
            completed: Boolean(item.completed)
          }));
          if (restored.length) setChores(restored);
        }
      }
    } catch {
      window.localStorage.removeItem("smart-home-chores");
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (storageReady) window.localStorage.setItem("smart-home-chores", JSON.stringify(chores));
  }, [chores, storageReady]);

  const frequencies: readonly (ChoreFrequency | "All")[] = ["Daily", "Weekly", "Monthly", "Annual", "All"];
  const categories = useMemo(() => Array.from(new Set(chores.map((chore) => chore.category))).sort(), [chores]);
  const assignees = choreFamilyMembers;
  const frequencyCounts = useMemo(() => Object.fromEntries((["Daily", "Weekly", "Monthly", "Annual"] as ChoreFrequency[]).map((frequency) => [frequency, chores.filter((chore) => chore.frequency === frequency).length])) as Record<ChoreFrequency, number>, [chores]);
  const visibleChores = useMemo(() => chores.filter((chore) => {
    const matchesFrequency = activeFrequency === "All" || chore.frequency === activeFrequency;
    const matchesSearch = `${chore.title} ${chore.category} ${chore.assignee} ${chore.schedule}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || chore.category === category;
    const matchesAssignee = assignee === "All" || chore.assignee === assignee;
    return matchesFrequency && matchesSearch && matchesCategory && matchesAssignee;
  }), [activeFrequency, assignee, category, chores, search]);
  const cadenceChores = activeFrequency === "All" ? chores : chores.filter((chore) => chore.frequency === activeFrequency);
  const completedCount = cadenceChores.filter((chore) => chore.completed).length;
  const completionPercent = cadenceChores.length ? Math.round((completedCount / cadenceChores.length) * 100) : 0;
  const cadenceLabel = activeFrequency === "All" ? "Family" : activeFrequency;
  const allocation = useMemo(() => choreFamilyMembers.map((member) => {
    const total = chores.filter((chore) => chore.assignee === member.name).length;
    return { ...member, total, percent: chores.length ? Math.round((total / chores.length) * 100) : 0 };
  }), [chores]);

  const toggleComplete = (id: string) => {
    setChores((current) => current.map((chore) => chore.id === id ? { ...chore, completed: !chore.completed, completedAt: chore.completed ? undefined : new Date().toISOString() } : chore));
  };

  const updateAssignee = (id: string, nextAssignee: ChoreAssignee) => {
    setChores((current) => current.map((chore) => chore.id === id ? { ...chore, assignee: nextAssignee } : chore));
  };

  const saveChore = (formData: FormData) => {
    const title = String(formData.get("chore-title") || "").trim();
    if (!title) return;
    const frequencyValue = String(formData.get("chore-frequency") || "Weekly");
    const frequency: ChoreFrequency = ["Daily", "Weekly", "Monthly", "Annual"].includes(frequencyValue) ? frequencyValue as ChoreFrequency : "Weekly";
    const assignedTo = String(formData.get("chore-assignee") || "Nisha");
    const nextChore: Chore = {
      id: editingChore?.id ?? crypto.randomUUID(),
      title,
      category: String(formData.get("chore-category") || "Family Routine"),
      frequency,
      schedule: String(formData.get("chore-schedule") || frequency),
      assignee: isChoreAssignee(assignedTo) ? assignedTo : "Nisha",
      completed: editingChore?.completed ?? false,
      ...(editingChore?.completedAt ? { completedAt: editingChore.completedAt } : {})
    };
    setChores((current) => editingChore ? current.map((chore) => chore.id === editingChore.id ? nextChore : chore) : [nextChore, ...current]);
    setEditingChore(null);
    setEditorOpen(false);
  };

  const deleteChore = (id: string) => {
    setChores((current) => current.filter((chore) => chore.id !== id));
  };

  const openCreate = () => {
    setEditingChore(null);
    setEditorOpen(true);
  };

  const openEdit = (chore: Chore) => {
    setEditingChore(chore);
    setEditorOpen(true);
  };

  const frequencyStyle: Record<ChoreFrequency, string> = {
    Daily: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100",
    Weekly: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-300/25 dark:bg-sky-300/10 dark:text-sky-100",
    Monthly: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-300/25 dark:bg-violet-300/10 dark:text-violet-100",
    Annual: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/25 dark:bg-emerald-300/10 dark:text-emerald-100"
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 p-6 text-white shadow-panel sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em]">
              <Sparkles className="h-3.5 w-3.5" /> Family schedule & maintenance
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Family Chore Chart</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">Plan, assign, and complete household routines by daily, weekly, monthly, and annual cadence.</p>
          </div>
          <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/25 text-center shadow-sm">
            {(["Daily", "Weekly", "Monthly", "Annual"] as ChoreFrequency[]).map((frequency) => (
              <div key={frequency} className="min-w-20 border-r border-white/10 px-3 py-3 last:border-r-0">
                <p className="text-2xl font-semibold tabular-nums">{frequencyCounts[frequency]}</p>
                <p className="mt-1 text-[11px] font-medium text-emerald-100 sm:text-xs">{frequency}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 sm:p-5" aria-label="Work allocation by responsibility">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-200">Roles & responsibility</p><h3 className="mt-1 text-lg font-semibold">Work allocation</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Percentage of all active chores assigned to each family member.</p></div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{chores.length} chores assigned</p></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          {allocation.map((member) => (
            <div key={member.name} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: member.color }}>{member.initials}</span><div><p className="text-sm font-semibold">{member.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{member.role}</p></div></div><p className="text-lg font-semibold tabular-nums">{member.percent}%</p></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full rounded-full transition-all" style={{ width: `${member.percent}%`, backgroundColor: member.color }} /></div>
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{member.total} {member.total === 1 ? "task" : "tasks"}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full overflow-x-auto rounded-2xl bg-slate-100 p-1 dark:bg-white/5 lg:w-auto">
          {frequencies.map((frequency) => (
            <button key={frequency} onClick={() => setActiveFrequency(frequency)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition", activeFrequency === frequency ? "bg-white text-slate-950 shadow-sm dark:bg-white/15 dark:text-white" : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white")}>
              {frequency === "Daily" && <Sun className="h-4 w-4 text-amber-500" />}
              {frequency === "Weekly" && <CalendarDays className="h-4 w-4 text-sky-500" />}
              {frequency === "Monthly" && <CalendarDays className="h-4 w-4 text-violet-500" />}
              {frequency === "Annual" && <Award className="h-4 w-4 text-emerald-500" />}
              {frequency === "All" && <ListChecks className="h-4 w-4 text-teal-500" />}
              {frequency}{frequency !== "All" && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] tabular-nums dark:bg-white/10">{frequencyCounts[frequency]}</span>}
              {frequency === "All" && <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] tabular-nums dark:bg-white/10">{chores.length}</span>}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600">
          <Plus className="h-4 w-4" /> Add chore
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white/75 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chore, assignee, or frequency..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5" />
          </label>
          <select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5">
            <option value="All">Who: All family</option>
            {assignees.map((member) => <option key={member.name} value={member.name}>{member.name} · {member.role}</option>)}
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5">
            <option value="All">Category: All categories</option>
            {categories.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="font-semibold"><CircleCheckBig className="mr-2 inline h-4 w-4 text-emerald-600" />{cadenceLabel} cadence progress</p>
          <p className="font-medium text-slate-500 dark:text-slate-400">{completedCount} of {cadenceChores.length} completed ({completionPercent}%)</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completionPercent}%` }} /></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleChores.map((chore) => {
          const isOutdoor = chore.category.includes("Outdoor");
          const isKitchen = chore.category.includes("Kitchen");
          const isChildcare = chore.category.includes("Childcare");
          const responsible = choreFamilyMembers.find((member) => member.name === chore.assignee) ?? choreFamilyMembers[1];
          return (
            <article key={chore.id} className={cn("rounded-2xl border bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel dark:bg-slate-950/60", chore.completed ? "border-emerald-200 dark:border-emerald-300/20" : "border-slate-200 dark:border-white/10")}>
              <div className="flex items-center justify-between gap-3">
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold", frequencyStyle[chore.frequency])}><CalendarDays className="h-3.5 w-3.5" />{chore.schedule}</span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">{isOutdoor ? <Leaf className="h-3.5 w-3.5 text-emerald-600" /> : isKitchen ? <Utensils className="h-3.5 w-3.5 text-amber-600" /> : isChildcare ? <Heart className="h-3.5 w-3.5 text-rose-500" /> : <Home className="h-3.5 w-3.5 text-sky-500" />}{chore.category}</span>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <button type="button" onClick={() => toggleComplete(chore.id)} aria-label={`Mark ${chore.title} as ${chore.completed ? "not completed" : "completed"}`} className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition", chore.completed ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-transparent dark:border-slate-500")}><Check className="h-3.5 w-3.5" /></button>
                <div className="min-w-0"><h3 className={cn("font-semibold", chore.completed && "text-slate-400 line-through dark:text-slate-500")}>{chore.title}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{chore.frequency} · {chore.schedule}</p></div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: responsible.color }}>{responsible.initials}</span>
                <select aria-label={`Responsibility for ${chore.title}`} value={chore.assignee} onChange={(event) => { const value = event.target.value; if (isChoreAssignee(value)) updateAssignee(chore.id, value); }} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5">
                  {choreFamilyMembers.map((member) => <option key={member.name} value={member.name}>{member.name} · {member.role}</option>)}
                </select>
                <button type="button" onClick={() => openEdit(chore)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-white/10 dark:hover:text-teal-200" aria-label={`Edit ${chore.title}`}><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => deleteChore(chore.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-300/10 dark:hover:text-rose-200" aria-label={`Delete ${chore.title}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          );
        })}
      </section>
      {visibleChores.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">No chores match this view. Add a chore or change the filters.</p>}

      <AnimatePresence>{editorOpen && <ChoreEditorModal chore={editingChore} categories={categories} onClose={() => { setEditorOpen(false); setEditingChore(null); }} onSave={saveChore} />}</AnimatePresence>
    </div>
  );
}

function ChoreEditorModal({
  chore,
  categories,
  onClose,
  onSave
}: {
  chore: Chore | null;
  categories: string[];
  onClose: () => void;
  onSave: (formData: FormData) => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const categoryOptions = Array.from(new Set(["Indoor", "Outdoor & Garden", "Cooking & Kitchen", "Childcare", "Family Routine", ...categories]));
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" onClick={onClose} />
      <motion.section role="dialog" aria-modal="true" aria-labelledby="chore-editor-title" initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="relative w-full max-w-lg rounded-[1.5rem] bg-white p-5 shadow-panel dark:bg-slate-950 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Chores</p><h2 id="chore-editor-title" className="mt-1 text-2xl font-semibold">{chore ? "Edit chore" : "Add chore"}</h2></div><button className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} aria-label="Close chore editor"><X className="h-5 w-5" /></button></div>
        <form action={onSave} className="space-y-3">
          <Input name="chore-title" label="Chore name" defaultValue={chore?.title} placeholder="Clean refrigerator" />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Category<select name="chore-category" defaultValue={chore?.category ?? "Indoor"} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5">{categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <label className="block text-sm font-medium">Frequency<select name="chore-frequency" defaultValue={chore?.frequency ?? "Weekly"} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5">{(["Daily", "Weekly", "Monthly", "Annual"] as ChoreFrequency[]).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="chore-schedule" label="Schedule detail" defaultValue={chore?.schedule} placeholder="Every Saturday" />
            <label className="block text-sm font-medium">Responsibility<select name="chore-assignee" defaultValue={chore?.assignee ?? "Nisha"} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5">{choreFamilyMembers.map((member) => <option key={member.name} value={member.name}>{member.name} · {member.role}</option>)}</select></label>
          </div>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Chores are saved automatically on this device and remain here until you delete them.</p>
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"><Check className="h-4 w-4" />{chore ? "Save changes" : "Add chore"}</button>
        </form>
      </motion.section>
    </motion.div>
  );
}

function Pantry({
  items,
  setItems
}: {
  items: PantryItem[];
  setItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cartOnly, setCartOnly] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [selectedSupplyIds, setSelectedSupplyIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const savedSuppliesLoaded = useRef(false);
  const currency = useMemo(() => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }), []);
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))), [items]);
  const visibleItems = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !searchTerm || `${item.name} ${item.category}`.toLowerCase().includes(searchTerm);
      const matchesCategory = category === "All" || item.category === category;
      return matchesSearch && matchesCategory && (!cartOnly || item.purchased);
    });
  }, [cartOnly, category, items, search]);
  const categorySummaries = useMemo(
    () =>
      categories.map((categoryName) => {
        const categoryItems = items.filter((item) => item.category === categoryName);
        return {
          category: categoryName,
          items: categoryItems.length,
          shoppingCart: categoryItems.filter((item) => item.purchased).length,
          spend: categoryItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
        };
      }),
    [categories, items]
  );
  const totalSpend = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const shoppingCartItems = items.filter((item) => item.purchased);
  const shoppingCartSpend = shoppingCartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const notInShoppingCartItems = items.length - shoppingCartItems.length;
  const highestCategorySpend = Math.max(...categorySummaries.map((summary) => summary.spend), 1);
  const categoryColors = ["bg-teal-500", "bg-sky-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-violet-500", "bg-cyan-500", "bg-lime-500", "bg-pink-500"];

  useEffect(() => {
    if (savedSuppliesLoaded.current) return;
    savedSuppliesLoaded.current = true;
    try {
      const saved = window.localStorage.getItem("smart-home-supplies");
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;
      const restored = parsed.filter((candidate): candidate is PantryItem => {
        if (!candidate || typeof candidate !== "object") return false;
        const item = candidate as Record<string, unknown>;
        return typeof item.id === "string" && typeof item.purchased === "boolean" && typeof item.category === "string" && typeof item.name === "string" && typeof item.quantity === "number" && typeof item.unit === "string" && typeof item.unitPrice === "number";
      });
      if (restored.length) {
        const restoredIds = new Set(restored.map((item) => item.id));
        setItems([...restored, ...seedPantryItems.filter((item) => !restoredIds.has(item.id))]);
      }
    } catch {
      window.localStorage.removeItem("smart-home-supplies");
    }
  }, [setItems]);

  const toggleShoppingCart = (id: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, purchased: !item.purchased } : item)));
    setIsDirty(true);
  };

  const toggleSelected = (id: string) => {
    setSelectedSupplyIds((current) => (current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]));
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = visibleItems.map((item) => item.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSupplyIds.includes(id));
    setSelectedSupplyIds((current) => (allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds]))));
  };

  const manageItem = (id: string, formData: FormData) => {
    const quantity = Number(formData.get("manage-quantity") || 0);
    const unitPrice = Number(formData.get("manage-unit-price") || 0);
    const unit = String(formData.get("manage-unit") || "item").trim() || "item";
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, quantity, unit, unitPrice } : item)));
    setEditingItem(null);
    setIsDirty(true);
    setNotice("Supply item updated. Select Save to keep this version on this device.");
  };

  const createItem = (formData: FormData) => {
    const name = String(formData.get("pantry-name") || "").trim();
    const itemCategory = String(formData.get("pantry-category") || "").trim();
    const quantity = Number(formData.get("pantry-quantity") || 0);
    const unitPrice = Number(formData.get("pantry-unit-price") || 0);
    const unit = String(formData.get("pantry-unit") || "item").trim() || "item";
    if (!name || !itemCategory || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return;
    setItems((current) => [
      { id: crypto.randomUUID(), purchased: false, category: itemCategory, name, quantity, unit, unitPrice },
      ...current
    ]);
    setAddItemOpen(false);
    setIsDirty(true);
    setNotice("Supply item created. Select Save to keep this version on this device.");
  };

  const copySelectedSupply = () => {
    if (selectedSupplyIds.length !== 1) {
      setNotice("Select one supply item to copy.");
      return;
    }
    const original = items.find((item) => item.id === selectedSupplyIds[0]);
    if (!original) return;
    const copy = { ...original, id: crypto.randomUUID(), name: `${original.name} (copy)`, purchased: false };
    setItems((current) => [copy, ...current]);
    setSelectedSupplyIds([copy.id]);
    setIsDirty(true);
    setNotice("Supply item copied. Select Save to keep this version on this device.");
  };

  const deleteSelectedSupplies = () => {
    if (!selectedSupplyIds.length) {
      setNotice("Select one or more supply items to delete.");
      return;
    }
    if (!window.confirm(`Delete ${selectedSupplyIds.length} selected supply item${selectedSupplyIds.length === 1 ? "" : "s"}?`)) return;
    setItems((current) => current.filter((item) => !selectedSupplyIds.includes(item.id)));
    setSelectedSupplyIds([]);
    setIsDirty(true);
    setNotice("Selected supply items deleted. Select Save to keep this version on this device.");
  };

  const editSelectedSupply = () => {
    if (selectedSupplyIds.length !== 1) {
      setNotice("Select one supply item to edit.");
      return;
    }
    const selected = items.find((item) => item.id === selectedSupplyIds[0]);
    if (selected) setEditingItem(selected);
  };

  const saveSupplies = () => {
    window.localStorage.setItem("smart-home-supplies", JSON.stringify(items));
    setIsDirty(false);
    setNotice("Supplies saved on this device.");
  };

  const downloadSuppliesExcel = () => {
    const rows = items.map((item) => ({
      SC: item.purchased ? "SC" : "",
      Category: item.category,
      "Item Description": item.name,
      Quantity: item.quantity,
      Unit: item.unit,
      "Unit Price": item.unitPrice,
      Subtotal: item.quantity * item.unitPrice
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [{ wch: 18 }, { wch: 24 }, { wch: 34 }, { wch: 11 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Supplies");
    XLSX.writeFile(workbook, "supplies-template.xlsx", { compression: true });
    setNotice("Supplies template downloaded. Update the rows and upload the completed file when ready.");
  };

  const uploadSuppliesExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("Missing worksheet");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const readCell = (row: Record<string, unknown>, fields: string[]) => fields.map((field) => row[field]).find((value) => value !== undefined && value !== "");
      const numberFromCell = (value: unknown) => typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
      const imported = rows.map((row, index) => {
        const name = String(readCell(row, ["Item Description", "Item", "Item (English / Tamil)"]) || "").trim();
        const categoryName = String(readCell(row, ["Category"]) || "").trim();
        const quantity = numberFromCell(readCell(row, ["Quantity"]));
        const unitPrice = numberFromCell(readCell(row, ["Unit Price", "Price"]));
        const status = readCell(row, ["SC", "Status", "Purchased", "In stock"]);
        const statusText = String(status).trim().toLowerCase();
        return {
          id: `upload-${crypto.randomUUID()}-${index}`,
          purchased: status === true || ["true", "yes", "checked", "sc", "shopping cart", "purchased", "in stock"].includes(statusText),
          category: categoryName,
          name,
          quantity,
          unit: String(readCell(row, ["Unit"]) || "item").trim() || "item",
          unitPrice
        };
      }).filter((item): item is PantryItem => Boolean(item.name && item.category && Number.isFinite(item.quantity) && item.quantity >= 0 && Number.isFinite(item.unitPrice) && item.unitPrice >= 0));
      if (!imported.length) {
        setNotice("No valid supply rows were found. Download the template and keep its column headers.");
        return;
      }
      setItems(imported);
      setSelectedSupplyIds([]);
      setIsDirty(true);
      setNotice(`${imported.length} supply items imported. Select Save to keep this version on this device.`);
    } catch {
      setNotice("That Excel file could not be read. Download the template and use its column headers.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Household list</p>
          <h2 className="mt-1 text-3xl font-semibold">Supplies</h2>
        </div>
        <button onClick={() => setAddItemOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:bg-teal-300 dark:text-slate-950">
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PantryMetric label="Total items" value={items.length.toLocaleString()} detail="Staples on list" icon={ListChecks} tone="bg-teal-100 text-teal-700 dark:bg-teal-300/15 dark:text-teal-200" />
        <PantryMetric label="SC items" value={shoppingCartItems.length.toLocaleString()} detail={`${items.length ? Math.round((shoppingCartItems.length / items.length) * 100) : 0}% added for purchase`} icon={CircleCheckBig} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200" />
        <PantryMetric label="Not in SC" value={notInShoppingCartItems.toLocaleString()} detail="Not yet in shopping cart" icon={ShoppingBasket} tone="bg-amber-100 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200" />
        <PantryMetric label="Estimated spend" value={currency.format(totalSpend)} detail={`Shopping cart: ${currency.format(shoppingCartSpend)}`} icon={CircleDollarSign} tone="bg-rose-100 text-rose-700 dark:bg-rose-300/15 dark:text-rose-200" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Budget by section">
          <div className="space-y-3">
            {categorySummaries.map((summary, index) => (
              <div key={summary.category}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{summary.category}</span>
                  <strong className="shrink-0 tabular-nums">{currency.format(summary.spend)}</strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div className={cn("h-full rounded-full", categoryColors[index % categoryColors.length])} style={{ width: `${Math.max((summary.spend / highestCategorySpend) * 100, 3)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Shopping cart">
          <div className="max-h-[510px] space-y-2 overflow-y-auto pr-1">
            {shoppingCartItems.length ? shoppingCartItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5 dark:border-amber-300/15 dark:bg-amber-300/5">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", categoryColors[index % categoryColors.length])} />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">{item.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.quantity} {item.unit} · {currency.format(item.quantity * item.unitPrice)}</p>
                </div>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">Mark an item SC in Manage supplies to add it to the shopping cart.</p>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Supplies overview">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.1em] text-slate-500 dark:border-white/10 dark:text-slate-300">
              <tr>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 text-right font-semibold">Items</th>
                <th className="pb-3 text-right font-semibold">In SC</th>
                <th className="pb-3 text-right font-semibold">Est. spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {categorySummaries.map((summary) => (
                <tr key={summary.category}>
                  <td className="py-3 font-medium">{summary.category}</td>
                  <td className="py-3 text-right tabular-nums">{summary.items}</td>
                  <td className="py-3 text-right tabular-nums">{summary.shoppingCart}</td>
                  <td className="py-3 text-right font-semibold tabular-nums">{currency.format(summary.spend)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 font-semibold dark:border-white/20">
                <td className="pt-3">Total</td>
                <td className="pt-3 text-right tabular-nums">{items.length}</td>
                <td className="pt-3 text-right tabular-nums">{shoppingCartItems.length}</td>
                <td className="pt-3 text-right tabular-nums">{currency.format(totalSpend)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Manage supplies">
        <input ref={uploadInputRef} type="file" accept=".xlsx,.xls" onChange={uploadSuppliesExcel} className="sr-only" />
        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col justify-between gap-3 p-3 xl:flex-row xl:items-center">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => uploadInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800">
                <Upload className="h-4 w-4" />
                Upload Excel
              </button>
              <button onClick={() => setFiltersOpen((current) => !current)} className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition", filtersOpen ? "border-teal-600 bg-teal-600 text-white dark:border-teal-300 dark:bg-teal-300 dark:text-slate-950" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10")}>
                <Filter className="h-4 w-4" />
                Filter supplies
              </button>
              <button onClick={downloadSuppliesExcel} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                <Download className="h-4 w-4" />
                Download Excel
              </button>
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button onClick={() => setAddItemOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                <Plus className="h-4 w-4" />
                Create
              </button>
              <button onClick={copySelectedSupply} disabled={selectedSupplyIds.length !== 1} className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition", selectedSupplyIds.length === 1 ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-600")}>
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <button onClick={deleteSelectedSupplies} disabled={!selectedSupplyIds.length} className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition", selectedSupplyIds.length ? "border-rose-300 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-300/30 dark:bg-white/5 dark:text-rose-200 dark:hover:bg-rose-300/10" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-600")}>
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button onClick={editSelectedSupply} disabled={selectedSupplyIds.length !== 1} className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition", selectedSupplyIds.length === 1 ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-600")}>
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button onClick={saveSupplies} className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition", isDirty ? "bg-emerald-700 text-white hover:bg-emerald-600" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-200 dark:hover:bg-emerald-300/25")}>
                <Save className="h-4 w-4" />
                Save{isDirty ? " *" : ""}
              </button>
            </div>
          </div>
          {notice && <p className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">{notice}</p>}
          <AnimatePresence initial={false}>
            {filtersOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200 dark:border-white/10">
                <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                  <label className="relative block min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplies" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5" />
                  </label>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5">
                    <option value="All">All categories</option>
                    {categories.map((categoryName) => (
                      <option key={categoryName} value={categoryName}>{categoryName}</option>
                    ))}
                  </select>
                  <button onClick={() => setCartOnly((current) => !current)} className={cn("inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition", cartOnly ? "border-teal-600 bg-teal-600 text-white dark:border-teal-300 dark:bg-teal-300 dark:text-slate-950" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10")}>
                    <Filter className="h-4 w-4" />
                    SC items only
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Showing {visibleItems.length} of {items.length} supply items{selectedSupplyIds.length ? ` · ${selectedSupplyIds.length} selected` : ""}</p>
        <div className="max-h-[560px] overflow-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full min-w-[950px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-amber-800 text-xs uppercase tracking-[0.08em] text-white">
              <tr>
                <th className="w-14 px-3 py-3 text-center"><input type="checkbox" checked={visibleItems.length > 0 && visibleItems.every((item) => selectedSupplyIds.includes(item.id))} onChange={toggleSelectAllVisible} aria-label="Select all visible supply items" className="h-4 w-4 rounded border-slate-300 accent-teal-600" /></th>
                <th className="w-20 px-3 py-3 text-center">SC</th>
                <th className="min-w-40 px-3 py-3">Category</th>
                <th className="min-w-[300px] px-3 py-3">Item description</th>
                <th className="w-24 px-3 py-3 text-right">Quantity</th>
                <th className="w-24 px-3 py-3">Unit</th>
                <th className="w-28 px-3 py-3 text-right">Unit price</th>
                <th className="w-28 px-3 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {visibleItems.map((item) => {
                const subtotal = item.quantity * item.unitPrice;
                const selected = selectedSupplyIds.includes(item.id);
                return (
                  <tr key={item.id} className={cn("transition-colors hover:bg-teal-50/70 dark:hover:bg-teal-300/5", selected && "bg-teal-50/80 dark:bg-teal-300/10", item.purchased && "bg-amber-50/70 dark:bg-amber-300/5")}>
                    <td className="px-3 py-2.5 text-center"><input type="checkbox" checked={selected} onChange={() => toggleSelected(item.id)} aria-label={`Select ${item.name}`} className="h-4 w-4 rounded border-slate-300 accent-teal-600" /></td>
                    <td className="px-3 py-2.5 text-center"><button type="button" onClick={() => toggleShoppingCart(item.id)} aria-pressed={item.purchased} aria-label={`${item.purchased ? "Remove" : "Add"} ${item.name} ${item.purchased ? "from" : "to"} shopping cart`} className={cn("min-w-10 rounded-lg px-2 py-1 text-xs font-bold transition", item.purchased ? "bg-amber-500 text-white hover:bg-amber-600" : "border border-slate-200 bg-white text-slate-400 hover:border-amber-400 hover:text-amber-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-400")}>{item.purchased ? "SC" : "—"}</button></td>
                    <td className="px-3 py-2.5 font-medium">{item.category}</td>
                    <td className="px-3 py-2.5">{item.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{item.quantity}</td>
                    <td className="px-3 py-2.5">{item.unit}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{currency.format(item.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{currency.format(subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visibleItems.length === 0 && <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No supply items match this filter.</p>}
      </Panel>

      <AnimatePresence>
        {addItemOpen && <PantryItemModal categories={categories} onClose={() => setAddItemOpen(false)} onCreate={createItem} />}
        {editingItem && <PantryManageItemModal item={editingItem} onClose={() => setEditingItem(null)} onSave={manageItem} />}
      </AnimatePresence>
    </div>
  );
}

function PantryMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof ListChecks;
  tone: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/80 bg-white/75 p-5 shadow-panel backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
    </section>
  );
}

function PantryItemModal({
  categories,
  onClose,
  onCreate
}: {
  categories: string[];
  onClose: () => void;
  onCreate: (formData: FormData) => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 cursor-default" onClick={onClose} />
      <motion.section role="dialog" aria-modal="true" aria-labelledby="pantry-item-title" initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="relative w-full max-w-lg rounded-[1.5rem] bg-white p-5 shadow-panel dark:bg-slate-950 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Supplies</p>
            <h2 id="pantry-item-title" className="mt-1 text-2xl font-semibold">Add supply item</h2>
          </div>
          <button className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} aria-label="Close add supply item">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form action={onCreate} className="space-y-3">
          <Input name="pantry-name" label="Item name" placeholder="Coconut milk (Thengai Paal / தேங்காய் பால்)" />
          <label className="block text-sm font-medium">
            Category
            <select name="pantry-category" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5">
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input name="pantry-quantity" label="Quantity" type="number" placeholder="1" />
            <Input name="pantry-unit" label="Unit" placeholder="pack" />
          </div>
          <Input name="pantry-unit-price" label="Unit price" type="number" placeholder="4.99" />
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-300 dark:text-slate-950">
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </form>
      </motion.section>
    </motion.div>
  );
}

function PantryManageItemModal({
  item,
  onClose,
  onSave
}: {
  item: PantryItem;
  onClose: () => void;
  onSave: (id: string, formData: FormData) => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 cursor-default" onClick={onClose} />
      <motion.section role="dialog" aria-modal="true" aria-labelledby="manage-pantry-item-title" initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="relative w-full max-w-lg rounded-[1.5rem] bg-white p-5 shadow-panel dark:bg-slate-950 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Manage item</p>
            <h2 id="manage-pantry-item-title" className="mt-1 text-2xl font-semibold">Price & quantity</h2>
          </div>
          <button className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} aria-label="Close supply item manager">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-5 rounded-2xl bg-teal-50 p-4 dark:bg-teal-300/10">
          <p className="font-semibold text-slate-950 dark:text-white">{item.name}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.category}</p>
        </div>
        <form action={(formData) => onSave(item.id, formData)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Quantity
              <input name="manage-quantity" type="number" min="0" step="0.5" defaultValue={item.quantity} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5" />
            </label>
            <label className="block text-sm font-medium">
              Unit
              <input name="manage-unit" defaultValue={item.unit} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5" />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Unit price
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input name="manage-unit-price" type="number" min="0" step="0.01" defaultValue={item.unitPrice} className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-8 pr-4 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5" />
            </div>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">Saving recalculates this item’s subtotal and all Supplies totals automatically.</p>
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-300 dark:text-slate-950">
            <Check className="h-4 w-4" />
            Save changes
          </button>
        </form>
      </motion.section>
    </motion.div>
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

function ManagePointsModal({
  familyChildren,
  transactions,
  managePoints,
  onClose
}: {
  familyChildren: Child[];
  transactions: Transaction[];
  managePoints: (formData: FormData) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 cursor-default" onClick={onClose} />
      <motion.section role="dialog" aria-modal="true" aria-labelledby="manage-points-title" initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-panel dark:bg-slate-950 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Rewards</p><h2 id="manage-points-title" className="mt-1 text-2xl font-semibold">Manage points</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Award points for positive actions or remove points for missed chores and misbehavior.</p></div><button type="button" onClick={onClose} className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close manage points"><X className="h-5 w-5" /></button></div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {familyChildren.map((child) => <article key={child.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5"><div className="flex items-center gap-2.5"><span className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold", child.color)}>{child.name.slice(0, 1)}</span><div><p className="text-sm font-semibold">{child.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">Current balance</p></div></div><p className="mt-3 text-2xl font-semibold tabular-nums">{child.points}</p></article>)}
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <h3 className="text-lg font-semibold">Record a point change</h3>
            <form action={managePoints} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">Action<select name="point-action" defaultValue="remove" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-slate-900"><option value="add">Add points</option><option value="remove">Remove points</option></select></label>
                <label className="block text-sm font-medium">Child<select name="manage-child" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-slate-900">{familyChildren.map((child) => <option key={child.id} value={child.id}>{child.name} · {child.points} pts</option>)}</select></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2"><Input name="manage-points" label="Point amount" type="number" placeholder="10" /><label className="block text-sm font-medium">Reason<select name="point-reason" defaultValue="Missed chore" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-slate-900"><option>Missed chore</option><option>Misbehavior</option><option>Repeated reminder</option><option>Helpful contribution</option><option>Great behavior</option><option>Other</option></select></label></div>
              <Input name="manage-notes" label="Notes" placeholder="What happened? (optional)" />
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">Removed points cannot exceed the child’s current balance, so balances never go below zero.</p>
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-teal-300 dark:text-slate-950"><WalletCards className="h-4 w-4" />Save point change</button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Recent point activity</h3><span className="text-xs font-medium text-slate-500 dark:text-slate-400">{transactions.length} records</span></div><div className="mt-4 space-y-3">{transactions.slice(0, 6).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5"><div className="min-w-0"><p className="truncate font-semibold">{item.child}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.activity}</p></div><div className="text-right"><p className={cn("font-semibold", item.earned ? "text-emerald-600" : "text-rose-500")}>{item.earned ? `+${item.earned}` : `-${item.redeemed}`}</p><p className="text-xs text-slate-500 dark:text-slate-400">Balance {item.balance}</p></div></div>)}</div></section>
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
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);

  const updateEvent = (formData: FormData) => {
    if (!editingEvent) return;
    const title = String(formData.get("event-title") || editingEvent.title).trim() || editingEvent.title;
    const date = String(formData.get("event-date") || dateInputValue(editingEvent.date));
    const start = String(formData.get("event-start") || timeInputValue(editingEvent.start));
    const end = String(formData.get("event-end") || timeInputValue(editingEvent.end));
    const nextEvent: FamilyEvent = {
      ...editingEvent,
      title,
      description: String(formData.get("event-description") || ""),
      date: new Date(`${date}T${start}:00`).toISOString(),
      start: timeToLabel(start),
      end: timeToLabel(end),
      location: String(formData.get("event-location") || "Home"),
      category: String(formData.get("event-category") || "Family"),
      assigned: String(formData.get("event-assigned") || "").split(",").map((item) => item.trim()).filter(Boolean),
      color: String(formData.get("event-color") || "bg-teal-500"),
      reminder: String(formData.get("event-reminder") || "1 hour")
    };
    setEvents((current) => current.map((event) => event.id === editingEvent.id ? nextEvent : event));
    setEditingEvent(null);
  };

  const deleteEvent = (event: FamilyEvent) => {
    if (!window.confirm(`Delete “${event.title}” from the family calendar?`)) return;
    setEvents((current) => current.filter((item) => item.id !== event.id));
    setEditingEvent((current) => current?.id === event.id ? null : current);
  };

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
                <EventDetail key={event.id} event={event} onEdit={() => setEditingEvent(event)} onDelete={() => deleteEvent(event)} />
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
        <Panel title="Manage events">
          <p className="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Edit an event’s details or remove it from the calendar.</p>
          <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
            {visibleEvents.map((event) => (
              <article key={event.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                <span className={cn("h-9 w-1 shrink-0 rounded-full", event.color)} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{event.title}</p><p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{formatDate(event.date)} · {event.start}</p></div>
                <button type="button" onClick={() => setEditingEvent(event)} className="rounded-lg p-2 text-slate-500 transition hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-300/10 dark:hover:text-teal-200" aria-label={`Edit ${event.title}`}><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => deleteEvent(event)} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-300/10 dark:hover:text-rose-200" aria-label={`Delete ${event.title}`}><Trash2 className="h-4 w-4" /></button>
              </article>
            ))}
            {visibleEvents.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">No events to manage.</p>}
          </div>
        </Panel>
      </aside>
      <AnimatePresence>{editingEvent && <EventEditorModal event={editingEvent} onClose={() => setEditingEvent(null)} onSave={updateEvent} />}</AnimatePresence>
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

function Panel({ title, action, onAction, children, defaultCollapsed = false }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode; defaultCollapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const panelId = `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="glass rounded-[1.5rem] p-5 shadow-panel sm:p-6">
      <div className={cn("flex items-center justify-between gap-3", !collapsed && "mb-5")}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-teal-700 transition-transform duration-200 dark:text-teal-200", collapsed && "-rotate-90")} />
          <h2 className="truncate text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action && (
            <button onClick={onAction} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
              {action}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            aria-expanded={!collapsed}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-teal-700 dark:hover:bg-white/10 dark:hover:text-teal-200"
            aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
            title={`${collapsed ? "Expand" : "Collapse"} ${title}`}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", collapsed && "-rotate-90")} />
          </button>
        </div>
      </div>
      {!collapsed && <div id={panelId}>{children}</div>}
    </section>
  );
}

function Input({ label, name, placeholder, type = "text", defaultValue }: { label: string; name: string; placeholder?: string; type?: string; defaultValue?: string | number }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 dark:border-white/10 dark:bg-white/5" />
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

function EventDetail({ event, onEdit, onDelete }: { event: FamilyEvent; onEdit: () => void; onDelete: () => void }) {
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
          <button onClick={onEdit} className="rounded-full border border-slate-200 p-2 text-teal-700 transition hover:bg-teal-50 dark:border-white/10 dark:text-teal-200 dark:hover:bg-teal-300/10" aria-label={`Edit ${event.title}`}>
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="rounded-full border border-slate-200 p-2 text-rose-500 transition hover:bg-rose-50 dark:border-white/10 dark:hover:bg-rose-300/10" aria-label={`Delete ${event.title}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function EventEditorModal({ event, onClose, onSave }: { event: FamilyEvent; onClose: () => void; onSave: (formData: FormData) => void }) {
  useEffect(() => {
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => { if (keyboardEvent.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" onClick={onClose} />
      <motion.section role="dialog" aria-modal="true" aria-labelledby="event-editor-title" initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="relative max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-panel dark:bg-slate-950 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Calendar</p><h2 id="event-editor-title" className="mt-1 text-2xl font-semibold">Edit event</h2></div><button type="button" onClick={onClose} className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close event editor"><X className="h-5 w-5" /></button></div>
        <form action={onSave} className="space-y-3">
          <Input name="event-title" label="Event title" defaultValue={event.title} placeholder="Piano lesson" />
          <Input name="event-description" label="Description" defaultValue={event.description} placeholder="Bring lesson book" />
          <Input name="event-date" label="Date" type="date" defaultValue={dateInputValue(event.date)} />
          <div className="grid grid-cols-2 gap-3"><Input name="event-start" label="Start" type="time" defaultValue={timeInputValue(event.start)} /><Input name="event-end" label="End" type="time" defaultValue={timeInputValue(event.end)} /></div>
          <Input name="event-location" label="Location" defaultValue={event.location} placeholder="Community center" />
          <Input name="event-assigned" label="Assigned members" defaultValue={event.assigned.join(", ")} placeholder="Lakshan, Jiya" />
          <div className="grid grid-cols-2 gap-3">
            <Input name="event-category" label="Category" defaultValue={event.category} placeholder="School" />
            <label className="block text-sm font-medium">Reminder<select name="event-reminder" defaultValue={event.reminder} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5">{["15 minutes", "1 hour", "1 day", "1 week"].map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <label className="block text-sm font-medium">Color category<select name="event-color" defaultValue={event.color} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-white/5">{["bg-sky-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"].map((item) => <option value={item} key={item}>{item.replace("bg-", "").replace("-500", "")}</option>)}</select></label>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10">Cancel</button><button className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600"><Save className="h-4 w-4" />Save event</button></div>
        </form>
      </motion.section>
    </motion.div>
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

function dateInputValue(isoDate: string) {
  const date = new Date(isoDate);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function timeInputValue(label: string) {
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "09:00";
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * "Your first week of posts" — shared by the public /try preview.
 * Uses AI when configured, otherwise fills niche templates so the preview
 * always works.
 */
import { aiEnabled, complete, extractJsonArray } from "@/lib/ai";

export const NICHES = [
  { key: "restaurant", label: "Restaurant" },
  { key: "salon", label: "Salon or spa" },
  { key: "fitness", label: "Fitness studio" },
  { key: "retail", label: "Retail shop" },
  { key: "auto", label: "Auto shop" },
  { key: "realestate", label: "Real estate" },
  { key: "medical", label: "Medical or dental" },
] as const;

export type NicheKey = (typeof NICHES)[number]["key"];

export interface WeekPost {
  day: string;
  time: string;
  kind: string;
  caption: string;
  imageIdea: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface NicheWords {
  thing: string;      // what they sell / do
  special: string;    // a weekly hook
  team: string;       // behind-the-scenes subject
  question: string;   // engagement poll
  offer: string;      // weekend offer
  book: string;       // call to action
  images: string[];   // 7 image ideas
}

const WORDS: Record<NicheKey, NicheWords> = {
  restaurant: {
    thing: "our kitchen",
    special: "This week's special is on the menu now",
    team: "Early mornings in our kitchen: prep, sauces, and plenty of coffee. This is how your dinner starts.",
    question: "Settle a debate for us: appetizer first, or straight to the main course?",
    offer: "Feeding a crowd this weekend? Ask about our party trays and catering.",
    book: "Reserve a table or order ahead today.",
    images: ["signature dish close-up", "kitchen prep", "two appetizers side by side", "dining room", "chef at work", "catering trays", "smiling staff"],
  },
  salon: {
    thing: "our chairs",
    special: "Fresh look for the new season? Openings are available this week",
    team: "Behind the chair: our stylists keep learning so your next cut is your best one.",
    question: "Be honest: how long has it been since your last trim?",
    offer: "Bring a friend this weekend and treat yourselves together.",
    book: "Book your appointment online or give us a call.",
    images: ["before-and-after style", "stylist at work", "product shelf", "relaxing station", "color swatches", "friends after appointments", "team photo"],
  },
  fitness: {
    thing: "our studio",
    special: "New week, new goals. Our class schedule is ready",
    team: "Meet the coaches who'll cheer you through every rep.",
    question: "Morning workout or evening workout? Tell us your team.",
    offer: "Bring a friend to class this weekend, on us.",
    book: "Grab your spot in class today.",
    images: ["group class", "coach demo", "studio equipment", "member high-five", "stretching", "friends working out", "class schedule"],
  },
  retail: {
    thing: "our shelves",
    special: "Just arrived: new pieces are in store this week",
    team: "Every item here is picked by hand. Here's a peek at how we choose.",
    question: "Which would you grab first? Comment A or B.",
    offer: "This weekend only: stop in for an in-store surprise.",
    book: "Visit us in store or shop online.",
    images: ["new arrivals display", "owner unpacking", "product A vs B", "storefront", "gift wrapping", "weekend sign", "happy customer"],
  },
  auto: {
    thing: "our shop",
    special: "Is your car ready for the season? Inspections are open this week",
    team: "Our technicians treat every car like it's their own. Here's the team.",
    question: "Quick poll: when did you last check your tire pressure?",
    offer: "Book a service this weekend and ask about our current deal.",
    book: "Schedule your service online or call us.",
    images: ["technician under hood", "clean service bay", "tire check", "team photo", "dashboard warning light", "car ready for pickup", "waiting area"],
  },
  realestate: {
    thing: "our listings",
    special: "New listing this week. Message us for a private showing",
    team: "What a day of house hunting with us really looks like.",
    question: "Dream home must-have: big kitchen or big backyard?",
    offer: "Open house this weekend. Stop by and say hello.",
    book: "Thinking of buying or selling? Let's talk.",
    images: ["listing exterior", "agent with clients", "kitchen interior", "backyard", "sold sign", "open house sign", "neighborhood street"],
  },
  medical: {
    thing: "our office",
    special: "Appointments are open this week. New patients welcome",
    team: "Meet the friendly team who'll take care of you at every visit.",
    question: "Quick tip check: how often do you replace your toothbrush?",
    offer: "Busy weekdays? Ask us about our flexible appointment times.",
    book: "Book your visit online or call our front desk.",
    images: ["welcoming front desk", "team photo", "health tip graphic", "clean exam room", "smiling patient", "appointment reminder", "thank-you card"],
  },
};

export function templateWeek(name: string, niche: NicheKey, town: string): WeekPost[] {
  const w = WORDS[niche] ?? WORDS.restaurant;
  const place = town ? ` in ${town}` : "";
  const captions: [string, string, string][] = [
    ["Monday kickoff", `${w.special}. Come see us at ${name}${place}!`, "11:00 AM"],
    ["Behind the scenes", w.team, "9:00 AM"],
    ["Poll", `${w.question} 👇`, "12:00 PM"],
    ["Local", `Proud to be part of the ${town || "local"} community. Thank you for supporting a local business like ${name}!`, "4:00 PM"],
    ["Reminder", `The weekend is almost here. ${w.book}`, "3:00 PM"],
    ["Offer", w.offer, "10:00 AM"],
    ["Thank you", `Thank you for a great week${town ? `, ${town}` : ""}! If ${name} made your day, a quick Google review helps us more than you know. ⭐`, "6:00 PM"],
  ];
  return captions.map(([kind, caption, time], i) => ({ day: DAYS[i], time, kind, caption, imageIdea: w.images[i] }));
}

export async function generateWeek(input: { name: string; niche: NicheKey; town: string }): Promise<WeekPost[]> {
  const fallback = templateWeek(input.name, input.niche, input.town);
  if (!aiEnabled()) return fallback;

  const label = NICHES.find((n) => n.key === input.niche)?.label ?? "local business";
  const system =
    "You write social media posts for small local businesses in the United States. " +
    "Warm, specific, plain English. No hashtag walls (at most 2 hashtags). At most one emoji per post. " +
    "Never invent prices, awards, statistics, addresses or phone numbers.";
  const prompt =
    `Business: ${input.name}\nType: ${label}\nTown: ${input.town || "not given"}\n\n` +
    "Write 7 posts for Monday to Sunday that work on Facebook, Instagram and Google Business Profile. " +
    "Mix: one offer or special, one behind-the-scenes, one question/poll, one local-community post, one reminder to book/visit, one customer-appreciation post, one free choice. " +
    "Each caption 1–3 short sentences, under 400 characters.\n" +
    'Reply with ONLY a JSON array of 7 objects: {"day":"Mon","time":"11:00 AM","kind":"Offer","caption":"...","imageIdea":"short photo idea"}';

  try {
    const posts = extractJsonArray<WeekPost>(await complete(system, prompt, 1500));
    if (!posts || posts.length < 7) return fallback;
    return posts.slice(0, 7).map((p, i) => ({
      day: typeof p.day === "string" ? p.day.slice(0, 3) : DAYS[i],
      time: typeof p.time === "string" ? p.time.slice(0, 10) : fallback[i].time,
      kind: typeof p.kind === "string" ? p.kind.slice(0, 30) : fallback[i].kind,
      caption: typeof p.caption === "string" && p.caption.trim() ? p.caption.trim().slice(0, 600) : fallback[i].caption,
      imageIdea: typeof p.imageIdea === "string" ? p.imageIdea.slice(0, 60) : fallback[i].imageIdea,
    }));
  } catch {
    return fallback;
  }
}

export interface Event {
  id: string;
  date: string;
  datetime: string;
  name: string;
  category: string;
  location: {
    name: string;
    address: string;
    url?: string;
  };
  description: string;
  format: string;
  entryFee?: string;
  prizes?: string;
  registrationLink?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

export const events: Event[] = [
  {
    id: "2026-03-25-hamburg",
    date: "Mittwoch, 25.03.2026",
    datetime: "2026-01-25T18:00:00",
    name: "PreModern Hamburg - 25. März 2026",
    category: "PreModern Hamburg",
    location: {
      name: "Spielbrett Hamburg",
      address: "Grindelallee 83, 20146 Hamburg",
      url: "https://www.spielbrett-hamburg.de"
    },
    description: "Unser Wöchentliches PreModern Tournament! Kommt vorbei und spielt eure Lieblingskarten aus den Jahren 1995-2003. Wir freuen uns auf spannende Matches und eine tolle Community.",
    format: "PreModern (Legacy-ähnlich, Karten bis Scourge 2003)",
    entryFee: "10€",
    prizes: "Boosters & Promo-Karten",
    registrationLink: "#",
    status: "upcoming"
  },
  {
    id: "2026-01-30-hamburg",
    date: "Donnerstag, 30.01.2026",
    datetime: "2026-01-30T18:00:00",
    name: "PreModern Hamburg - Januar 2026",
    category: "PreModern Hamburg",
    location: {
      name: "Spielbrett Hamburg",
      address: "Grindelallee 83, 20146 Hamburg",
      url: "https://www.spielbrett-hamburg.de"
    },
    description: "Unser monatliches PreModern Tournament! Kommt vorbei und spielt eure Lieblingskarten aus den Jahren 1995-2003. Wir freuen uns auf spannende Matches und eine tolle Community.",
    format: "PreModern (Legacy-ähnlich, Karten bis Scourge 2003)",
    entryFee: "10€",
    prizes: "Boosters & Promo-Karten",
    registrationLink: "#",
    status: "completed"
  },
  {
    id: "2026-02-27-hamburg",
    date: "Donnerstag, 27.02.2026",
    datetime: "2026-02-27T18:00:00",
    name: "PreModern Hamburg - Februar 2026",
    category: "PreModern Hamburg",
    location: {
      name: "Spielbrett Hamburg",
      address: "Grindelallee 83, 20146 Hamburg",
      url: "https://www.spielbrett-hamburg.de"
    },
    description: "Das Februar-Tournament steht an! Bringt eure besten Decks mit und misst euch mit anderen PreModern-Fans. Für Anfänger gibt es Leidecks und eine freundliche Einführung.",
    format: "PreModern (Legacy-ähnlich, Karten bis Scourge 2003)",
    entryFee: "10€",
    prizes: "Boosters & Promo-Karten",
    registrationLink: "#",
    status: "completed"
  },
  {
    id: "2026-03-27-hamburg",
    date: "Donnerstag, 27.03.2026",
    datetime: "2026-03-27T18:00:00",
    name: "PreModern Hamburg - März 2026",
    category: "PreModern Hamburg",
    location: {
      name: "Spielbrett Hamburg",
      address: "Grindelallee 83, 20146 Hamburg",
      url: "https://www.spielbrett-hamburg.de"
    },
    description: "Frühlings-Special! Neben dem regulären Tournament gibt es eine kleine Side-Event Serie für alle, die neue Decks ausprobieren möchten.",
    format: "PreModern (Legacy-ähnlich, Karten bis Scourge 2003)",
    entryFee: "10€",
    prizes: "Boosters & Promo-Karten",
    registrationLink: "#",
    status: "completed"
  },
  {
    id: "2026-02-15-special",
    date: "Samstag, 15.02.2026",
    datetime: "2026-02-15T14:00:00",
    name: "PreModern Winter Championship",
    category: "Tournament",
    location: {
      name: "Verschiedene Locations",
      address: "TBA",
    },
    description: "Ein besonderes Event für alle PreModern-Enthusiasten in Norddeutschland. Großes Tournament mit erweiterten Preisen und Side-Events.",
    format: "PreModern Championship (Swiss + Top 8)",
    entryFee: "25€",
    prizes: "Duals, Fetches & Playmats",
    status: "completed"
  }
];

export function getEventById(id: string): Event | undefined {
  return events.find(event => event.id === id);
}

export function getUpcomingEvents(): Event[] {
  return events
    .filter(event => event.status === 'upcoming')
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
}

export function getEventsByCategory(): { [key: string]: Event[] } {
  const categorized: { [key: string]: Event[] } = {};

  events.forEach(event => {
    if (!categorized[event.category]) {
      categorized[event.category] = [];
    }
    categorized[event.category].push(event);
  });

  return categorized;
}

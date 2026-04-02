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
  status: "upcoming" | "completed" | "cancelled";
}

export const events: Event[] = [
  {
    id: "2026-04-01-hamburg",
    date: "Mittwoch, 01.04.2026",
    datetime: "2026-04-01T18:30:00",
    name: "PreModern Hamburg - 1. April 2026",
    category: "Untap Altona PreModern",
    location: {
      name: "Weidenkantine",
      address: "Spritzenpl. 5, 22765 Hamburg, Germany",
      url: "https://www.weidenkantine.de/",
    },
    description: `Jeden Mittwoch in der neuen Weidenkantine am Spritzenplatz. Eintritt frei für Untap Altona Verieinsmitglieder. Premodern Staples im Preispool.

Proxies sind erlaubt. Bitte nur Original Layout, Print (Farbe), Text (Deutsch oder Englisch) und Bild (MTGO exklusive Bilder sind auch ok). Proxies müssen als solche erkennbar sein. Insbesondere ist das Spielen von IE/CE/gold-bordered Karten erlaubt.`,
    format: "PreModern",
    entryFee: "5€",
    prizes: "Premodern Staples",
    registrationLink:
      "https://topdeck.gg/event/untap-altona-premodern-weekly-0104",
    status: "completed",
  },

  {
    id: "2026-04-08-hamburg",
    date: "Mittwoch, 08.04.2026",
    datetime: "2026-04-08T18:30:00",
    name: "PreModern Hamburg - 8. April 2026",
    category: "Untap Altona PreModern",
    location: {
      name: "Weidenkantine",
      address: "Spritzenpl. 5, 22765 Hamburg, Germany",
      url: "https://www.weidenkantine.de/",
    },
    description: `Jeden Mittwoch in der neuen Weidenkantine am Spritzenplatz. Eintritt frei für Untap Altona Verieinsmitglieder. Premodern Staples im Preispool.

Proxies sind erlaubt. Bitte nur Original Layout, Print (Farbe), Text (Deutsch oder Englisch) und Bild (MTGO exklusive Bilder sind auch ok). Proxies müssen als solche erkennbar sein. Insbesondere ist das Spielen von IE/CE/gold-bordered Karten erlaubt.`,
    format: "PreModern",
    entryFee: "5€",
    prizes: "Premodern Staples",
    registrationLink: "",
    status: "upcoming",
  },
];

export function getEventById(id: string): Event | undefined {
  return events.find((event) => event.id === id);
}

export function getUpcomingEvents(): Event[] {
  return events
    .filter((event) => event.status === "upcoming")
    .sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
    );
}

export function getEventsByCategory(): { [key: string]: Event[] } {
  const categorized: { [key: string]: Event[] } = {};

  events.forEach((event) => {
    if (!categorized[event.category]) {
      categorized[event.category] = [];
    }
    categorized[event.category].push(event);
  });

  return categorized;
}

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

export interface EventsByStatusAndCategory {
  upcoming: Record<string, Event[]>;
  passedOrCancelled: Record<string, Event[]>;
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
    registrationLink: "https://topdeck.gg/event/untap-altona-premodern-weekly-0804",
    status: "completed",
  },

  {
    id: "2026-04-15-hamburg",
    date: "Mittwoch, 15.04.2026",
    datetime: "2026-04-15T18:30:00",
    name: "PreModern Hamburg - 15. April 2026",
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
      "https://topdeck.gg/event/untap-altona-premodern-weekly-1504",
    status: "upcoming",
  },

  {
    id: "2026-04-22-hamburg",
    date: "Mittwoch, 22.04.2026",
    datetime: "2026-04-22T18:30:00",
    name: "PreModern Hamburg - 22. April 2026",
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
      "https://topdeck.gg/event/untap-altona-premodern-weekly-2204",
    status: "upcoming",
  },

  {
    id: "2026-04-29-hamburg",
    date: "Mittwoch, 29.04.2026",
    datetime: "2026-04-29T18:30:00",
    name: "PreModern Hamburg - 29. April 2026",
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
      "https://topdeck.gg/event/untap-altona-premodern-weekly-2904",
    status: "upcoming",
  },

  {
    id: "2026-05-06-hamburg",
    date: "Mittwoch, 06.05.2026",
    datetime: "2026-05-06T18:30:00",
    name: "PreModern Hamburg - 6. Mai 2026",
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
      "https://topdeck.gg/event/untap-altona-premodern-weekly-0605",
    status: "upcoming",
  },
];

export function getEventById(id: string): Event | undefined {
  return events.find((event) => event.id === id);
}

export function getUpcomingEvents(): Event[] {
  return sortEventsByDatetime(
    events.filter((event) => event.status === "upcoming"),
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

export function getHomepageEvents(): EventsByStatusAndCategory {
  const upcoming = sortEventsByDatetime(
    events.filter((event) => event.status === "upcoming"),
  );
  const passedOrCancelled = sortEventsByDatetime(
    events.filter((event) => event.status !== "upcoming"),
  );

  return {
    upcoming: groupEventsByCategory(upcoming),
    passedOrCancelled: groupEventsByCategory(passedOrCancelled),
  };
}

function sortEventsByDatetime(eventsToSort: Event[]): Event[] {
  return [...eventsToSort].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
  );
}

function groupEventsByCategory(eventsToGroup: Event[]): Record<string, Event[]> {
  return eventsToGroup.reduce<Record<string, Event[]>>((categorized, event) => {
    if (!categorized[event.category]) {
      categorized[event.category] = [];
    }

    categorized[event.category].push(event);
    return categorized;
  }, {});
}

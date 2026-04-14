import eventsData from "./events.json";

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

export const events: Event[] = eventsData as Event[];

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

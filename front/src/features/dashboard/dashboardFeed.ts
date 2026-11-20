import type { EventDto, PanDto } from "../../api/generated/model";

export type FeedItem =
    | { kind: "pan"; key: string; at: string; pan: PanDto }
    | { kind: "event"; key: string; at: string; event: EventDto };

/** A session's pans and events as one feed, newest first; of equal times the pan comes first, as it caused the event. */
export function feedItems(pans: PanDto[], events: EventDto[]): FeedItem[] {
    const items: FeedItem[] = [
        ...pans.map((pan): FeedItem => ({ kind: "pan", key: `pan-${pan.id}`, at: pan.timestamp, pan })),
        ...events.map((event): FeedItem => ({ kind: "event", key: `event-${event.id}`, at: event.created_at, event })),
    ];
    const time = (item: FeedItem) => new Date(item.at).getTime();
    return items.sort((a, b) => time(b) - time(a) || (a.kind === b.kind ? 0 : a.kind === "event" ? -1 : 1));
}

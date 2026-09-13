const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "15 September 2026" — matches the Figma design. */
export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

export function formatReadingTime(minutes: number) {
  return `${minutes} min read`;
}

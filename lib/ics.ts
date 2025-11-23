export function generateICS({
  uid = `twyif-${Date.now()}@diafrica`,
  start,
  end,
  summary,
  description,
  location,
}: {
  uid?: string;
  start: Date;
  end?: Date;
  summary: string;
  description: string;
  location: string;
}) {
  function toCalDate(d: Date) {
    // YYYYMMDDTHHMMSSZ
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  const dtstamp = toCalDate(new Date());
  const dtstart = toCalDate(start);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DI Africa//TWYIF//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    ...(end ? [`DTEND:${toCalDate(end)}`] : []),
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return ics;
}

export function encodeICSToBase64(ics: string) {
  return Buffer.from(ics, 'utf8').toString('base64');
}

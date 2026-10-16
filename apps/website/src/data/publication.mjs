const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const isoDate = (value) =>
  text(value) &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

/** Select a deliberately small public shape; never spread source records. */
export function selectPublications(snapshot, kind) {
  if (snapshot.tenant !== 'nmaogun' || !['articles', 'events'].includes(kind)) return [];
  const result = [];
  const slugs = new Set();
  for (const record of snapshot[kind] ?? []) {
    if (
      record.tenant !== 'nmaogun' ||
      record.publish !== true ||
      record.status !== 'approved' ||
      record.visibility !== 'public'
    )
      continue;
    if (
      !slugPattern.test(record.slug ?? '') ||
      !text(record.title) ||
      !text(record.summary) ||
      !text(record.approvedBy) ||
      !isoDate(record.reviewedAt)
    )
      continue;
    if (
      !Array.isArray(record.paragraphs) ||
      !record.paragraphs.length ||
      !record.paragraphs.every(text)
    )
      continue;
    const date = kind === 'articles' ? record.publishedAt : record.startDate;
    if (
      !isoDate(date) ||
      (kind === 'articles' && !text(record.author)) ||
      (kind === 'events' && !text(record.venue))
    )
      continue;
    if (slugs.has(record.slug)) throw new Error(`Duplicate ${kind} slug: ${record.slug}`);
    slugs.add(record.slug);
    result.push({
      slug: record.slug,
      title: record.title,
      summary: record.summary,
      paragraphs: [...record.paragraphs],
      ...(kind === 'articles'
        ? { publishedAt: date, author: record.author }
        : { startDate: date, venue: record.venue }),
    });
  }
  return result;
}

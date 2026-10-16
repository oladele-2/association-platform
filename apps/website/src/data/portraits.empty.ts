import type { ImageMetadata } from 'astro';
// Normal builds never import or emit candidate portrait files.
const portraits: Record<string, ImageMetadata> = {};
export default portraits;

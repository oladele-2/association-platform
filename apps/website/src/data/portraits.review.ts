import type { ImageMetadata } from 'astro';
const modules = import.meta.glob<{ default: ImageMetadata }>('../assets/portraits/*.jpg', {
  eager: true,
});
const portraits: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(modules).map(([path, module]) => [path.split('/').pop()!, module.default]),
);
export default portraits;

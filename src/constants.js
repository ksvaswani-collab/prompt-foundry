// Keep FONT_OPTIONS identical to any font list validated by api/generate.js.
export const FONT_OPTIONS = [
  "Inter", "Space Grotesk", "IBM Plex Sans", "Sora", "DM Sans", "Manrope",
  "Work Sans", "Poppins", "Fraunces", "Playfair Display", "Lora",
  "Merriweather", "Georgia", "JetBrains Mono", "Nunito", "Outfit"
];

export const INDUSTRIES = [
  "SaaS / B2B Software", "Consumer / Tech App", "E-commerce / Retail",
  "Fintech / Banking", "Healthcare / Medical", "Education / EdTech",
  "Real Estate / Property", "Travel / Hospitality", "Food & Beverage",
  "Fashion / Beauty", "Nonprofit / Cause-driven", "Legal / Professional Services",
  "Media / Entertainment", "Government / Civic", "Custom…"
];

export const RESOLUTIONS = [
  { id: 'd1440', device: 'Desktop', w: 1440, h: 1024 },
  { id: 'd1920', device: 'Desktop', w: 1920, h: 1024 },
  { id: 'm375', device: 'Mobile', w: 375, h: 812 },
  { id: 'm390', device: 'Mobile', w: 390, h: 844 },
];

export const APPEARANCE_MODES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'both', label: 'Both', hint: 'one prompt, dual-theme' },
  { id: 'auto', label: 'Auto', hint: 'model infers from tokens' },
];
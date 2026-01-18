
import React from 'react';

export const VISUAL_STYLES = [
  { 
    id: 'barely', 
    name: 'Barely-there UI', 
    desc: 'Typography focus, whitespace.', 
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBRS4sCM8NVnMYdUXwmQCZsoqAsJ3nhggXaJANbjWpb3na3LxihiQ7c3TG-5j1Wc8bSKWE5uLJOfIylp8xX5624knxL1uiw_F7EIejAf1B-I3k0Mvp910uHe7QIBWO79f2gtMCxtn2AfS3uK0Q7nS8XzkYQHOdOwAb_zZr9mz16AmqWmF-TmY4Ra3l8wU4Ibpip48HBU9woV5SYhCPzibqoxZVfCa4sLi4UGjpw4GfiiQbG01X1bBBD2RsGt9iYfAjOFiDx5LEA8GOX" 
  },
  { 
    id: 'human', 
    name: 'Human Touch', 
    desc: 'Warm, serif, organic.', 
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA17zJooEBUdBqJFvL0Vrk22GAGUq-bTu08DGD5OVk4OfB7FGTLO5YpL_MNb990otoKMquVvtI4mazsL5uSnQ2cNvhA2a7ScZ8lex1hf8kkzKS2piFnxLbKDu_ciw_TZAkczuSOxDiaIzXS2Jy42qw0lUzco968837GvPIqht1hbnT1L6YoBPsvQPLycy3Su11X1zV4npR6-VMbeUR-X6KTJWTw1ZpYEIdidRakwAziUW6gVqzePTULJ-tVEftLdv8gjf2UoHQsJ-ji",
    recommended: true
  },
  { 
    id: 'corporate', 
    name: 'Clean Corporate', 
    desc: 'Professional blue, grid.', 
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCNywdu6xVSRg16lMoTM7POqg4WT9azAcMSldIKmM0SAlb_AtEv4T84hi_D3kLN3HOfv1e92Xaz0uTqKPROq9T3Q3NJmtwIGrfe8TRCUVuwUUUiV3suZMz634DlWjuSrt_WCNA2vKAcv-piwgqoiveZgPDsBUoLQVm2th64I-7KFM4OzRBFk1kb4xUQft7Q8sx-6LmGl8i_O_KbX9Ss7MBeC9xIc9Utk0qzGtOEOTdwLd1hygrHawuBz7XqMtNOq-peiPSmXBYxhVEx" 
  },
  { 
    id: 'cyberpunk', 
    name: 'Cyberpunk Edge', 
    desc: 'Neon, high-contrast, tech.', 
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCtWaexaklH6wVjB8rczMJOZ-2D3tCKJg9cU47dJQZcW_BZ7rZM_QFV0xF9MFki6UPyI68rhNSic9HnV1N29-MJEBqC4k3E9A3GiDlEG25WFMsAGwMp7YVD9YFMOnyIShviaej4KFXbWdHuc5J8Xh3JGTwE_8c1MeWdfl0oto7xpXiAzp2VOAFI2bJmV2YthCUM9NtMEVUKNedJqsDafk9T-BLitcJoXKW9oqyDEFooPZ3xkDKdLAor2SGLYyLE6JK_niB512XDkLUZ"
  },
  {
    id: 'swiss',
    name: 'Swiss International',
    desc: 'Rational, objective, bold grid.',
    img: "https://placehold.co/600x400/EA2C2C/FFFFFF?text=Swiss+Grid"
  },
  {
    id: 'brutal',
    name: 'Neo-Brutalism',
    desc: 'Raw, stark, high contrast.',
    img: "https://placehold.co/600x400/FFF000/000000?text=Neo+Brutalism"
  },
  {
    id: 'luxury',
    name: 'Luxury Dark',
    desc: 'Gold, black, serif, elegant.',
    img: "https://placehold.co/600x400/000000/D4AF37?text=Luxury+Dark"
  },
  {
    id: 'pastel',
    name: 'Soft Pastel',
    desc: 'Calm, soothing, rounded.',
    img: "https://placehold.co/600x400/FFD1DC/555555?text=Soft+Pastel"
  }
];

export const COMPONENTS = [
  { id: 'hero-1', name: 'Hero Type A', group: 'Headers', icon: 'web_asset' },
  { id: 'hero-v', name: 'Hero Video', group: 'Headers', icon: 'video_library' },
  { id: 'feat-grid', name: 'Feature Grid 3x2', group: 'Value Prop', icon: 'grid_view' },
  { id: 'logos', name: 'Client Logos', group: 'Trust', icon: 'verified' },
  { id: 'testimonials', name: 'Testimonios', group: 'Trust', icon: 'forum' },
  { id: 'catalog', name: 'Catálogo', group: 'Content', icon: 'category' },
  { id: 'pricing', name: 'Pricing Table', group: 'Conversion', icon: 'payments' },
  { id: 'faq', name: 'Preguntas Frecuentes', group: 'Support', icon: 'help_center' },
  { id: 'footer', name: 'Footer', group: 'Structure', icon: 'call_to_action' }
];

export const INTEGRATIONS = [
  { id: 'stripe', name: 'Stripe Payments', desc: 'Full checkout integration', icon: 'payments', color: '#635BFF' },
  { id: 'paypal', name: 'PayPal Standard', desc: 'Simple button integration', icon: 'account_balance_wallet', color: '#003087' },
  { id: 'calendly', name: 'Calendly Embed', desc: 'Inline booking widget', icon: 'calendar_today', color: '#006BFF' },
  { id: 'calcom', name: 'Cal.com Open Source', desc: 'Flexible scheduling', icon: 'calendar_month', color: '#000000' }
];

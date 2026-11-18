import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
  const ogImageUrl = `${window.location.origin}/assets/aistudio/images__1__e22ba1d6.jpg`;

  const setMetaContent = (selector: string, content: string) => {
    const el = document.querySelector<HTMLMetaElement>(selector);
    if (el) el.setAttribute('content', content);
  };

  setMetaContent('meta[property="og:url"]', canonicalUrl);
  setMetaContent('meta[property="og:image"]', ogImageUrl);
  setMetaContent('meta[name="twitter:image"]', ogImageUrl);

  const canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonicalLink) canonicalLink.setAttribute('href', canonicalUrl);
}

createRoot(document.getElementById('root')!).render(<App />);

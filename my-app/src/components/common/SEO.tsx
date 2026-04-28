import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({
  title = 'AILL - AI与人类共创社区 | 现代功能全都要',
  description = 'AILL 是一个 AI 与人类协作共创的社区平台，现代功能全都要——汇聚优质内容、热门讨论和前沿技术',
  keywords = 'AI,社区,共创,人工智能,现代功能,技术讨论',
  image,
  url,
  type = 'website',
}: SEOProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', description);
    setMeta('keywords', keywords);
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:type', type);
    if (image) setMeta('og:image', image);
    if (url) setMeta('og:url', url);
  }, [title, description, keywords, image, url, type]);

  return null;
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/common/SEO';
import api from '@/lib/api';
import { IconChevronRight, IconComment, IconFire, IconGroup } from "@/components/ui/icon";
import { SECTIONS } from '@/lib/nav-config';

export function SectionsPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCounts();
  }, []);

  async function loadCounts() {
    const c: Record<string, number> = {};
    await Promise.all(
      SECTIONS.map(async (s) => {
        try {
          const r = await api.get('/api/posts', { params: { sectionId: s.id, pageSize: 1 } });
          c[s.id] = r.data.total || 0;
        } catch { c[s.id] = 0; }
      })
    );
    setCounts(c);
    setLoading(false);
  }

  return (
    <div className="py-3" data-name="sectionsPage">
      <SEO title="分区 - AILL | AI与人类共创社区" description="浏览社区各技术分区" />
      {/* Header banner */}
      <div className="relative overflow-hidden border-b border-border" data-name="sectionsPage.hero">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(270 65% 60% / 0.08) 0%, transparent 40%, hsl(210 100% 56% / 0.05) 100%)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ background: 'hsl(270 65% 60%)' }} />
        <div className="relative py-8">
          <h1 className="text-2xl font-bold mb-1" data-name="sectionsPage.title">分区导航</h1>
          <p className="text-foreground-secondary text-sm" data-name="sectionsPage.desc">探索不同领域的内容社区</p>
        </div>
      </div>

      <div className="py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-name="sectionsPage.grid">
          {SECTIONS.map((section, i) => (
            <Link
              key={section.id}
              to={`/posts?sectionId=${section.id}`}
              data-name={`sectionsPage.section.${section.id}`}
              className="group relative overflow-hidden rounded-xl border p-5 transition-all duration-200 hover:scale-[1.01] reveal-item"
              style={{
                animationDelay: `${i * 60}ms`,
                background: `linear-gradient(135deg, hsl(${section.color} / 0.08), hsl(${section.color} / 0.02))`,
                borderColor: `hsl(${section.color} / 0.15)`,
                boxShadow: `inset 0 1px 0 hsl(${section.color} / 0.1)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `hsl(${section.color} / 0.3)`;
                e.currentTarget.style.boxShadow = `0 4px 16px hsl(${section.color} / 0.1), inset 0 1px 0 hsl(${section.color} / 0.15)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `hsl(${section.color} / 0.15)`;
                e.currentTarget.style.boxShadow = `inset 0 1px 0 hsl(${section.color} / 0.1)`;
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg border"
                    style={{ background: `hsl(${section.color} / 0.15)`, borderColor: `hsl(${section.color} / 0.25)` }}
                    data-name={`sectionsPage.section.${section.id}.icon`}
                  >
                    <span className="text-xl">{section.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground" data-name={`sectionsPage.section.${section.id}.name`}>{section.name}</h2>
                    <p className="text-xs text-foreground-secondary" data-name={`sectionsPage.section.${section.id}.desc`}>{section.desc}</p>
                  </div>
                </div>
                <IconChevronRight size={20} className="text-foreground-tertiary group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px] text-foreground-tertiary">
                  <span className="flex items-center gap-1">
                    <IconComment size={12} />
                    {loading ? '...' : (counts[section.id] || 0)} 帖子
                  </span>
                  <span className="flex items-center gap-1">
                    <IconGroup size={12} />
                    活跃中
                  </span>
                </div>
                {section.hot && (
                  <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: `hsl(${section.color})` }}>
                    <IconFire size={12} />
                    {section.hot}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

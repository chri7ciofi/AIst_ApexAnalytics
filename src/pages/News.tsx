import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';

interface NewsItem {
  title: string;
  link: string;
  date: string;
  source: string;
}

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Motorsport:     { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20' },
  FormulaPassion: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20' },
  'F1 Official':  { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20' },
};

export default function News() {
  const [topNews, setTopNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoadingNews(true);
    setNewsError(null);
    try {
      const res = await axios.get('/api/news');
      setTopNews(res.data);
    } catch {
      setNewsError('Failed to fetch the latest headlines.');
    } finally {
      setLoadingNews(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 lg:space-y-8 overflow-y-auto pr-2 custom-scrollbar pb-8 items-center pt-4">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Top 5</span> News
        </h2>
        <p className="text-zinc-400 mt-2 text-sm max-w-md mx-auto">
          I migliori articoli del momento dalla stampa globale, costantemente aggiornati sul panorama della Formula 1.
        </p>
      </div>

      <div className="w-full max-w-3xl space-y-4 pt-2">
        <div className="flex items-center justify-center gap-2 mb-4 text-zinc-300 font-medium">
          <Newspaper size={18} className="text-red-400" />
          Ultime dal tracciato
        </div>

        {loadingNews ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse bg-zinc-900/50 h-[92px] rounded-xl border border-zinc-800/50 w-full"></div>
              ))}
            </div>
        ) : newsError ? (
          <div className="p-6 bg-zinc-900/50 text-center rounded-xl border border-zinc-800/50 w-full">
              <p className="text-zinc-500">{newsError}</p>
          </div>
        ) : (
          <div className="space-y-4 w-full">
            {topNews.map((item, idx) => {
              const colors = SOURCE_COLORS[item.source] || SOURCE_COLORS.Motorsport;
              const timeAgo = item.date ? formatDistanceToNow(new Date(item.date), { addSuffix: true }) : '';

              return (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700/80 rounded-xl p-5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-zinc-200 group-hover:text-white transition-colors leading-snug line-clamp-2 text-[15px]">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-3">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {item.source}
                        </span>
                        {timeAgo && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
                            <Clock size={12} />
                            {timeAgo}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-1 transition-colors" />
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

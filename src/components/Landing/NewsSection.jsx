// src/components/Landing/NewsSection.jsx
import { forwardRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/config";
import { keysToCamel } from "../../utils/cache";

// Simple SVG icon components
const CalendarIcon = () => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const LinkIcon = () => (
  <svg 
    width="14" 
    height="14" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg 
    width="12" 
    height="12" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

const ChevronDownIcon = () => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const ChevronUpIcon = () => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

// Fallback news if none in database
const FALLBACK_NEWS = [
  {
    id: 'fallback-1',
    title: "Registration Now Open for RYK MUN 2026!",
    description: "Early bird registration is now live with limited seats. Secure your spot today and be part of the most prestigious MUN conference in the region.",
    category: "Announcement",
    publishedAt: "2026-06-01",
    link: "#register",
    isFeatured: true
  },
  {
    id: 'fallback-2',
    title: "Keynote Speakers Revealed",
    description: "We are honored to announce Ambassador Sarah Khan and Dr. Michael Roberts as our keynote speakers for this year's conference.",
    category: "Speakers",
    publishedAt: "2026-05-28",
    isFeatured: true
  }
];

const NewsCard = ({ item, isFeatured, isMobile }) => {
  const navigate = useNavigate();
  
  // Fix: Handle different date formats from database
  let formattedDate = 'Date TBA';
  try {
    if (item.publishedAt) {
      const date = new Date(item.publishedAt);
      if (!isNaN(date.getTime())) {
        formattedDate = date.toLocaleDateString('en-PK', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    }
  } catch (e) {
    console.error('Date parsing error:', e);
  }

  const handleLinkClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!item.link) return;
    
    // Check if it's an external link
    if (item.link.startsWith('http://') || item.link.startsWith('https://')) {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    } 
    // Check if it's an internal section link
    else if (item.link.startsWith('#')) {
      const sectionId = item.link.replace('#', '');
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    // Check if it's an internal route
    else if (item.link.startsWith('/')) {
      navigate(item.link);
    }
    // Default: treat as external
    else {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    }
  };

  const isExternalLink = item.link && (item.link.startsWith('http://') || item.link.startsWith('https://'));
  const linkDisplay = item.link 
    ? item.link.replace(/^https?:\/\//, '').replace(/^#/, '').replace(/\/$/, '')
    : '';

  const LinkButton = () => {
    if (!item.link) return null;
    
    return (
      <button
        onClick={handleLinkClick}
        type="button"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 cursor-pointer"
        style={{ 
          color: '#B79143', 
          backgroundColor: 'rgba(183,145,67,0.1)',
          border: '1px solid rgba(183,145,67,0.2)'
        }}
      >
        {isExternalLink ? <ExternalLinkIcon /> : <LinkIcon />}
        <span className="truncate max-w-[200px]">{linkDisplay}</span>
      </button>
    );
  };

  if (isFeatured) {
    return (
      <div className={`relative group bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-gold/50 transition-all duration-500 hover:shadow-2xl hover:shadow-gold/10 ${isMobile ? 'p-4' : 'p-6'}`}>
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1.5 text-xs font-semibold rounded-full border"
            style={{ 
              color: '#B79143', 
              borderColor: 'rgba(183,145,67,0.3)', 
              backgroundColor: 'rgba(183,145,67,0.2)' 
            }}>
            Featured
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: '#B79143' }}><CalendarIcon /></span>
          <span className="text-sm text-gray-300">{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium px-3 py-1 rounded-full border"
            style={{ 
              color: '#B79143', 
              borderColor: 'rgba(183,145,67,0.2)', 
              backgroundColor: 'rgba(183,145,67,0.1)' 
            }}>
            {item.category}
          </span>
        </div>

        <h3 className={`font-bold text-white mb-3 group-hover:text-gold transition-colors duration-300 ${isMobile ? 'text-lg' : 'text-xl'}`}>
          {item.title}
        </h3>

        <p className={`text-gray-300 leading-relaxed mb-4 line-clamp-3 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {item.description}
        </p>

        <LinkButton />
      </div>
    );
  }

  return (
    <div className={`group bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-xl hover:border-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-gold/5 ${isMobile ? 'p-4' : 'p-6'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium px-3 py-1 rounded-full border"
          style={{ 
            color: '#B79143', 
            borderColor: 'rgba(183,145,67,0.2)', 
            backgroundColor: 'rgba(183,145,67,0.1)' 
          }}>
          {item.category}
        </span>
        <div className="flex items-center gap-1.5 text-gray-400">
          <CalendarIcon />
          <span className="text-xs">{formattedDate}</span>
        </div>
      </div>

      <h3 className={`font-semibold text-white mb-2 group-hover:text-gold transition-colors duration-300 ${isMobile ? 'text-base' : 'text-lg'}`}>
        {item.title}
      </h3>

      <p className={`text-gray-300 leading-relaxed mb-4 line-clamp-3 ${isMobile ? 'text-xs' : 'text-sm'}`}>
        {item.description}
      </p>

      <LinkButton />
    </div>
  );
};

const NewsSection = forwardRef(({ news: externalNews }, ref) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Fetch only published news for public display
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .eq('is_published', true)
          .order('is_featured', { ascending: false })
          .order('published_at', { ascending: false })
          .limit(6);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setNews(keysToCamel(data));
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Use external news if provided, otherwise use fetched news, fallback to default
  const displayNews = externalNews && externalNews.length > 0 
    ? externalNews 
    : news.length > 0 
      ? news 
      : FALLBACK_NEWS;

  const featuredNews = displayNews.filter(item => item.isFeatured);
  const regularNews = displayNews.filter(item => !item.isFeatured);
  const hasFeatured = featuredNews.length > 0;
  
  // On mobile, show only first 2 items when collapsed
  const visibleFeatured = isMobile && !isExpanded ? featuredNews.slice(0, 1) : featuredNews;
  const visibleRegular = isMobile && !isExpanded ? [] : regularNews;
  const totalItems = featuredNews.length + regularNews.length;
  const visibleItems = visibleFeatured.length + visibleRegular.length;
  const hasMoreItems = isMobile && totalItems > visibleItems;

  if (loading) {
    return (
      <section ref={ref} id="news" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#B79143]/20 border-t-[#B79143] animate-spin" />
        </div>
      </section>
    );
  }

  if (!displayNews || displayNews.length === 0) return null;

  return (
    <section ref={ref} id="news" className="relative z-10 py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, rgba(183,145,67,0.3) 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="text-sm font-semibold tracking-widest uppercase mb-4 block"
            style={{ color: '#B79143' }}>
            Stay Informed
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Latest{" "}
            <span className="text-transparent bg-clip-text"
              style={{ 
                backgroundImage: 'linear-gradient(to right, #B79143, #f87171)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
              Updates
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-lg">
            Get the latest announcements, updates, and information about RYK MUN 2026
          </p>
        </div>

        {/* Featured News - Top Grid */}
        {visibleFeatured.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-8">
            {visibleFeatured.map((item) => (
              <NewsCard key={item.id} item={item} isFeatured={true} isMobile={isMobile} />
            ))}
          </div>
        )}

        {/* Regular News - Bottom Grid */}
        {visibleRegular.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {visibleRegular.map((item) => (
              <NewsCard key={item.id} item={item} isFeatured={false} isMobile={isMobile} />
            ))}
          </div>
        )}

        {/* Show More / Show Less Button for Mobile */}
        {hasMoreItems && (
          <div className="flex justify-center mt-6 md:hidden">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
              style={{ 
                color: '#B79143', 
                backgroundColor: 'rgba(183,145,67,0.1)',
                border: '1px solid rgba(183,145,67,0.2)'
              }}
            >
              {isExpanded ? (
                <>
                  Show Less
                  <ChevronUpIcon />
                </>
              ) : (
                <>
                  Show All News ({totalItems})
                  <ChevronDownIcon />
                </>
              )}
            </button>
          </div>
        )}

        {/* Collapse button when expanded */}
        {isMobile && isExpanded && totalItems > 1 && (
          <div className="flex justify-center mt-4 md:hidden">
            <button
              onClick={() => {
                setIsExpanded(false);
                // Scroll back to top of news section
                const newsSection = document.getElementById('news');
                if (newsSection) {
                  newsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
              style={{ 
                color: '#B79143', 
                backgroundColor: 'rgba(183,145,67,0.1)',
                border: '1px solid rgba(183,145,67,0.2)'
              }}
            >
              Show Less
              <ChevronUpIcon />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </section>
  );
});

NewsSection.displayName = 'NewsSection';

export default NewsSection;
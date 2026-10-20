import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, ChevronLeft, ChevronRight, Maximize2, X, Camera, Quote } from 'lucide-react';
import { playSoftPop } from '../utils/audio';

// Import generated authentic 20/10 photos
import imgAoDai from '../assets/images/spotlight_vietnam_aodai_1792467187219.jpg';
import imgMotherDaughter from '../assets/images/spotlight_mother_daughter_1792467205358.jpg';
import imgTeachersOffice from '../assets/images/spotlight_teachers_office_1792467223494.jpg';

interface SpotlightSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  tag: string;
  quote: string;
  author: string;
}

const SPOTLIGHT_SLIDES: SpotlightSlide[] = [
  {
    id: 'aodai',
    image: imgAoDai,
    title: 'Duyên Dáng Tà Áo Dài & Hương Sen Hồng',
    subtitle: 'Nét đẹp truyền thống thướt tha, đằm thắm của người phụ nữ Việt Nam qua bao thế hệ.',
    tag: 'Tôn Vinh Nét Đẹp Việt',
    quote: 'Phụ nữ Việt Nam như đóa sen tinh khiết: dịu dàng tỏa hương, kiên cường vượt gian khó để ngát ngào sắc thắm.',
    author: 'Tri ân ngày 20/10',
  },
  {
    id: 'mother',
    image: imgMotherDaughter,
    title: 'Vòng Tay Của Mẹ – Bến Đỗ Bình Yên',
    subtitle: 'Tình yêu thương vô bờ bến và những hy sinh thầm lặng của người mẹ hiền luôn là điểm tựa ấm áp nhất.',
    tag: 'Tình Mẫu Tử Thiêng Liêng',
    quote: 'Cảm ơn Mẹ đã luôn bên con với nụ cười bao dung và trái tim ấm áp nhất cuộc đời này.',
    author: 'Gửi Mẹ yêu dấu',
  },
  {
    id: 'teachers',
    image: imgTeachersOffice,
    title: 'Ngọn Lửa Tri Thức & Bản Lĩnh Hiện Đại',
    subtitle: 'Những nữ nhà giáo tận tâm, nữ trí thức và đồng nghiệp kiên định kiến tạo tương lai tươi sáng.',
    tag: 'Nữ Trí Thức & Đồng Nghiệp',
    quote: 'Tri ân những cô giáo và người phụ nữ hiện đại luôn thắp sáng ước mơ và lan tỏa năng lượng tích cực.',
    author: 'Trường TC CN Bách Khoa Sầm Sơn',
  },
];

export const PhotoSpotlightSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [heartsCount, setHeartsCount] = useState<{ [key: string]: number }>(() => {
    return { aodai: 142, mother: 285, teachers: 196 };
  });
  const [hasLiked, setHasLiked] = useState<{ [key: string]: boolean }>({});

  // Auto-play slideshow every 5 seconds if not paused
  useEffect(() => {
    if (isPaused || lightboxOpen) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SPOTLIGHT_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, lightboxOpen]);

  const currentSlide = SPOTLIGHT_SLIDES[currentIndex];

  const handlePrev = () => {
    playSoftPop();
    setCurrentIndex((prev) => (prev - 1 + SPOTLIGHT_SLIDES.length) % SPOTLIGHT_SLIDES.length);
  };

  const handleNext = () => {
    playSoftPop();
    setCurrentIndex((prev) => (prev + 1) % SPOTLIGHT_SLIDES.length);
  };

  const handleToggleLike = (id: string) => {
    playSoftPop();
    setHasLiked((prev) => {
      const nextLiked = !prev[id];
      setHeartsCount((h) => ({
        ...h,
        [id]: h[id] + (nextLiked ? 1 : -1),
      }));
      return { ...prev, [id]: nextLiked };
    });
  };

  return (
    <section
      id="spotlight"
      className="py-20 relative bg-gradient-to-b from-[#FFFDF9] via-rose-50/50 to-[#FFFDF9] dark:from-[#140317] dark:via-[#1E0524] dark:to-[#140317] transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700/60 text-xs font-bold text-rose-800 dark:text-rose-300 mb-3 shadow-sm">
            <Camera className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>KHOẢNH KHẮC SPOTLIGHT 20/10</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-stone-900 dark:text-white tracking-tight">
            Tôn Vinh Vẻ Đẹp & Tâm Hồn Phụ Nữ Việt Nam
          </h2>
          <p className="mt-3 text-stone-600 dark:text-stone-300 text-sm sm:text-base leading-relaxed">
            Những khoảnh khắc ngập tràn sắc hoa, nụ cười rạng ngời và tình cảm ấm áp dành tặng những người phụ nữ tuyệt vời nhất trong cuộc đời.
          </p>
        </div>

        {/* Carousel Container */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-rose-200 dark:border-rose-900/60 bg-white dark:bg-stone-900 group"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Main Slide Image */}
          <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden">
            <img
              src={currentSlide.image}
              alt={currentSlide.title}
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-103"
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/70 via-transparent to-transparent hidden md:block" />

            {/* Top Bar Badge & Fullscreen button */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 z-10">
              <span className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {currentSlide.tag}
              </span>
            </div>

            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-10">
              {/* Like / Heart Reaction */}
              <button
                type="button"
                onClick={() => handleToggleLike(currentSlide.id)}
                className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  hasLiked[currentSlide.id]
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                    : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                }`}
                title="Thả tim khoảnh khắc này"
              >
                <Heart
                  className={`w-4 h-4 ${hasLiked[currentSlide.id] ? 'fill-white' : ''}`}
                />
                <span>{heartsCount[currentSlide.id]}</span>
              </button>

              {/* Expand Lightbox */}
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white transition cursor-pointer"
                title="Xem toàn màn hình"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Content Caption */}
            <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8 z-10 max-w-2xl text-white">
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-black drop-shadow-md">
                {currentSlide.title}
              </h3>
              <p className="mt-2 text-rose-100 text-xs sm:text-sm md:text-base leading-relaxed drop-shadow">
                {currentSlide.subtitle}
              </p>

              {/* Quote Card */}
              <div className="mt-3.5 p-3 sm:p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white/95 text-xs sm:text-sm italic flex items-start gap-2.5">
                <Quote className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <p>&ldquo;{currentSlide.quote}&rdquo;</p>
                  <span className="text-[11px] font-sans font-bold text-amber-300 mt-1 block not-italic">
                    — {currentSlide.author}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 cursor-pointer"
            aria-label="Ảnh trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 cursor-pointer"
            aria-label="Ảnh kế tiếp"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Slide Indicator Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {SPOTLIGHT_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx ? 'w-8 bg-amber-400' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Chuyển đến ảnh ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Thumbnail Preview Strip */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {SPOTLIGHT_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentIndex(idx)}
              className={`relative rounded-2xl overflow-hidden aspect-video border-2 transition-all cursor-pointer ${
                currentIndex === idx
                  ? 'border-rose-600 dark:border-rose-400 shadow-lg scale-102 ring-2 ring-rose-400/50'
                  : 'border-transparent opacity-70 hover:opacity-100 hover:scale-101'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2.5">
                <span className="text-white text-xs font-bold line-clamp-1 text-left">
                  {slide.title}
                </span>
              </div>
            </button>
          ))}
        </div>

      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-rose-400 transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={currentSlide.image}
              alt={currentSlide.title}
              className="max-h-[75vh] w-auto rounded-2xl shadow-2xl border-2 border-white/20 object-contain"
            />

            <div className="mt-4 text-center text-white max-w-2xl">
              <h4 className="font-serif text-2xl font-bold">{currentSlide.title}</h4>
              <p className="text-sm text-stone-300 mt-1 italic">&ldquo;{currentSlide.quote}&rdquo;</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

import React, { useState } from 'react';
import { Sparkles, ArrowRight, Dices, Heart, Quote, RefreshCw } from 'lucide-react';
import { getRandomWish } from '../data/wishes';
import { WishItem } from '../types';
import heroImgPath from '../assets/images/hero_women_day_1792461701567.jpg';

interface HeroSectionProps {
  onSelectWishForCard: (wish: WishItem) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectWishForCard }) => {
  const [featuredWish, setFeaturedWish] = useState<WishItem>(() => getRandomWish());
  const [imgError, setImgError] = useState(false);

  const handleRefreshQuote = () => {
    setFeaturedWish(getRandomWish());
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="relative pt-6 pb-16 lg:py-20 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-rose-100/60 via-pink-50/30 to-transparent -z-10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Headlines & Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Elegant Tagline */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-purple-100 via-rose-100 to-amber-100 border border-purple-200 rounded-full text-xs font-bold text-purple-900 tracking-wide shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-rose-600 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Trường TC Công nghiệp Bách Khoa Sầm Sơn · Ngày 20/10</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-5.5xl text-stone-900 font-black leading-tight tracking-tight">
              Chúc mừng ngày{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-800 via-rose-600 to-amber-500">
                Phụ Nữ Việt Nam
              </span>{' '}
              20/10
            </h1>

            {/* Emotional Subtitle */}
            <p className="text-base sm:text-lg text-stone-700 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Gửi yêu thương – Trao nụ cười – Tôn vinh những điều tuyệt vời của phái đẹp. Tham gia tạo lời chúc AI, mở thiệp điện tử và quay số nhận thưởng ví MoMo hấp dẫn!
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                type="button"
                onClick={() => scrollTo('generator')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-purple-700 via-rose-600 to-amber-500 hover:from-purple-800 hover:to-amber-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-300 hover:shadow-xl hover:scale-105 active:scale-98 transition-all duration-200 cursor-pointer group"
              >
                <span>Tạo lời chúc ngay</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
              </button>

              <button
                type="button"
                onClick={() => scrollTo('lucky-wheel')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white hover:bg-purple-50 text-purple-950 font-bold text-sm rounded-2xl border-2 border-purple-300 hover:border-purple-500 shadow-md hover:shadow-lg hover:scale-105 active:scale-98 transition-all duration-200 cursor-pointer"
              >
                <Dices className="w-4 h-4 text-rose-600" />
                <span>Quay thưởng MoMo 20/10</span>
              </button>
            </div>

            {/* Featured Quote / Wish Highlight Card */}
            <div className="mt-8 pt-6 border-t-2 border-rose-100">
              <div className="p-4 sm:p-5 rounded-2xl bg-white/90 border-2 border-rose-200/80 shadow-md hover:border-purple-300 hover:shadow-lg transition-all duration-200 relative group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800">
                    <Quote className="w-3.5 h-3.5 text-rose-500" />
                    <span>Lời chúc gợi ý hôm nay</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-stone-500 font-normal">{featuredWish.recipient}</span>
                  </div>
                  <button
                    onClick={handleRefreshQuote}
                    className="p-1 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Đổi lời chúc ngẫu nhiên"
                    aria-label="Đổi lời chúc ngẫu nhiên"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <p className="text-sm text-stone-700 italic font-serif leading-relaxed line-clamp-3">
                  "{featuredWish.content}"
                </p>

                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-rose-50">
                  <span className="text-rose-600 font-medium">#{featuredWish.tags[0] || 'yeuthuong'}</span>
                  <button
                    onClick={() => onSelectWishForCard(featuredWish)}
                    className="text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                    <span>Dùng làm thiệp</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Outer decorative halo */}
              <div className="absolute -inset-2 bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 rounded-3xl blur-lg opacity-30 transform -rotate-1" />

              {/* Card Container */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-rose-100 bg-white">
                {!imgError ? (
                  <img
                    src={heroImgPath}
                    alt="Bó hoa sen và hoa hồng chúc mừng ngày 20/10"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-80 sm:h-96 lg:h-[430px] object-cover object-center transition-transform duration-500 hover:scale-102"
                  />
                ) : (
                  <div className="w-full h-80 sm:h-96 lg:h-[430px] bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50 flex flex-col items-center justify-center p-8 text-center">
                    <Heart className="w-16 h-16 text-rose-400 fill-rose-200 mb-4 animate-pulse-subtle" />
                    <h3 className="font-serif text-2xl font-bold text-rose-900 mb-2">
                      Chúc Mừng 20/10
                    </h3>
                    <p className="text-sm text-stone-600">
                      Tôn vinh vẻ đẹp, sự dịu dàng và lòng quả cảm của người phụ nữ Việt Nam
                    </p>
                  </div>
                )}

                {/* Subtle overlay pill at bottom right */}
                <div className="absolute bottom-4 left-4 right-4 p-3 bg-white/90 backdrop-blur-md rounded-xl border border-rose-100 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-medium text-stone-800">20/10/2026 · Việt Nam</span>
                  </div>
                  <span className="text-rose-700 font-semibold">Tôn vinh phụ nữ</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

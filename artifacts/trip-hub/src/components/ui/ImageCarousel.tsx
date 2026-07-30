import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useState } from "react";

export function ImageCarousel({ images, priority = false }: { images: string[]; priority?: boolean }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    });
  }, [emblaApi]);

  if (!images || images.length === 0) return <div className="w-full aspect-[4/3] bg-sand-200/50 animate-pulse" />;

  return (
    <div className="relative group">
      <div className="overflow-hidden w-full aspect-[4/3]" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {images.map((src, index) => (
            <div className="flex-[0_0_100%] min-w-0 relative" key={index}>
              <img
                src={src.startsWith('http') ? src : `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${src}`}
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover"
                loading={priority && index === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === selectedIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

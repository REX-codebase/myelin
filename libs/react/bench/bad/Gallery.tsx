import { createFactory, useRef } from 'react';

const figure = createFactory('figure');

type Photo = { id: string; src: string; alt: string };

export function Gallery({ photos }: { photos: Photo[] }) {
  const itemRefs = useRef<Record<string, HTMLImageElement | null>>({});

  const scrollTo = (id: string) => {
    itemRefs.current[id]?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="gallery">
      {photos.map(photo => (
        <img
          key={photo.id}
          src={photo.src}
          alt={photo.alt}
          ref={el => (itemRefs.current[photo.id] = el)}
          onClick={() => scrollTo(photo.id)}
        />
      ))}
      {figure({ className: 'caption' }, `${photos.length} photos`)}
    </div>
  );
}

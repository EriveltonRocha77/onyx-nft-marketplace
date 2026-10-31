import { useState } from 'react';
import { cn } from '../../shared/ui/cn';

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)] ?? images[0]!;
  return (
    <div className="flex flex-col gap-3" data-testid="gallery">
      <img src={current} alt={`${name}, imagem ${index + 1} de ${images.length}`} width={800} height={800} fetchPriority="high" decoding="async" className="aspect-square w-full rounded-2xl border border-border bg-surface-2 object-cover" />
      {images.length > 1 ? (
        <ul className="grid grid-cols-4 gap-2" aria-label="Miniaturas">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                aria-label={`Ver imagem ${i + 1}`}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                className={cn('block w-full overflow-hidden rounded-xl border-2 border-transparent', i === index && 'border-accent')}
              >
                <img src={src} alt="" width={200} height={200} loading="lazy" className="aspect-square w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Package } from 'lucide-react';

interface LazyItemImageProps {
  itemId?: number;
  updatedAt?: number;
  alt?: string;
  className?: string;
}

export function LazyItemImage({ itemId, updatedAt, alt, className = 'w-full h-full object-cover' }: LazyItemImageProps) {
  const [image, setImage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchImage() {
      if (!itemId || updatedAt === undefined) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const resolvedImage = await db.getItemImage(itemId, updatedAt);
        if (isMounted) {
          setImage(resolvedImage);
        }
      } catch (err) {
        console.error('Error fetching image in LazyItemImage:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [itemId, updatedAt]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-[#0A0B0E]/60 flex items-center justify-center relative overflow-hidden animate-pulse">
        {/* Sleek Golden Spinner */}
        <div className="w-6 h-6 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
        {/* Subtle background shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2A2A2A]/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="w-full h-full bg-[#14161C] flex items-center justify-center">
        <Package className="w-8 h-8 text-[#2A2A2A]" />
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={alt || 'Inventory Item'}
      className={`${className} transition-opacity duration-300 ease-in-out opacity-0`}
      onLoad={(e) => {
        const img = e.currentTarget;
        img.classList.remove('opacity-0');
        img.classList.add('opacity-90', 'group-hover:opacity-100');
      }}
    />
  );
}

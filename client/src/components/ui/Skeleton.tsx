import React from 'react';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'card' | 'table-row';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  count?: number;
  columns?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  count = 1,
  columns = 5,
  className = '',
}) => {
  const inlineStyle: React.CSSProperties = {
    width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  const renderSingle = (key: number) => {
    switch (variant) {
      case 'circular':
        return (
          <div
            key={key}
            style={inlineStyle}
            className={`rounded-none bg-stone-200 animate-pulse shrink-0 ${
              !width && !height ? 'w-10 h-10' : ''
            } ${className}`}
          />
        );

      case 'rectangular':
        return (
          <div
            key={key}
            style={inlineStyle}
            className={`rounded-none bg-stone-200 animate-pulse ${
              !height ? 'h-24' : ''
            } ${!width ? 'w-full' : ''} ${className}`}
          />
        );

      case 'card':
        return (
          <div
            key={key}
            className={`p-4 bg-white border border-stone-200 rounded-none space-y-3 ${className}`}
          >
            <div className="flex items-center justify-between">
              <div className="h-4 bg-stone-200 rounded-none w-1/3 animate-pulse" />
              <div className="h-6 w-16 bg-stone-200 rounded-none animate-pulse" />
            </div>
            <div className="h-3 bg-stone-200 rounded-none w-2/3 animate-pulse" />
            <div className="h-8 bg-stone-100 rounded-none w-full animate-pulse mt-4" />
          </div>
        );

      case 'table-row':
        return (
          <tr key={key} className="border-b border-stone-200">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <td key={cIdx} className="py-3 px-4">
                <div
                  className={`h-4 bg-stone-200 rounded animate-pulse ${
                    cIdx === 0 ? 'w-16' : cIdx === 1 ? 'w-32' : 'w-24'
                  }`}
                />
              </td>
            ))}
          </tr>
        );

      case 'text':
      default:
        return (
          <div
            key={key}
            style={inlineStyle}
            className={`h-4 bg-stone-200 rounded animate-pulse ${
              !width ? 'w-full' : ''
            } ${className}`}
          />
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => renderSingle(index))}
    </>
  );
};


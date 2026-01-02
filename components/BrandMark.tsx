'use client';

import clsx from 'clsx';

type BrandMarkProps = {
  orientation?: 'horizontal' | 'vertical';
  iconClassName?: string;
  titleClassName?: string;
  title?: string;
  showIcon?: boolean;
};

const BASE_ICON_CLASSES =
  'flex items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary';
const DEFAULT_TITLE = 'MVP CRM';

export function BrandMark({
  orientation = 'horizontal',
  iconClassName = 'h-9 w-9 text-sm',
  titleClassName = 'text-lg',
  title = DEFAULT_TITLE,
  showIcon = true
}: BrandMarkProps) {
  const containerClasses =
    orientation === 'vertical' ? 'flex flex-col items-center gap-3' : 'flex items-center gap-2';

  return (
    <div className={containerClasses}>
      {showIcon ? <div className={clsx(BASE_ICON_CLASSES, iconClassName)}>CRM</div> : null}
      <span className={clsx('font-semibold text-primary', titleClassName)}>{title}</span>
    </div>
  );
}

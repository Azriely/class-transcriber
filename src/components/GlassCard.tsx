import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'strong' | 'subtle';
}

const variantClass: Record<NonNullable<GlassCardProps['variant']>, string> = {
  default: 'glass',
  strong: 'glass-strong',
  subtle: 'glass-subtle',
};

export default function GlassCard({
  children,
  className = '',
  variant = 'default',
}: GlassCardProps) {
  return (
    <div className={`${variantClass[variant]} rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

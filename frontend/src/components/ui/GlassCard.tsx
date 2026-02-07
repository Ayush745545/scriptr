import React from 'react';
import { cn } from '../../utils/cn';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

const GlassCard = ({ children, className, hoverEffect = false, ...props }: GlassCardProps) => {
  const baseClasses = "backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl shadow-[0_4px_24px_-1px_rgba(0,0,0,0.2)]";
  const hoverClasses = hoverEffect ? "transition-all duration-300 hover:bg-white/[0.08] hover:scale-[1.01] hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:border-white/20 cursor-pointer" : "";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(baseClasses, hoverClasses, className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;

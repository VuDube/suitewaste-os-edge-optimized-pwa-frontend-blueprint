import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
interface SuiteIconProps {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
}
export const SuiteIcon: React.FC<SuiteIconProps> = ({ icon: Icon, label, onClick, className, iconClassName }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-2 text-center cursor-pointer"
      onClick={onClick}
    >
      <Card className={cn(
        "w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center transition-all duration-300",
        "bg-white/5 border-white/10 shadow-lg backdrop-blur-sm",
        "hover:bg-white/10 hover:shadow-xl",
        className
      )}>
        <Icon className={cn("w-10 h-10 md:w-12 md:h-12 text-white/90", iconClassName)} />
      </Card>
      <span className="text-xs md:text-sm font-medium text-neutral-200">{label}</span>
    </motion.div>
  );
};
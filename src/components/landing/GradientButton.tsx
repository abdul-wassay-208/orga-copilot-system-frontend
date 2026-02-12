import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  showArrow?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function GradientButton({ children, onClick, showArrow = false, size = 'md' }: GradientButtonProps) {
  const sizeClasses = {
    sm: 'px-6 py-2.5 text-sm',
    md: 'px-8 py-4 text-base',
    lg: 'px-10 py-5 text-lg'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(254, 190, 64, 0.3)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-[#FEBE40] to-[#E40B7B] text-white font-semibold transition-all duration-300 flex items-center gap-2 hover:shadow-xl`}
      style={{ fontFamily: 'Outfit, sans-serif' }}
    >
      {children}
      {showArrow && <ArrowRight className="w-5 h-5" />}
    </motion.button>
  );
}

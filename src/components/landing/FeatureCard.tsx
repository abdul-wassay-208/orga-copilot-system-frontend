import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export function FeatureCard({ icon: Icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
      className="relative p-8 rounded-3xl bg-white/50 backdrop-blur-sm border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#FEBE40]/5 to-[#E40B7B]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FEBE40]/20 to-[#E40B7B]/20 flex items-center justify-center mb-6">
          <Icon className="w-7 h-7 text-[#E40B7B]" strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}

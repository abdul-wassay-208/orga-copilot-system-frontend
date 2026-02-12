import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { GradientButton } from './GradientButton';

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-lg shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/home">
            <img src="/assets/logo-landing.png" alt="EVO Associates" className="h-12" />
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <Link 
            to="/login"
            className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Login
          </Link>
          <GradientButton size="sm" onClick={() => navigate('/signup')}>Sign Up</GradientButton>
        </div>
      </div>
    </motion.nav>
  );
}

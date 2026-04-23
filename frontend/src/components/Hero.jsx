import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../AuthContext";

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBookClick = () => {
    if (!user) {
      navigate("/login");
    } else {
      navigate("/book");
    }
  };

  const handleDashboardClick = () => {
    if (!user) {
      navigate("/login");
    } else {
      navigate("/dashboard");
    }
  };

  // Animation variants for staggering children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  return (
    <section className="hero-section">
      <div className="hero-bg-animated">
        <div className="hero-glow"></div>
      </div>
      
      <div className="hero-particles">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 150 + 50}px`,
              height: `${Math.random() * 150 + 50}px`,
            }}
          />
        ))}
      </div>

      <motion.div 
        className="hero-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 variants={itemVariants}>
          Book appointments near you
          <span className="hero-accent"> instantly</span>
        </motion.h1>
        
        <motion.p className="hero-description" variants={itemVariants}>
          Discover and book appointments at salons, clinics, and service providers in your area.
          Skip the wait and get exactly the time slot you need.
        </motion.p>
        
        <motion.div className="hero-search glass-search" variants={itemVariants}>
          <div className="search-input-group">
            <input
              type="text"
              placeholder="What service are you looking for?"
              className="search-input-modern"
            />
            <input
              type="text"
              placeholder="Location"
              className="search-input-modern"
            />
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary search-btn-modern"
            >
              Search
            </motion.button>
          </div>
        </motion.div>
        
        <motion.div className="hero-actions" variants={itemVariants}>
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(79, 70, 229, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary large-modern" 
            onClick={handleBookClick}
          >
            Book Appointment
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05, background: "rgba(255, 255, 255, 0.1)" }}
            whileTap={{ scale: 0.95 }}
            className="btn-outline-modern large-modern" 
            onClick={handleDashboardClick}
          >
            View My Bookings
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;

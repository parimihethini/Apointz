import React from "react";
import { motion } from "framer-motion";

const GlassCard = ({ children, className = "", hoverLift = true, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      whileHover={hoverLift ? { y: -8, transition: { duration: 0.2 } } : {}}
      transition={{ duration: 0.5, delay }}
      className={`glass ${className}`}
      style={{ padding: "32px" }}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;

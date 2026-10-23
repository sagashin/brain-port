'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ParticleBurstProps {
  triggerKey: number;
}

const PARTICLES = Array.from({ length: 18 }).map((_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const distance = 55 + (i % 3) * 32;
  const colors = ['#F59E0B', '#10B981', '#38BDF8', '#F43F5E', '#A855F7'];
  return {
    id: i,
    tx: Math.cos(angle) * distance,
    ty: Math.sin(angle) * distance - 20,
    color: colors[i % colors.length],
    rotate: (i * 45) % 360,
  };
});

export default function ParticleBurst({ triggerKey }: ParticleBurstProps) {
  if (!triggerKey) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={triggerKey}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75 }}
          className="relative"
        >
          {PARTICLES.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
              animate={{
                x: p.tx,
                y: p.ty,
                scale: [1, 1.15, 0.2],
                opacity: [1, 1, 0],
                rotate: p.rotate,
              }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="absolute block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: p.color }}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

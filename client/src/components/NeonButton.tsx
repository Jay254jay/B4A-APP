import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "ghost";
  glow?: boolean;
}

// Combine standard button props with motion props
type CombinedProps = NeonButtonProps & HTMLMotionProps<"button">;

export const NeonButton = forwardRef<HTMLButtonElement, CombinedProps>(
  ({ className, variant = "primary", glow = false, children, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(57,255,20,0.4)]",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[0_0_20px_rgba(191,0,255,0.4)]",
      accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_20px_rgba(255,191,0,0.4)]",
      ghost: "bg-transparent text-foreground hover:bg-white/5 border border-white/10",
    };

    const glowClass = glow ? "animate-pulse" : "";

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "px-6 py-4 rounded-xl font-display font-bold uppercase tracking-widest transition-all duration-200",
          variants[variant],
          glowClass,
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

NeonButton.displayName = "NeonButton";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UserBubbleProps {
  name: string;
  selected?: boolean;
  onClick: () => void;
}

export function UserBubble({ name, selected, onClick }: UserBubbleProps) {
  // Generate consistent colors based on name length/char
  const colors = [
    "bg-cyan-500", "bg-pink-500", "bg-purple-500", "bg-indigo-500", "bg-orange-500"
  ];
  const colorIndex = name.length % colors.length;
  const baseColor = colors[colorIndex];

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300",
        selected ? "bg-white/10 ring-2 ring-primary shadow-[0_0_20px_rgba(57,255,20,0.2)]" : "hover:bg-white/5"
      )}
    >
      <div className={cn(
        "w-20 h-20 rounded-full flex items-center justify-center text-2xl font-display font-bold text-white shadow-lg",
        baseColor,
        selected ? "ring-4 ring-offset-4 ring-offset-[#1a1a1a] ring-primary" : ""
      )}>
        {name.substring(0, 2).toUpperCase()}
      </div>
      <span className={cn(
        "font-medium text-lg",
        selected ? "text-primary font-bold" : "text-muted-foreground"
      )}>
        {name}
      </span>
    </motion.button>
  );
}

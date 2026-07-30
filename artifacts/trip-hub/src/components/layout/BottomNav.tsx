import { Link, useLocation } from "wouter";
import { Home, Palmtree, Wallet, Plane, Compass, Calendar, Info } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { id: "home", path: "/", icon: Home, label: "Home" },
  { id: "villa", path: "/villa", icon: Palmtree, label: "Villa" },
  { id: "money", path: "/money", icon: Wallet, label: "Money" },
  { id: "travel", path: "/travel", icon: Plane, label: "Travel" },
  { id: "explore", path: "/explore", icon: Compass, label: "Explore" },
  { id: "weekend", path: "/weekend", icon: Calendar, label: "Weekend" },
  { id: "info", path: "/need-to-know", icon: Info, label: "Info" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-sand-200 px-1 py-2 pb-safe flex justify-around items-center shadow-[0_-4px_16px_-4px_rgba(13,43,46,0.05)]">
      {tabs.map((tab) => {
        const isActive = location === tab.path;
        return (
          <Link key={tab.id} href={tab.path} className="relative flex flex-col items-center justify-center p-2 flex-1 max-w-[64px] tap group outline-none">
            {isActive && (
              <motion.div
                layoutId="navPill"
                className="absolute inset-1 bg-lagoon-600 rounded-2xl"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <tab.icon
              className={`relative z-10 w-[22px] h-[22px] transition-colors duration-200 ${
                isActive ? "text-white" : "text-ink-900/40 group-hover:text-ink-900/60"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}

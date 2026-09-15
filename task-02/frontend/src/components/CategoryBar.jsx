// Category filter pills for the store
import React from 'react';
import { Coffee, Box, Shirt, HeartPulse, Laptop } from 'lucide-react';

const CATEGORIES = [
  { name: 'All', label: 'All Products' },
  { name: 'Tea & Spices', label: 'Ceylon Tea & Spices', icon: Coffee },
  { name: 'Handicrafts', label: 'Artisan Handicrafts', icon: Box },
  { name: 'Fashion', label: 'Batik & Sustainable Fashion', icon: Shirt },
  { name: 'Wellness', label: 'Ayurvedic Wellness', icon: HeartPulse },
  { name: 'Tech & Lifestyle', label: 'Tech & Eco Lifestyle', icon: Laptop },
];

export default function CategoryBar({ activeCategory, onSelectCategory }) {
  return (
    <div className="bg-white border-b border-emerald-100/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => onSelectCategory(cat.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/30'
                    : 'bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/70 hover:text-emerald-950 border border-emerald-200/50'
                }`}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-200' : 'text-emerald-600'}`} />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

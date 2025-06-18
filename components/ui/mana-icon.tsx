"use client"

import React from 'react'

interface ManaIconProps {
  color: string
  size?: string
  className?: string
  isSelected?: boolean
  onClick?: () => void
}

const ManaIcon: React.FC<ManaIconProps> = ({ 
  color, 
  size = "w-6 h-6", 
  className = "", 
  isSelected = false,
  onClick 
}) => {  // URL da API da Scryfall para ícones SVG
  const getSvgUrl = (manaColor: string) => {
    return `https://svgs.scryfall.io/card-symbols/${manaColor}.svg`;
  };

  const colorNames: Record<string, string> = {
    W: 'Branco',
    U: 'Azul', 
    B: 'Preto',
    R: 'Vermelho',
    G: 'Verde',
    C: 'Incolor'
  };

  const colorName = colorNames[color] || color;
  
  return (
    <button
      onClick={onClick}
      className={`
        ${size} flex items-center justify-center
        transition-all duration-200 cursor-pointer rounded-lg
        ${isSelected 
          ? 'scale-110 opacity-100 bg-gray-700/30' 
          : 'hover:scale-105 opacity-80 hover:opacity-100 hover:bg-gray-700/20'
        }
        ${className}
      `}
      type="button"
      title={colorName}
    >
      <img 
        src={getSvgUrl(color)}
        alt={`Mana ${colorName}`}
        className="w-full h-full object-contain"
        style={{ filter: isSelected ? 'brightness(1.2)' : 'brightness(1)' }}
      />
    </button>
  );
}

export default ManaIcon

// components/CasinoIcons.tsx
import React from 'react';
import Svg, { Path, Circle, Rect, G, Text } from 'react-native-svg';

// Tipos
export interface SymbolType {
  id: number;
  icon: string;
  name: string;
  color: string;
  weight: number;
  component: (props: { size?: number }) => React.JSX.Element;
}

// Componentes de Ícones Melhorados
export const SevenIcon = ({ size = 60, color = "#FFD700" }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60">
    <Rect x="2" y="2" width="56" height="56" rx="12" fill="#0C0A1D" stroke={color} strokeWidth="3"/>
    <Rect x="8" y="8" width="44" height="44" rx="8" fill="#1A1636" />
    <Text
      x="30"
      y="38"
      textAnchor="middle"
      fill={color}
      fontSize="28"
      fontWeight="bold"
      fontFamily="system-ui"
    >
      7
    </Text>
    <Path 
      d="M18,15 L42,15 L36,48 L24,48 Z" 
      fill={color}
      opacity="0.8"
    />
  </Svg>
);

export const BellIcon = ({ size = 60, color = "#FACC15" }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60">
    {/* Fundo com gradiente */}
    <Rect x="2" y="2" width="56" height="56" rx="12" fill="#0C0A1D" stroke={color} strokeWidth="3"/>
    <Rect x="8" y="8" width="44" height="44" rx="8" fill="#1A1636" />
    
    {/* Sino principal */}
    <Path 
      d="M30,15 C38,15 44,20 44,28 L44,34 L48,38 L48,42 L22,42 L22,38 L26,34 L26,28 C26,20 32,15 30,15 Z" 
      fill={color}
      stroke="#1A1636"
      strokeWidth="1.5"
    />
    
    {/* Detalhes do sino */}
    <Path 
      d="M30,18 C36,18 40,22 40,28 L40,32 L44,36 L44,38 L26,38 L26,36 L30,32 L30,28 C30,22 34,18 30,18 Z" 
      fill="#FFE55C"
      opacity="0.8"
    />
    
    {/* Base do sino */}
    <Path 
      d="M30,42 C34,42 36,40 36,37 L24,37 C24,40 26,42 30,42 Z" 
      fill={color}
    />
    
    {/* Badge decorativa */}
    <Circle cx="30" cy="25" r="4" fill="#1A1636"/>
    <Circle cx="30" cy="25" r="2" fill={color}/>
    
    {/* Reflexos */}
    <Path 
      d="M34,20 L36,18" 
      stroke="#FFE55C" 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
    <Path 
      d="M32,35 L34,33" 
      stroke="#FFE55C" 
      strokeWidth="1" 
      strokeLinecap="round"
      opacity="0.7"
    />
  </Svg>
);

export const DiamondIcon = ({ size = 60, color = "#60A5FA" }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60">
    <Rect x="2" y="2" width="56" height="56" rx="12" fill="#0C0A1D" stroke={color} strokeWidth="3"/>
    <Rect x="8" y="8" width="44" height="44" rx="8" fill="#1A1636" />
    <Path 
      d="M30,12 L48,30 L30,48 L12,30 Z" 
      fill={color}
    />
    <Path 
      d="M30,18 L40,30 L30,42 L20,30 Z" 
      fill="#1A1636"
    />
    <Path 
      d="M25,25 L35,35 M35,25 L25,35" 
      stroke="#1A1636" 
      strokeWidth="2"
    />
  </Svg>
);

export const CherryIcon = ({ size = 60, color = "#DC2626" }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60">
    <Rect x="2" y="2" width="56" height="56" rx="12" fill="#0C0A1D" stroke={color} strokeWidth="3"/>
    <Rect x="8" y="8" width="44" height="44" rx="8" fill="#1A1636" />
    <Circle cx="20" cy="25" r="10" fill={color}/>
    <Circle cx="40" cy="25" r="10" fill={color}/>
    <Path 
      d="M25,18 C25,18 22,12 30,12 C38,12 35,18 35,18" 
      stroke={color} 
      strokeWidth="3" 
      fill="none"
    />
    <Path 
      d="M25,18 Q30,15 35,18" 
      stroke={color} 
      strokeWidth="2" 
      fill="none"
    />
    <Circle cx="18" cy="23" r="2" fill="#1A1636" opacity="0.6"/>
    <Circle cx="38" cy="23" r="2" fill="#1A1636" opacity="0.6"/>
  </Svg>
);

export const BarIcon = ({ size = 60, color = "#10B981" }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60">
    <Rect x="2" y="2" width="56" height="56" rx="12" fill="#0C0A1D" stroke={color} strokeWidth="3"/>
    <Rect x="8" y="8" width="44" height="44" rx="8" fill="#1A1636" />
    <Rect x="12" y="15" width="36" height="8" fill={color} rx="2"/>
    <Rect x="12" y="28" width="36" height="8" fill={color} rx="2"/>
    <Rect x="12" y="41" width="36" height="8" fill={color} rx="2"/>
    <Text
      x="30"
      y="23"
      textAnchor="middle"
      fill="#0C0A1D"
      fontSize="10"
      fontWeight="bold"
    >
      BAR
    </Text>
    <Text
      x="30"
      y="36"
      textAnchor="middle"
      fill="#0C0A1D"
      fontSize="10"
      fontWeight="bold"
    >
      BAR
    </Text>
    <Text
      x="30"
      y="49"
      textAnchor="middle"
      fill="#0C0A1D"
      fontSize="10"
      fontWeight="bold"
    >
      BAR
    </Text>
  </Svg>
);


export const LemonIcon = ({ size = 60, color = "#F59E0B" }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60">
    {/* Fundo com gradiente */}
    <Rect x="2" y="2" width="56" height="56" rx="12" fill="#0C0A1D" stroke={color} strokeWidth="3"/>
    <Rect x="8" y="8" width="44" height="44" rx="8" fill="#1A1636" />
    
    {/* Limão principal com gradiente */}
    <Circle cx="30" cy="30" r="16" fill={color}/>
    
    {/* Highlight do limão */}
    <Circle cx="24" cy="24" r="12" fill="#FFB84D" opacity="0.6"/>
    
    {/* Textura da casca */}
    <Path 
      d="M20,25 Q22,22 25,20 Q28,22 30,25 Q32,28 35,30 Q32,32 30,35 Q28,38 25,40 Q22,38 20,35 Q18,32 15,30 Q18,28 20,25 Z" 
      fill="none"
      stroke="#1A1636"
      strokeWidth="0.8"
      opacity="0.4"
    />
    
    {/* Detalhes da casca */}
    <Circle cx="22" cy="28" r="1.5" fill="#1A1636" opacity="0.3"/>
    <Circle cx="28" cy="32" r="1" fill="#1A1636" opacity="0.3"/>
    <Circle cx="32" cy="26" r="1.2" fill="#1A1636" opacity="0.3"/>
    
    {/* Folha */}
    <Path 
      d="M30,14 Q34,12 38,14 Q36,18 32,20 Q30,16 30,14 Z" 
      fill="#22C55E"
    />
    
    {/* Caule */}
    <Path 
      d="M30,14 L32,12 Q30,10 28,12 Z" 
      fill="#166534"
    />
    
    {/* Sombras e profundidade */}
    <Path 
      d="M35,25 Q38,28 35,32" 
      fill="none"
      stroke="#1A1636"
      strokeWidth="1"
      opacity="0.3"
    />
  </Svg>
);

export const CrownIcon = ({ size = 60, color = "#FFD700" }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60">
    <Rect x="2" y="2" width="56" height="56" rx="12" fill="#0C0A1D" stroke={color} strokeWidth="3"/>
    <Rect x="8" y="8" width="44" height="44" rx="8" fill="#1A1636" />
    <Path 
      d="M12,35 L20,22 L25,28 L30,15 L35,28 L40,22 L48,35 Z" 
      fill={color}
    />
    <Circle cx="20" cy="38" r="4" fill={color}/>
    <Circle cx="30" cy="38" r="4" fill={color}/>
    <Circle cx="40" cy="38" r="4" fill={color}/>
    <Circle cx="18" cy="25" r="2" fill="#1A1636"/>
    <Circle cx="30" cy="18" r="2" fill="#1A1636"/>
    <Circle cx="42" cy="25" r="2" fill="#1A1636"/>
  </Svg>
);

// Array de símbolos
export const SYMBOLS: SymbolType[] = [
  { 
    id: 1, 
    icon: 'seven', 
    name: 'Lucky Seven', 
    color: '#FFD700', 
    weight: 2,
    component: SevenIcon
  },
  { 
    id: 2, 
    icon: 'bell', 
    name: 'Bell', 
    color: '#FACC15', 
    weight: 5,
    component: BellIcon
  },
  { 
    id: 3, 
    icon: 'diamond', 
    name: 'Diamond', 
    color: '#60A5FA', 
    weight: 3,
    component: DiamondIcon
  },
  { 
    id: 4, 
    icon: 'cherry', 
    name: 'Cherry', 
    color: '#DC2626', 
    weight: 15,
    component: CherryIcon
  },
  { 
    id: 5, 
    icon: 'bar', 
    name: 'Bar', 
    color: '#10B981', 
    weight: 8,
    component: BarIcon
  },
  { 
    id: 6, 
    icon: 'lemon', 
    name: 'Lemon', 
    color: '#F59E0B', 
    weight: 12,
    component: LemonIcon
  },
  { 
    id: 7, 
    icon: 'crown', 
    name: 'Crown', 
    color: '#FFD700', 
    weight: 4,
    component: CrownIcon
  }
];
import React from 'react';

export interface GameMenuItem {
  id: string;
  icon: string;
  label: string;
  badge?: 'ON' | 'OFF';
  onClick: () => void;
}

interface GameMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  items: GameMenuItem[];
  style?: React.CSSProperties;
}

export default function GameMenuDropdown({
  isOpen,
  onClose,
  items,
  style
}: GameMenuDropdownProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="game-menu-backdrop" onClick={onClose} />
      <div className="game-menu-popover" style={style}>
        <div className="menu-arrow" />
        {items.map(item => (
          <div
            key={item.id}
            className="menu-item"
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
            }}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
            {item.badge && (
              <span className={`badge ${item.badge.toLowerCase()}`}>
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

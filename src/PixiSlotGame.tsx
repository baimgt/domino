import React, { useEffect, useRef } from 'react';
import { Application, Container, Sprite, Assets, Graphics, Ticker } from 'pixi.js';

const symbolTextures: Record<number, string> = {
  0: '/assets/sym_9.png',
  1: '/assets/sym_10.png',
  2: '/assets/sym_j.png',
  3: '/assets/sym_q.png',
  4: '/assets/sym_k.png',
  5: '/assets/sym_a.png',
  6: '/assets/sym_coin.png',
  7: '/assets/sym_pot.png',
  8: '/assets/sym_ship.png',
  9: '/assets/sym_fu.png',
  10: '/assets/sym_dragon.png',
};

const SYMBOL_SIZE = 140; 
const REEL_WIDTH = 150;
const ROW_COUNT = 3;
const COL_COUNT = 5;

interface PixiSlotGameProps {
  grid: number[][];
  isSpinning: boolean;
  spinningCols: boolean[];
  winAmount: number;
  winningSymbols: number[];
  speedMultiplier?: number;
  winType?: string;
}

export const PixiSlotGame: React.FC<PixiSlotGameProps> = ({ 
  grid, 
  isSpinning, 
  spinningCols,
  winAmount, 
  winningSymbols,
  speedMultiplier = 1
}) => {
  const pixiContainer = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  
  // Game state refs for Pixi to access within ticker
  const stateRef = useRef({
    grid,
    isSpinning,
    spinningCols,
    winAmount,
    winningSymbols,
    speedMultiplier
  });

  // Keep stateRef updated
  useEffect(() => {
    stateRef.current = { grid, isSpinning, spinningCols, winAmount, winningSymbols, speedMultiplier };
  }, [grid, isSpinning, spinningCols, winAmount, winningSymbols, speedMultiplier]);

  // Init PixiJS
  useEffect(() => {
    if (!pixiContainer.current) return;

    const initPixi = async () => {
      // 1. Create Application
      const app = new Application();
      await app.init({ 
        width: REEL_WIDTH * COL_COUNT, 
        height: SYMBOL_SIZE * ROW_COUNT, 
        backgroundAlpha: 0 
      });
      
      if (!pixiContainer.current) return;
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      pixiContainer.current.appendChild(app.canvas);
      appRef.current = app;

      // 2. Preload assets
      const loadPromises = Object.values(symbolTextures).map(path => 
        Assets.load(path).catch(() => console.warn("Missing texture:", path))
      );
      await Promise.all(loadPromises);

      // 3. Setup Reels
      const reelsContainer = new Container();
      app.stage.addChild(reelsContainer);

      // Create Mask
      const mask = new Graphics();
      mask.rect(0, 0, REEL_WIDTH * COL_COUNT, SYMBOL_SIZE * ROW_COUNT);
      mask.fill(0xffffff);
      app.stage.addChild(mask);
      reelsContainer.mask = mask;

      // Reel data structure
      const reelsData: any[] = [];
      for (let c = 0; c < COL_COUNT; c++) {
        const rc = new Container();
        rc.x = c * REEL_WIDTH + (REEL_WIDTH / 2);
        reelsContainer.addChild(rc);

        const sprites = [];
        // We need 4 sprites (1 above, 3 visible, possibly more for scrolling)
        // Let's just use 4 sprites and cycle them
        for (let r = -1; r < ROW_COUNT; r++) {
          const sprite = new Sprite();
          sprite.anchor.set(0.5);
          sprite.width = SYMBOL_SIZE;
          sprite.height = SYMBOL_SIZE;
          
          // Initial random texture
          const randomSym = Math.floor(Math.random() * 11);
          sprite.texture = Assets.get(symbolTextures[randomSym] || symbolTextures[0]);
          sprite.y = r * SYMBOL_SIZE + (SYMBOL_SIZE / 2);
          
          rc.addChild(sprite);
          sprites.push({ sprite, symVal: randomSym });
        }

        reelsData.push({
          container: rc,
          sprites: sprites,
          yOffset: 0
        });
      }

      // 4. Update Loop (Ticker)
      app.ticker.add((ticker) => {
        const delta = ticker.deltaTime;
        const state = stateRef.current;
        const isDimmed = !state.isSpinning && state.winAmount > 0;

        for (let c = 0; c < COL_COUNT; c++) {
          const reel = reelsData[c];
          
          if (state.spinningCols[c]) {
            // Spin down
            reel.yOffset += 40 * delta * state.speedMultiplier;

            if (reel.yOffset > SYMBOL_SIZE) {
              reel.yOffset -= SYMBOL_SIZE;
              // Cycle sprites: move bottom one to top
              const bottomSpriteObj = reel.sprites.pop();
              if (bottomSpriteObj) {
                // assign new random symbol
                const newSym = Math.floor(Math.random() * 11);
                bottomSpriteObj.symVal = newSym;
                bottomSpriteObj.sprite.texture = Assets.get(symbolTextures[newSym] || symbolTextures[0]);
                reel.sprites.unshift(bottomSpriteObj);
              }
            }
          } else {
            // Snap to target grid if not spinning
            reel.yOffset = 0;
            if (state.grid.length >= 3) {
              // Target symbols (row 0, 1, 2)
              const t0 = state.grid[0]?.[c] ?? Math.floor(Math.random()*11);
              const t1 = state.grid[1]?.[c] ?? Math.floor(Math.random()*11);
              const t2 = state.grid[2]?.[c] ?? Math.floor(Math.random()*11);
              
              // sprites[0] is at y=-1 (above visible). sprites[1,2,3] are visible
              if (reel.sprites[1]) {
                 reel.sprites[1].symVal = t0;
                 reel.sprites[1].sprite.texture = Assets.get(symbolTextures[t0] || symbolTextures[0]);
              }
              if (reel.sprites[2]) {
                 reel.sprites[2].symVal = t1;
                 reel.sprites[2].sprite.texture = Assets.get(symbolTextures[t1] || symbolTextures[0]);
              }
              if (reel.sprites[3]) {
                 reel.sprites[3].symVal = t2;
                 reel.sprites[3].sprite.texture = Assets.get(symbolTextures[t2] || symbolTextures[0]);
              }
            }
          }

          // Update positions and visual states (win animation, dimming)
          for (let r = 0; r < reel.sprites.length; r++) {
            const sprObj = reel.sprites[r];
            sprObj.sprite.y = (r - 1) * SYMBOL_SIZE + reel.yOffset + (SYMBOL_SIZE / 2);
            
            // FORCE SIZE AFTER TEXTURE LOAD
            sprObj.sprite.width = SYMBOL_SIZE;
            sprObj.sprite.height = SYMBOL_SIZE;

            // Check win state
            let isWin = false;
            let isDim = false;
            
            // We only care about visible rows which are r=1,2,3 (corresponding to grid rows 0,1,2)
            if (!state.isSpinning && r >= 1 && r <= 3) {
               isWin = state.winningSymbols.includes(sprObj.symVal) || (sprObj.symVal === 10 && state.winningSymbols.length > 0);
               isDim = isDimmed && !isWin;
            }

            if (isDim) {
              sprObj.sprite.alpha = 0.4;
            } else {
              sprObj.sprite.alpha = 1.0;
            }

            if (isWin && !state.isSpinning) {
              sprObj.sprite.scale.set(1.1 * (SYMBOL_SIZE / sprObj.sprite.texture.width));
            } else {
              sprObj.sprite.width = SYMBOL_SIZE;
              sprObj.sprite.height = SYMBOL_SIZE;
            }
          }
        }
      });
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={pixiContainer} 
      style={{ 
        width: '90vh', 
        height: '54vh',
        overflow: 'hidden'
      }} 
    />
  );
};

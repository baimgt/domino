const fs = require('fs');
const path = 'c:/Users/ASUS ID/domino/node-backend/gameManager.js';
let content = fs.readFileSync(path, 'utf8');

// 1. FAFAFA
const fafafaAnchor = `        for (let r = 0; r < ROWS; r++) {
          const row = [];
          for (let c = 0; c < COLS; c++) {
            const sym = pickSym();
            if (sym === 2) scatterCount++;
            row.push(sym);
          }
          grid.push(row);
        }`;

const fafafaNew = `        for (let r = 0; r < ROWS; r++) {
          const row = [];
          for (let c = 0; c < COLS; c++) {
            const sym = pickSym();
            if (sym === 2) scatterCount++;
            row.push(sym);
          }
          grid.push(row);
        }

        let multGrid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
        let faOrbSum = 0;
        const faMultChance = isFreeSpins ? 0.75 : 0.45;
        if (Math.random() < faMultChance) {
          const zOrbs = [2, 3, 5, 8, 10, 15, 25, 50];
          const count = 1 + (Math.random() < 0.3 ? 1 : 0);
          for (let i = 0; i < count; i++) {
            const r = Math.floor(Math.random() * ROWS);
            const c = Math.floor(Math.random() * COLS);
            if (grid[r][c] !== 2) {
              const v = zOrbs[Math.floor(Math.random() * zOrbs.length)];
              grid[r][c] = 12;
              multGrid[r][c] = v;
              faOrbSum += v;
            }
          }
        }`;

if (content.includes(fafafaAnchor)) {
  content = content.replace(fafafaAnchor, fafafaNew);
  console.log('Fafafa grid patched');
} else {
  console.error('Fafafa anchor not found');
}

const fafafaEmitAnchor = `        socket.emit('fafafa_result', {
          multiplier: _lm.info,
          grid,`;
const fafafaEmitNew = `        if (faOrbSum > 0) {
          if (totalWinAmount === 0 && Math.random() < 0.5) totalWinAmount = betAmount * 2;
          if (totalWinAmount > 0) {
            totalWinAmount = totalWinAmount * faOrbSum;
            winningLines.forEach(w => { w.win = w.win * faOrbSum; });
          }
        }

        socket.emit('fafafa_result', {
          multGrid,
          multiplier: _lm.info,
          grid,`;

if (content.includes(fafafaEmitAnchor)) {
  content = content.replace(fafafaEmitAnchor, fafafaEmitNew);
  console.log('Fafafa emit patched');
} else {
  console.error('Fafafa emit anchor not found');
}

// 2. FIVE LIONS
const fivelionsAnchor = `        // Generate 6x3 grid
        const grid = [];
        let scatterCount = 0;
        for (let r = 0; r < 3; r++) {
          const row = [];
          for (let c = 0; c < 6; c++) {
            const sym = Math.floor(Math.random() * 12);
            if (sym === 6) scatterCount++;
            row.push(sym);
          }
          grid.push(row);
        }`;

const fivelionsNew = `        // Generate 6x3 grid
        const grid = [];
        let scatterCount = 0;
        for (let r = 0; r < 3; r++) {
          const row = [];
          for (let c = 0; c < 6; c++) {
            const sym = Math.floor(Math.random() * 12);
            if (sym === 6) scatterCount++;
            row.push(sym);
          }
          grid.push(row);
        }

        let multGrid = Array.from({ length: 3 }, () => Array.from({ length: 6 }, () => 0));
        let flOrbSum = 0;
        const flMultChance = isFreeSpins ? 0.75 : 0.45;
        if (Math.random() < flMultChance) {
          const zOrbs = [2, 3, 5, 8, 10, 15, 25, 50];
          const count = 1 + (Math.random() < 0.3 ? 1 : 0);
          for (let i = 0; i < count; i++) {
            const r = Math.floor(Math.random() * 3);
            const c = Math.floor(Math.random() * 6);
            if (grid[r][c] !== 6) {
              const v = zOrbs[Math.floor(Math.random() * zOrbs.length)];
              grid[r][c] = 12;
              multGrid[r][c] = v;
              flOrbSum += v;
            }
          }
        }`;

if (content.includes(fivelionsAnchor)) {
  content = content.replace(fivelionsAnchor, fivelionsNew);
  console.log('FiveLions grid patched');
} else {
  console.error('FiveLions anchor not found');
}

const fivelionsEmitAnchor = `        socket.emit('fivelions_result', {
          multiplier: _lm.info,
          grid,`;
const fivelionsEmitNew = `        if (flOrbSum > 0) {
          if (totalWinAmount === 0 && Math.random() < 0.5) totalWinAmount = betAmount * 2;
          if (totalWinAmount > 0) totalWinAmount = Math.floor(totalWinAmount * flOrbSum);
        }

        socket.emit('fivelions_result', {
          multGrid,
          multiplier: _lm.info,
          grid,`;

if (content.includes(fivelionsEmitAnchor)) {
  content = content.replace(fivelionsEmitAnchor, fivelionsEmitNew);
  console.log('FiveLions emit patched');
} else {
  console.error('FiveLions emit anchor not found');
}

// 3. JIN JI BAO XI
const jinjiAnchor = `        for (let r = 0; r < ROWS; r++) {
          const row = [];
          for (let c = 0; c < COLS; c++) {
            row.push(pickSym());
          }
          grid.push(row);
        }`;

const jinjiNew = `        for (let r = 0; r < ROWS; r++) {
          const row = [];
          for (let c = 0; c < COLS; c++) {
            row.push(pickSym());
          }
          grid.push(row);
        }

        let multGrid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
        let jjOrbSum = 0;
        const jjMultChance = isFreeSpins ? 0.75 : 0.45;
        if (Math.random() < jjMultChance) {
          const zOrbs = [2, 3, 5, 8, 10, 15, 25, 50];
          const count = 1 + (Math.random() < 0.3 ? 1 : 0);
          for (let i = 0; i < count; i++) {
            const r = Math.floor(Math.random() * ROWS);
            const c = Math.floor(Math.random() * COLS);
            const v = zOrbs[Math.floor(Math.random() * zOrbs.length)];
            grid[r][c] = 12;
            multGrid[r][c] = v;
            jjOrbSum += v;
          }
        }`;

if (content.includes(jinjiAnchor)) {
  content = content.replace(jinjiAnchor, jinjiNew);
  console.log('JinJi grid patched');
} else {
  console.error('JinJi anchor not found');
}

const jinjiEmitAnchor = `        socket.emit('jinji_result', {
          multiplier: _lm.info,
          grid,`;
const jinjiEmitNew = `        if (jjOrbSum > 0) {
          if (totalWinAmount === 0 && Math.random() < 0.5) totalWinAmount = betAmount * 2;
          if (totalWinAmount > 0) totalWinAmount = Math.floor(totalWinAmount * jjOrbSum);
        }

        socket.emit('jinji_result', {
          multGrid,
          multiplier: _lm.info,
          grid,`;

if (content.includes(jinjiEmitAnchor)) {
  content = content.replace(jinjiEmitAnchor, jinjiEmitNew);
  console.log('JinJi emit patched');
} else {
  console.error('JinJi emit anchor not found');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully written to gameManager.js');

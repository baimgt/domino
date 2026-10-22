// Test simulation of Mahjong Ways 2 spin loop
let autoSpins = 100;
let autoSpinsRef = { current: 100 };
let isSpinningRef = { current: false };
let myCoins = 8994600;
let betAmount = 10000;
let freeSpinsLeft = 0;
let spinSpeed = 1;

function generateCol(colIdx) {
  const rowCount = (colIdx === 0 || colIdx === 4) ? 4 : 5;
  const regularIds = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const items = [];
  for (let r = 0; r < rowCount; r++) {
    const roll = Math.random();
    let symId = regularIds[Math.floor(Math.random() * regularIds.length)];
    if (roll < 0.05) symId = 0;
    else if (roll < 0.12 && colIdx >= 1 && colIdx <= 3) symId = 1;
    items.push({ symId, isGold: false });
  }
  return items;
}

let doSpinRef = { current: null };

function doSpin(overrideAutoCount) {
  console.log(`[doSpin START] autoSpinsRef: ${autoSpinsRef.current}, override: ${overrideAutoCount}, isSpinningRef: ${isSpinningRef.current}`);
  if (isSpinningRef.current) {
    console.log('[doSpin BLOCKED] isSpinningRef is TRUE!');
    return;
  }
  const currentAuto = overrideAutoCount ?? autoSpinsRef.current;
  const cost = betAmount;

  const targetGrid = [0, 1, 2, 3, 4].map(cIdx => generateCol(cIdx));
  isSpinningRef.current = true;

  const spd = spinSpeed;
  let stopTime = 250 / spd;
  const delayPerCol = 180 / spd;
  for (let c = 0; c < 5; c++) stopTime += delayPerCol;

  setTimeout(() => {
    isSpinningRef.current = false;
    let winAmt = 0;
    const winOccurred = Math.random() > 0.45;
    if (winOccurred) {
      const cascades = 1 + (Math.random() < 0.5 ? 1 : 0);
      let winSum = 0;
      for (let k = 0; k < cascades; k++) {
        const stepBase = cost * (0.6 + Math.random() * 2.2);
        winSum += stepBase * 2;
      }
      winAmt = Math.floor(winSum);
    }
    const scatterCount = targetGrid.flat().filter(t => t.symId === 0).length;
    const hasCelebration = (scatterCount >= 3 && freeSpinsLeft === 0) || (winAmt > 0 && (winAmt / Math.max(1, cost)) >= 3);
    const nextDelay = hasCelebration ? 200 : 50;

    const remainingAuto = autoSpinsRef.current > 0 ? autoSpinsRef.current : currentAuto;
    console.log(`[Reel Stop] win: ${winAmt}, remainingAuto: ${remainingAuto}, hasCelebration: ${hasCelebration}`);
    if (remainingAuto > 1) {
      const nextCount = remainingAuto - 1;
      autoSpinsRef.current = nextCount;
      setTimeout(() => {
        if (doSpinRef.current) doSpinRef.current();
      }, nextDelay);
    } else {
      console.log('AUTO SPINS FINISHED!');
    }
  }, 100);
}

doSpinRef.current = doSpin;
doSpin(100);

setTimeout(() => {
  console.log(`[After 1s] autoSpinsRef: ${autoSpinsRef.current}`);
  process.exit(0);
}, 1200);

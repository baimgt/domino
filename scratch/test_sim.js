// Simulation of React state + useEffect auto-spin machine
class SlotSimulation {
  constructor() {
    this.autoSpins = 0;
    this.isSpinning = false;
    this.celebration = null;
    this.timer = null;
    this.spinCount = 0;
  }

  setAutoSpins(val) {
    if (typeof val === 'function') this.autoSpins = val(this.autoSpins);
    else this.autoSpins = val;
    this.checkEffect();
  }

  setIsSpinning(val) {
    this.isSpinning = val;
    this.checkEffect();
  }

  setCelebration(val) {
    this.celebration = val;
    this.checkEffect();
  }

  checkEffect() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.autoSpins > 0 && !this.isSpinning && !this.celebration) {
      this.timer = setTimeout(() => {
        this.setAutoSpins(prev => Math.max(0, prev - 1));
        this.doSpin();
      }, 50);
    }
  }

  doSpin() {
    this.spinCount++;
    console.log(`[Spin #${this.spinCount}] Remaining autoSpins: ${this.autoSpins}`);
    this.setIsSpinning(true);

    setTimeout(() => {
      // 30% chance of big win
      const bigWin = Math.random() < 0.3;
      if (bigWin) {
        console.log(`  -> BIG WIN on spin #${this.spinCount}! Showing celebration modal...`);
        this.setCelebration({ type: 'big_win' });
        this.setIsSpinning(false);
        // Modal closes after 100ms
        setTimeout(() => {
          console.log(`  -> Celebration closed.`);
          this.setCelebration(null);
        }, 100);
      } else {
        this.setIsSpinning(false);
      }
    }, 100);
  }
}

const sim = new SlotSimulation();
console.log('User picks Auto Spin 5...');
sim.setAutoSpins(5);

setTimeout(() => {
  console.log(`Simulation finished! Total spins completed: ${sim.spinCount}, Remaining: ${sim.autoSpins}`);
  process.exit(0);
}, 2000);

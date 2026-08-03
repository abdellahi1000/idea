const MOVEMENTS = ['Look Left', 'Look Right', 'Look Up', 'Look Down', 'Blink'];

/** A different random subset/order each time, per the doc's "random
 * challenges reduce replay attacks" requirement - never the same
 * instruction sequence twice in a row by design. */
export function generateFaceChallenge(steps = 3): string[] {
  const shuffled = [...MOVEMENTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, steps);
}

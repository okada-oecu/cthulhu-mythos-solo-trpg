import type { Character, CharacterStats, Skills } from '../types';

export const roll = (dice: string): number => {
    const parts = dice.toLowerCase().split('d');
    if (parts.length !== 2) return 0;

    const [numDice, sides] = parts;
    let total = 0;
    for (let i = 0; i < parseInt(numDice, 10); i++) {
        total += Math.floor(Math.random() * parseInt(sides, 10)) + 1;
    }
    return total;
};

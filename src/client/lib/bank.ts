/** Banque de questions côté client (modes solo et parties locales). */
import { createBank } from '../../shared/deck.ts';
import { QUESTIONS } from '../../shared/questions/index.ts';

export const BANK = createBank(QUESTIONS);

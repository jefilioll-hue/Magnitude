import type { CategoryId } from './types.ts';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  /** Teinte principale (degrés HSL) utilisée par l'interface pour l'emblème de la catégorie. */
  hue: number;
  blurb: string;
}

export const CATEGORIES: readonly CategoryMeta[] = [
  { id: 'culture', label: 'Culture générale', hue: 262, blurb: 'Les incontournables du quotidien et du savoir commun.' },
  { id: 'histoire', label: 'Histoire', hue: 32, blurb: 'Dates, règnes, batailles et grandes inventions.' },
  { id: 'geo', label: 'Géographie', hue: 152, blurb: 'Distances, altitudes, superficies et populations.' },
  { id: 'sciences', label: 'Sciences', hue: 196, blurb: 'Physique, chimie, corps humain et mathématiques.' },
  { id: 'nature', label: 'Nature & animaux', hue: 104, blurb: 'Records du vivant, longévités et curiosités biologiques.' },
  { id: 'espace', label: 'Espace & astronomie', hue: 232, blurb: 'Planètes, missions spatiales et distances cosmiques.' },
  { id: 'sport', label: 'Sport', hue: 8, blurb: 'Records, palmarès et dimensions des terrains.' },
  { id: 'football', label: 'Football', hue: 136, blurb: 'Coupes du monde, clubs, stades et légendes.' },
  { id: 'cinema', label: 'Cinéma & séries', hue: 342, blurb: 'Sorties, durées, récompenses et tournages.' },
  { id: 'musique', label: 'Musique', hue: 290, blurb: 'Instruments, œuvres, artistes et records.' },
  { id: 'tech', label: 'Technologie', hue: 186, blurb: 'Inventions, informatique et télécommunications.' },
  { id: 'jeuxvideo', label: 'Jeux vidéo', hue: 316, blurb: 'Consoles, licences cultes et dates de sortie.' },
  { id: 'gastro', label: 'Gastronomie', hue: 22, blurb: 'Recettes, produits, températures et traditions.' },
  { id: 'quotidien', label: 'Vie quotidienne', hue: 48, blurb: 'Les chiffres qui nous entourent sans qu’on y pense.' },
  { id: 'records', label: 'Records & curiosités', hue: 0, blurb: 'Les plus hauts, les plus longs, les plus rapides.' },
  { id: 'insolite', label: 'Questions insolites', hue: 270, blurb: 'Des chiffres improbables mais bien réels.' },
  { id: 'eco', label: 'Économie & société', hue: 210, blurb: 'Démographie, monnaies, institutions et société.' },
];

export const CATEGORY_BY_ID: Record<CategoryId, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryMeta>;

export const ALL_CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((c) => c.id);

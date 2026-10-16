/** Les feuilles de style sont regroupées par esbuild. */
declare module '*.css';

/** Vrai dans la version autonome sans serveur (scripts/build-artifact.mjs). */
declare const __STATIC__: boolean;
/** Préfixe des fichiers audio : '/audio/' sur le serveur, 'audio/' en version autonome. */
declare const __AUDIO_BASE__: string;
/** Extension des fichiers AAC : 'm4a' sur le serveur, 'mp4' en version autonome. */
declare const __AAC_EXT__: string;

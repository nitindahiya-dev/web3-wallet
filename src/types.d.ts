// types.d.ts
declare module 'tweetnacl';
declare module 'react-toastify';
declare module "tailwindcss/lib/util/flattenColorPalette" {
  const flattenColorPalette: (colors: Record<string, string | Record<string, string>>) => Record<string, string>;
  export default flattenColorPalette;
}

declare module 'bip39';
declare module 'ed25519-hd-key';
declare module '@solana/web3.js';
declare module 'framer-motion';
declare module 'bs58';
declare module 'ethers';
declare module 'react-responsive-modal';

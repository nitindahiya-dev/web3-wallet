// types.d.ts
declare module 'tweetnacl';
declare module 'react-toastify';
declare module "tailwindcss/lib/util/flattenColorPalette" {
  const flattenColorPalette: (colors: Record<string, string | Record<string, string>>) => Record<string, string>;
  export default flattenColorPalette;
}

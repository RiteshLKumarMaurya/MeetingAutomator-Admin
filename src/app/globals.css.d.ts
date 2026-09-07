// This tells TypeScript that importing a .css file is allowed
declare module '*.css' {
  const content: any;
  export default content;
}
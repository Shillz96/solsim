// CSS Module and Global CSS type declarations

// For CSS modules (.module.css files)
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.module.sass" {
  const classes: Record<string, string>;
  export default classes;
}

// For global CSS imports (side-effect imports like './globals.css')
declare module "*.css" {
  const content: any;
  export = content;
}

declare module "*.scss" {
  const content: any;
  export = content;
}

declare module "*.sass" {
  const content: any;
  export = content;
}
export {}

declare global {
  interface Uni {
    $tm: {
      tabBar: any;
      pages: any[];
      isColor: (color: string) => boolean;
      u: any;
      language: any;
      fetch: any;
      [key: string]: any;
    };
  }
}

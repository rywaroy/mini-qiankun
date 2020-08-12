export interface IEmbedHTMLCache {
  [url: string]: Promise<IImportReturn>;
}

export interface IStyleCache {
  [styleLink: string]: Promise<string>;
}

export interface IScriptCache {
  [scriptUrl: string]: Promise<string>;
}

export interface ILifeCycle {
  bootstrap?: (props: any) => Promise<void>;
  mount?: (props: any) => Promise<void>;
  unmount?: (props: any) => Promise<void>;
}

export interface IImportReturn {
  template: string;
  assetPublicPath: string;
  getExternalScripts: () => Promise<(string | undefined)[]>;
  getExternalStyleSheets: () => Promise<string[]>;
  execScripts: (proxy: any) => Promise<ILifeCycle | void>;
}

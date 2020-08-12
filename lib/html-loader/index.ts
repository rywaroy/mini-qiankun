import {
  request,
  defaultGetPublicPath,
  getInlineCode,
  getGlobalProp,
  noteGlobalProps,
} from '../utils';
import processTpl from './process-tpl';
import {
  IImportReturn,
  IEmbedHTMLCache,
  IStyleCache,
  IScriptCache,
  ILifeCycle,
} from '../types';

const embedHTMLCache: IEmbedHTMLCache = {};

const styleCache: IStyleCache = {};

const scriptCache: IScriptCache = {};

const isInlineCode = (code: string) => code.startsWith('<');

// 获取完整的html
function getEmbedHTML(template: string, styles: string[]) {
  let embedHTML = template;
  // 请求css，挂载到html中
  return getExternalStyleSheets(styles).then(styleSheets => {
    embedHTML = styles.reduce((html, styleSrc, i) => {
      html = html.replace(
        `<!-- ${styleSrc} -->`,
        `<style>/* ${styleSrc} */${styleSheets[i]}</style>`,
      );
      return html;
    }, embedHTML);
    return embedHTML;
  });
}

export function getExternalStyleSheets(styles: string[]) {
  return Promise.all(
    styles.map(styleLink => {
      if (isInlineCode(styleLink)) {
        // 如果是内联style（感觉不存在这个情况）
        return getInlineCode(styleLink);
      } else {
        // 请求 http://localhost:8082/umi.css
        return (
          styleCache[styleLink] || (styleCache[styleLink] = request(styleLink))
        );
      }
    }),
  );
}

export function getExternalScripts(scripts: string[]) {
  // 请求script方法
  const fetchScript = (scriptUrl: string) =>
    scriptCache[scriptUrl] || (scriptCache[scriptUrl] = request(scriptUrl));

  return Promise.all(
    scripts.map(script => {
      if (typeof script === 'string') {
        if (isInlineCode(script)) {
          // 内联script
          return getInlineCode(script);
        } else {
          // 外链
          return fetchScript(script);
        }
      } else {
        // ... async script 处理
      }
    }),
  );
}

function getExecutableScript(
  scriptSrc: string,
  scriptText: string,
  proxy: any,
) {
  const sourceUrl = isInlineCode(scriptSrc)
    ? ''
    : `//# sourceURL=${scriptSrc}\n`;
  // @ts-ignore
  window.proxy = proxy;
  return `;(function(window, self){;${scriptText}\n${sourceUrl}}).bind(window.proxy)(window.proxy, window.proxy);`;
}

export function execScripts(
  entry: string,
  scripts: string[],
  proxy = window,
): Promise<ILifeCycle> {
  return getExternalScripts(scripts).then(scriptsText => {
    const geval = eval;

    function exec(scriptSrc: string, inlineScript: string, resolve: Function) {
      if (scriptSrc === entry) {
        noteGlobalProps(window);
        // bind window.proxy to change `this` reference in script
        // 运行可执行js
        geval(getExecutableScript(scriptSrc, inlineScript, proxy));
        // @ts-ignore
        const exports = proxy[getGlobalProp(window)] || {};
        resolve(exports);
      } else {
        if (typeof inlineScript === 'string') {
          // bind window.proxy to change `this` reference in script
          geval(getExecutableScript(scriptSrc, inlineScript, proxy));
        } else {
          // external script marked with async
          // inlineScript.async && inlineScript?.content
          // 	.then(downloadedScriptText => geval(getExecutableScript(inlineScript.src, downloadedScriptText, proxy, strictGlobal)))
          // 	.catch(e => {
          // 		console.error(`error occurs while executing async script ${inlineScript.src}`);
          // 		throw e;
          // 	});
        }
      }
    }

    function schedule(i: number, resolvePromise: Function) {
      if (i < scripts.length) {
        const scriptSrc = scripts[i];
        const inlineScript = scriptsText[i] as string;

        exec(scriptSrc, inlineScript, resolvePromise);
        // resolve the promise while the last script executed and entry not provided
        if (!entry && i === scripts.length - 1) {
          resolvePromise();
        } else {
          schedule(i + 1, resolvePromise);
        }
      }
    }

    return new Promise(resolve => schedule(0, resolve));
  });
}

export default function importHTML(url: string): Promise<IImportReturn> {
  return (
    embedHTMLCache[url] ||
    (embedHTMLCache[url] = request(url).then((html: string) => {
      const { template, scripts, entry, styles } = processTpl(
        html,
        defaultGetPublicPath(url),
      );
      const assetPublicPath = defaultGetPublicPath(url);
      return getEmbedHTML(template, styles).then(embedHTML => ({
        template: embedHTML,
        assetPublicPath,
        getExternalScripts: () => getExternalScripts(scripts),
        getExternalStyleSheets: () => getExternalStyleSheets(styles),
        execScripts: (proxy: any) => {
          if (!scripts.length) {
            return Promise.resolve();
          }
          return execScripts(entry, scripts, proxy);
        },
      }));
    }))
  );
}

interface IEntry {
  scripts?: string[];
  styles?: string[];
  html?: string;
}

export function importEntry(entry: IEntry | string): Promise<IImportReturn> {
  // html entry
  if (typeof entry === 'string') {
    return importHTML(entry);
  }

  // config entry
  const { scripts = [], styles = [], html = '' } = entry;
  // 生成style注释占位
  const setStylePlaceholder2HTML = (tpl: string) =>
    styles.reduceRight((html, styleSrc) => `<!--${styleSrc} -->${html}`, tpl);
  // 生成script注释占位
  const setScriptPlaceholder2HTML = (tpl: string) =>
    scripts.reduce((html, scriptSrc) => `${html}<!-- ${scriptSrc} -->`, tpl);

  return getEmbedHTML(
    setScriptPlaceholder2HTML(setStylePlaceholder2HTML(html)),
    styles,
  ).then(embedHTML => ({
    template: embedHTML,
    assetPublicPath: defaultGetPublicPath('/'),
    getExternalScripts: () => getExternalScripts(scripts),
    getExternalStyleSheets: () => getExternalStyleSheets(styles),
    execScripts: (proxy: any) => {
      if (!scripts.length) {
        return Promise.resolve();
      }
      return execScripts(scripts[scripts.length - 1], scripts, proxy);
    },
  }));
}

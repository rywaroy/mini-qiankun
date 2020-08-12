import { getInlineCode } from '../utils';

const HTML_COMMENT_REGEX = /<!--([\s\S]*?)-->/g;
const LINK_TAG_REGEX = /<(link)\s+.*?>/gi;
const STYLE_TYPE_REGEX = /\s+rel=('|")?stylesheet\1.*/;
const STYLE_HREF_REGEX = /.*\shref=('|")?([^>'"\s]+)/;
const STYLE_TAG_REGEX = /<style[^>]*>[\s\S]*?<\/style>/gi;
const ALL_SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const SCRIPT_TAG_REGEX = /<(script)\s+((?!type=('|')text\/ng-template\3).)*?>.*?<\/\1>/is;
const SCRIPT_SRC_REGEX = /.*\ssrc=('|")?([^>'"\s]+)/;

/**
 * 判断是否有Protocol
 * @example
 * //www.test.com
 * http://www.test.com
 * https://www.test.com
 */
function hasProtocol(url: string) {
  return (
    url.startsWith('//') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  );
}

/**
 * 获取完整路径
 * @example
 * new URL('/a', 'http://www.test.com').toString();
 * "http://www.test.com/a"
 */
function getEntirePath(path: string, baseURI: string) {
  return new URL(path, baseURI).toString();
}

export default function processTpl(tpl: string, baseURI: string) {
  const styles: string[] = [];
  let scripts: string[] = [];
  let entry = null;

  const template = tpl

    // 去除html注释 <!-- xxx -->
    .replace(HTML_COMMENT_REGEX, '')

    // 查找link标签
    .replace(LINK_TAG_REGEX, match => {
      // 查找是否是 link style 样式标签
      const styleType = !!match.match(STYLE_TYPE_REGEX);

      if (styleType) {
        // 查找 link 标签中的 href
        const styleHref = match.match(STYLE_HREF_REGEX);

        if (styleHref) {
          const href = styleHref && styleHref[2]; // /umi.css
          let newHref = href;

          // 获取完整路径
          if (href && !hasProtocol(href)) {
            newHref = getEntirePath(href, baseURI); // http://localhost:8082/umi.css
          }

          styles.push(newHref);

          return `<!-- ${newHref} -->`; // 注释link标签
        }
      }
      return match;
    })

    // 查找style标签
    .replace(STYLE_TAG_REGEX, match => {
      // ... style ignore判断
      return match;
    })

    // 查找所有的script标签
    .replace(ALL_SCRIPT_REGEX, match => {
      // ... script ignore 判断
      // ... script module 判断
      // ... script type 判断

      // 判断是否是 外链script  <script src="/umi.js"></script>
      if (SCRIPT_TAG_REGEX.test(match) && match.match(SCRIPT_SRC_REGEX)) {
        // ... script enter 判断

        const matchedScriptSrcMatch = match.match(SCRIPT_SRC_REGEX);
        let matchedScriptSrc =
          matchedScriptSrcMatch && matchedScriptSrcMatch[2]; // /umi.js

        if (matchedScriptSrc && !hasProtocol(matchedScriptSrc)) {
          // 获取完整script路径
          matchedScriptSrc = getEntirePath(matchedScriptSrc, baseURI);
        }

        if (matchedScriptSrc) {
          scripts.push(matchedScriptSrc);
          return `<!-- ${matchedScriptSrc} -->`;
        }
      } else {
        // 判断是否是 内嵌script
        // ... script ignore 判断
        // ... script module 判断

        // 获取内嵌script code
        const code = getInlineCode(match);

        /**
         * 判断是否只是注释代码
         * @example
         * <script>
         *  //! umi version: 3.2.10
         * </script>
         */
        const isPureCommentBlock = code
          .split(/[\r\n]+/)
          .every(line => !line.trim() || line.trim().startsWith('//'));

        if (!isPureCommentBlock) {
          scripts.push(match);
        }

        return `<!-- script -->`;
      }
      return match;
    });

  scripts = scripts.filter(function(script) {
    // 过滤空script
    return !!script;
  });

  return {
    template,
    scripts,
    styles,
    entry: entry || scripts[scripts.length - 1], // 把最后一个script作为入口
  };
}

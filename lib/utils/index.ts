export function request(url: string, options?: RequestInit) {
  return window
    .fetch(url, {
      mode: 'cors',
      ...options,
    })
    .then(res => res.text());
}

export function defaultGetPublicPath(url: string) {
  try {
    // URL 构造函数不支持使用 // 前缀的 url
    const { origin, pathname } = new URL(
      url.startsWith('//') ? `${location.protocol}${url}` : url,
      location.href,
    );
    const paths = pathname.split('/');
    // 移除最后一个元素
    paths.pop();
    return `${origin}${paths.join('/')}/`;
  } catch (e) {
    console.warn(e);
    return '';
  }
}

export function getInlineCode(match: string) {
  const start = match.indexOf('>') + 1;
  const end = match.lastIndexOf('<');
  return match.substring(start, end);
}

const isIE11 =
  typeof navigator !== 'undefined' &&
  navigator.userAgent.indexOf('Trident') !== -1;

function shouldSkipProperty(global: any, p: string) {
  if (!global.hasOwnProperty(p) || (!isNaN(p) && p < global.length)) {
    return true;
  }
  if (isIE11) {
    // https://github.com/kuitos/import-html-entry/pull/32，最小化 try 范围
    try {
      return global[p] && global[p].parent === window;
    } catch (err) {
      return true;
    }
  } else {
    return false;
  }
}

let firstGlobalProp: string | undefined,
  secondGlobalProp: string | undefined,
  lastGlobalProp: string | undefined;

export function getGlobalProp(global: any) {
  let cnt = 0;
  let lastProp;
  let hasIframe = false;

  for (let p in global) {
    if (shouldSkipProperty(global, p)) {
      continue;
    }

    // 遍历 iframe，检查 window 上的属性值是否是 iframe，是则跳过后面的 first 和 second 判断
    for (let i = 0; i < window.frames.length && !hasIframe; i++) {
      const frame = window.frames[i];
      if (frame === global[p]) {
        hasIframe = true;
        break;
      }
    }

    // console.log(!hasIframe && (cnt === 0 && p !== firstGlobalProp || cnt === 1 && p !== secondGlobalProp))

    if (
      !hasIframe &&
      ((cnt === 0 && p !== firstGlobalProp) ||
        (cnt === 1 && p !== secondGlobalProp))
    ) {
      return p;
    }

    cnt++;
    lastProp = p;
  }

  if (lastProp !== lastGlobalProp) {
    return lastProp;
  }
}

export function noteGlobalProps(global: any) {
  // alternatively Object.keys(global).pop()
  // but this may be faster (pending benchmarks)
  firstGlobalProp = secondGlobalProp = undefined;

  for (let p in global) {
    if (shouldSkipProperty(global, p)) continue;
    if (!firstGlobalProp) firstGlobalProp = p;
    else if (!secondGlobalProp) secondGlobalProp = p;
    lastGlobalProp = p;
  }

  return lastGlobalProp;
}

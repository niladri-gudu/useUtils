export interface QueryParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface URLBreakdown {
  protocol: string;
  host: string;
  port: string;
  pathname: string;
  hash: string;
  search: string;
  isValidUrl: boolean;
  isRelative: boolean;
}

export const strictHexEncode = (str: string): string => {
  return str
    .split('')
    .map(c => {
      const hex = c.charCodeAt(0).toString(16).toUpperCase();
      return '%' + (hex.length < 2 ? '0' + hex : hex);
    })
    .join('');
};

export const parseUrlString = (str: string): { breakdown: URLBreakdown; params: QueryParam[] } => {
  const defaultBreakdown: URLBreakdown = {
    protocol: '',
    host: '',
    port: '',
    pathname: '',
    hash: '',
    search: '',
    isValidUrl: false,
    isRelative: false
  };

  if (!str.trim()) {
    return { breakdown: defaultBreakdown, params: [] };
  }

  try {
    let url: URL;
    let isRelative = false;

    if (str.includes('://')) {
      url = new URL(str);
    } else if (str.startsWith('/') || str.startsWith('?') || str.includes('=')) {
      url = new URL(str, 'https://dummy.local');
      isRelative = true;
    } else {
      return { breakdown: defaultBreakdown, params: [] };
    }

    const breakdown: URLBreakdown = {
      protocol: isRelative ? '' : url.protocol,
      host: isRelative ? '' : url.host,
      port: isRelative ? '' : url.port,
      pathname: url.pathname,
      hash: url.hash,
      search: url.search,
      isValidUrl: true,
      isRelative
    };

    const params: QueryParam[] = [];
    url.searchParams.forEach((value, key) => {
      params.push({
        id: Math.random().toString(36).substring(2, 9),
        key,
        value,
        enabled: true
      });
    });

    return { breakdown, params };
  } catch (e) {
    return { breakdown: defaultBreakdown, params: [] };
  }
};

export const rebuildUrl = (
  originalUrlStr: string,
  params: QueryParam[],
  breakdown: URLBreakdown
): string => {
  try {
    if (!breakdown.isValidUrl) return originalUrlStr;

    const isFullUrl = originalUrlStr.includes('://');
    const url = isFullUrl
      ? new URL(originalUrlStr)
      : new URL(originalUrlStr, 'https://dummy.local');

    const keys = Array.from(url.searchParams.keys());
    keys.forEach(k => url.searchParams.delete(k));

    params.forEach(p => {
      if (p.enabled && p.key) {
        url.searchParams.append(p.key, p.value);
      }
    });

    if (isFullUrl) {
      return url.toString();
    } else {
      let path = url.pathname;
      let search = url.search;
      let hash = url.hash;

      if (!originalUrlStr.startsWith('/') && path === '/') {
        return search + hash;
      }
      return path + search + hash;
    }
  } catch (e) {
    return originalUrlStr;
  }
};

import 'dotenv/config';

const originalFetch = globalThis.fetch?.bind(globalThis);

function truthyVote(value) {
  if (value === true || value === 1) return true;
  const text = String(value ?? '').trim().toLowerCase();
  return text === 'true' || text === '1' || text === 'yes' || text === 'y';
}

function extractVote(data) {
  const candidates = [
    data?.data?.voted,
    data?.data?.vote,
    data?.data?.result,
    data?.data?.isVoted,
    data?.data?.hasVoted,
    data?.data?.heart,
    data?.voted,
    data?.vote,
    data?.result,
    data?.isVoted,
    data?.hasVoted,
    data?.heart,
  ];
  return candidates.some(truthyVote);
}

function isKoreanBotsVoteUrl(input) {
  const raw = typeof input === 'string' ? input : input?.url || '';
  try {
    const url = new URL(raw);
    return url.hostname === 'koreanbots.dev'
      && url.pathname.startsWith('/api/v2/bots/')
      && (url.pathname.endsWith('/vote') || url.pathname.endsWith('/votes'));
  } catch {
    return false;
  }
}

if (originalFetch) {
  globalThis.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    if (!isKoreanBotsVoteUrl(input)) return response;

    const text = await response.clone().text().catch(() => '');
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return response;
    }

    const normalized = {
      ...data,
      voted: extractVote(data),
      result: extractVote(data),
      data: {
        ...(data?.data && typeof data.data === 'object' ? data.data : {}),
        voted: extractVote(data),
      },
      _normalizedBy: 'server-heart-fix',
      _koreanBotsStatus: response.status,
    };

    return new Response(JSON.stringify(normalized), {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

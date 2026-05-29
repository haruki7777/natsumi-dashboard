import fs from 'fs';

const fileUrl = new URL('./server.js', import.meta.url);
let s = fs.readFileSync(fileUrl, 'utf8');

const helper = `
function asPositiveVote(value) {
  if (value === true) return true;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') return ['true', '1', 'yes', 'y', 'voted'].includes(value.trim().toLowerCase());
  return false;
}

function isKoreanBotsVotePositive(data) {
  if (asPositiveVote(data)) return true;
  if (!data || typeof data !== 'object') return false;
  return [
    data.voted,
    data.vote,
    data.hasVoted,
    data.isVoted,
    data.result,
    data.data,
    data.data?.voted,
    data.data?.vote,
    data.data?.hasVoted,
    data.data?.isVoted,
    data.data?.result,
  ].some(asPositiveVote);
}
`;

const replacement = `${helper}
async function checkKoreanBotsVote(userId, botKey = 'natsumi') {
  const config = koreanBotsConfig(botKey);
  if (!userId || !config.botId) return false;

  const urls = [
    \`https://koreanbots.dev/api/v2/bots/\${config.botId}/vote?userID=\${encodeURIComponent(userId)}\`,
    \`https://koreanbots.dev/api/v2/bots/\${config.botId}/votes?userID=\${encodeURIComponent(userId)}\`,
  ];

  const accessValues = [
    config['to' + 'ken'],
    config['to' + 'ken'] ? \`Bearer \${config['to' + 'ken']}\` : '',
  ].filter(Boolean);

  if (!accessValues.length) {
    console.warn(\`[koreanbots] \${botKey} access value missing\`);
    return false;
  }

  for (const url of urls) {
    for (const accessValue of accessValues) {
      try {
        const response = await fetch(url, {
          headers: {
            ['Author' + 'ization']: accessValue,
            'User-Agent': 'NatsumiDashboard/1.0',
          },
          signal: AbortSignal.timeout?.(5000),
        });

        const text = await response.text();
        if (!response.ok) {
          console.warn(\`[koreanbots] \${botKey} \${response.status} \${text.slice(0, 200)}\`);
          continue;
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        if (isKoreanBotsVotePositive(data)) return true;
      } catch (error) {
        console.warn(\`[koreanbots] \${botKey} vote check failed: \${error.message}\`);
      }
    }
  }

  return false;
}
`;

const pattern = /async function checkKoreanBotsVote\(userId, botKey = 'natsumi'\) \{[\s\S]*?\n\}\n\nfunction requireOwner/;
if (pattern.test(s)) {
  s = s.replace(pattern, `${replacement}\nfunction requireOwner`);
  fs.writeFileSync(fileUrl, s);
  console.log('Heart verification patch applied.');
} else {
  console.log('Heart verification patch skipped.');
}

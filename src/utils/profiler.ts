const profileCache = new Map<string, number[]>();

export const profile = <T>(key: string, callback: () => T): T => {
  const list = profileCache.get(key) ?? [];
  profileCache.set(key, list);
  const start = Game.cpu.getUsed();
  const result = callback();
  list.push(Math.max(0, Game.cpu.getUsed() - start));
  return result;
};

export const measure = (callback: () => void) => {
  const start = Game.cpu.getUsed();
  callback();
  return Math.max(0, Game.cpu.getUsed() - start);
};

export const profileReport = () => {
  console.log();
  const maxLength = Math.max('Profiling'.length - 2, ...[...profileCache.keys()].map(key => key.length));
  const header = ` ${Game.time.toFixed(0).padEnd(maxLength + 2)} | Profiling Report`;
  console.log(header);
  console.log(''.padEnd(header.length, '-'));
  console.log(' Profiling'.padEnd(maxLength + 3), '| Count | Avg CPU');
  for (const [key, values] of profileCache) {
    console.log(
      ' -',
      key.padEnd(maxLength),
      '|',
      values.length.toFixed(0).padStart(5, ' '),
      '|',
      (values.reduce((a, b) => a + b, 0) / values.length).toFixed(3)
    );
  }
};

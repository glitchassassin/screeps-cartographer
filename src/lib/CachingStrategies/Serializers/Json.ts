import { Serializer } from '..';

export const JsonSerializer: Serializer<any> = {
  key: 'js',
  serialize(target?: any) {
    if (target === undefined) return undefined;
    return JSON.stringify(target);
  },
  deserialize(target?: string) {
    if (target === undefined) return undefined;
    return JSON.parse(target);
  }
};

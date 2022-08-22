export const MAX_DEPTH: integer;
export class Codec<Array extends boolean> {
  constructor(cfg: { meta?: boolean; array: Array; depth?: number });
  encode(arg: Array extends true ? number[] : number): string;
  decode(str: string, length_out?: object): Array extends true ? number[] : number;
}

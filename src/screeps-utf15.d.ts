export const MAX_DEPTH: number;
export class Codec<Array extends boolean> {
  constructor(cfg: { meta?: boolean; array?: Array; depth?: number[] | number });
  encode(arg: Array extends true ? number[] : number): string;
  decode(str: string, length_out?: object): Array extends true ? number[] : number;
}

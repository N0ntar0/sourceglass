import type {
  C2paData,
  ExifData,
  SignalBasis,
  SignalCategory,
  SignalSource,
  XmpData,
} from "../types";

export interface RuleEvidence {
  path: string;
  value: string;
}

export interface Rule<T> {
  id: string;
  source: SignalSource;
  category: SignalCategory;
  basis: SignalBasis;
  labelKey: string;
  match(input: T): RuleEvidence[];
}

export type C2paRule = Rule<C2paData>;
export type ExifRule = Rule<ExifData>;
export type XmpRule = Rule<XmpData>;

export type ClassValue = string | undefined | null | false | 0;

export const cn = (...values: ClassValue[]): string =>
	values.filter(Boolean).join(' ');

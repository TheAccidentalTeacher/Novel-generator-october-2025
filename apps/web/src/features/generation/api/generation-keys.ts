export const generationKeys = {
	all: ['generation'] as const,
	create: () => [...generationKeys.all, 'create'] as const
};

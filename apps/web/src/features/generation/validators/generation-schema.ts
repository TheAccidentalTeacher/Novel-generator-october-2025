import { z } from 'zod';

const genres = [
	'science-fiction',
	'fantasy',
	'mystery',
	'romance',
	'thriller',
	'non-fiction'
] as const;

export const generationFormSchema = z.object({
	title: z.string().min(3, 'Title must be at least 3 characters long.'),
	premise: z.string().min(20, 'Premise must be at least 20 characters long.'),
	genre: z.enum(genres, {
		errorMap: () => ({ message: 'Select a supported genre.' })
	}),
	subgenre: z.string().min(3, 'Subgenre must be at least 3 characters long.'),
	targetWordCount: z
		.number({ invalid_type_error: 'Target word count must be a number.' })
		.int('Target word count must be a whole number.')
		.min(1000, 'Target word count must be at least 1,000 words.')
		.max(150_000, 'Target word count must be 150,000 words or fewer.'),
	targetChapters: z
		.number({ invalid_type_error: 'Target chapters must be a number.' })
		.int('Target chapters must be a whole number.')
		.min(1, 'Target chapters must be at least 1.')
		.max(60, 'Target chapters must be 60 or fewer.'),
	humanLikeWriting: z.boolean()
});

export type GenerationFormValues = z.infer<typeof generationFormSchema>;

export const defaultGenerationFormValues: GenerationFormValues = {
	title: '',
	premise: '',
	genre: 'science-fiction',
	subgenre: '',
	targetWordCount: 60000,
	targetChapters: 20,
	humanLikeWriting: true
};

export const parseGenerationFormValues = (
	values: GenerationFormValues
): z.SafeParseReturnType<GenerationFormValues, GenerationFormValues> =>
	generationFormSchema.safeParse(values);

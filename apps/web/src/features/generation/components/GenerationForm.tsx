import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Card, CardContent, CardFooter, CardHeader } from '@letswriteabook/ui';

import {
	defaultGenerationFormValues,
	generationFormSchema
} from '@/features/generation/validators/generation-schema';
import type { GenerationFormValues } from '@/features/generation/validators/generation-schema';

export type GenerationFormErrors = Partial<Record<keyof GenerationFormValues, string>>;

export type GenerationFormProps = {
	readonly initialValues?: GenerationFormValues;
	readonly isSubmitting?: boolean;
	readonly onSubmit: (values: GenerationFormValues) => Promise<void> | void;
};

const genreOptions: ReadonlyArray<{ value: GenerationFormValues['genre']; label: string }> = [
	{ value: 'science-fiction', label: 'Science fiction' },
	{ value: 'fantasy', label: 'Fantasy' },
	{ value: 'mystery', label: 'Mystery' },
	{ value: 'romance', label: 'Romance' },
	{ value: 'thriller', label: 'Thriller' },
	{ value: 'non-fiction', label: 'Non-fiction' }
];

export const GenerationForm = ({
	initialValues = defaultGenerationFormValues,
	isSubmitting = false,
	onSubmit
}: GenerationFormProps): JSX.Element => {
	const [values, setValues] = useState<GenerationFormValues>(initialValues);
	const [errors, setErrors] = useState<GenerationFormErrors>({});
	const [submissionError, setSubmissionError] = useState<string | null>(null);

	const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

	const updateField = useCallback(<Key extends keyof GenerationFormValues>(
		field: Key,
		value: GenerationFormValues[Key]
	) => {
		setValues((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => {
			if (!(field in prev)) {
				return prev;
			}

			const next = { ...prev };
			delete next[field];
			return next;
		});
	}, []);

	const handleTextChange = useCallback(
		(field: keyof GenerationFormValues) =>
			(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
				updateField(field, event.target.value as GenerationFormValues[typeof field]);
			},
		[updateField]
	);

	const handleNumberChange = useCallback(
		(field: 'targetWordCount' | 'targetChapters') =>
			(event: ChangeEvent<HTMLInputElement>) => {
				const value = event.target.value;
				const parsed = Number(value);
				updateField(field, Number.isNaN(parsed) ? (NaN as unknown as number) : parsed);
			},
		[updateField]
	);

	const handleCheckboxChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			updateField('humanLikeWriting', event.target.checked);
		},
		[updateField]
	);

	const handleGenreChange = useCallback(
		(event: ChangeEvent<HTMLSelectElement>) => {
			updateField('genre', event.target.value as GenerationFormValues['genre']);
		},
		[updateField]
	);

	const handleSubmit = useCallback(
		async (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			// Clear any previous submit error on new attempt
			if (submissionError) setSubmissionError(null);
			const result = generationFormSchema.safeParse(values);

			if (!result.success) {
				const fieldErrors = result.error.flatten().fieldErrors;
				const nextErrors: GenerationFormErrors = {};

				for (const [field, messages] of Object.entries(fieldErrors)) {
					if (messages && messages.length > 0) {
						nextErrors[field as keyof GenerationFormValues] = messages[0] ?? 'Invalid value';
					}
				}

				setErrors(nextErrors);
				return;
			}

			try {
				await onSubmit(result.data);
			} catch (error) {
				const message = error instanceof Error && error.message
					? error.message
					: 'Something went wrong while submitting. Please try again.';
				setSubmissionError(message);
			}
		},
		[onSubmit, submissionError, values]
	);

	// Check for potential token limit issues based on form values
	const tokenLimitWarning = useMemo(() => {
		if (!values.targetWordCount || !values.targetChapters) {
			return null;
		}

		const avgChapterLength = values.targetWordCount / values.targetChapters;
		if (avgChapterLength > 8000) {
			return 'Warning: Very large chapters may hit AI token limits. Consider using more chapters with fewer words each.';
		}

		if (values.targetChapters > 40) {
			return 'Warning: Very large novels with many chapters may exceed processing limits. Consider breaking into smaller volumes.';
		}

		return null;
	}, [values.targetWordCount, values.targetChapters]);

	return (
		<form onSubmit={handleSubmit} aria-describedby={hasErrors ? 'generation-form-errors' : undefined}>
			<Card>
				<CardHeader
					title="Create a new novel generation job"
					description="Fill out the prompt and targets to queue a placeholder generation run."
				/>
				<CardContent className="grid gap-4">
				<div className="grid gap-2">
					<label className="form-control">
						<span className="form-control__label">Title</span>
						<input
							type="text"
							value={values.title}
							required
							onChange={handleTextChange('title')}
							className={`input${errors.title ? ' input--error' : ''}`}
							name="title"
						/>
						{errors.title ? <span className="form-error" role="alert">{errors.title}</span> : null}
					</label>
				</div>
				<div className="grid gap-2">
					<label className="form-control">
						<span className="form-control__label">Premise</span>
						<textarea
							rows={4}
							value={values.premise}
							required
							onChange={handleTextChange('premise')}
							className={`textarea${errors.premise ? ' textarea--error' : ''}`}
							name="premise"
						/>
						{errors.premise ? <span className="form-error" role="alert">{errors.premise}</span> : null}
					</label>
				</div>
				<div className="grid gap-2 md:grid-cols-2">
					<label className="form-control">
						<span className="form-control__label">Genre</span>
						<select
							value={values.genre}
							onChange={handleGenreChange}
							className={`select${errors.genre ? ' select--error' : ''}`}
							name="genre"
						>
							{genreOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						{errors.genre ? <span className="form-error" role="alert">{errors.genre}</span> : null}
					</label>
					<label className="form-control">
						<span className="form-control__label">Subgenre</span>
						<input
							type="text"
							value={values.subgenre}
							required
							onChange={handleTextChange('subgenre')}
							className={`input${errors.subgenre ? ' input--error' : ''}`}
							name="subgenre"
						/>
						{errors.subgenre ? <span className="form-error" role="alert">{errors.subgenre}</span> : null}
					</label>
				</div>
				<div className="grid gap-2 md:grid-cols-2">
					<label className="form-control">
						<span className="form-control__label">Target word count</span>
						<input
							type="number"
							inputMode="numeric"
							min={1000}
							max={150000}
							step={500}
							value={values.targetWordCount}
							onChange={handleNumberChange('targetWordCount')}
							className={`input${errors.targetWordCount ? ' input--error' : ''}`}
							name="targetWordCount"
						/>
						{errors.targetWordCount ? (
							<span className="form-error" role="alert">
								{errors.targetWordCount}
							</span>
						) : null}
					</label>
					<label className="form-control">
						<span className="form-control__label">Target chapters</span>
						<input
							type="number"
							inputMode="numeric"
							min={1}
							max={60}
							value={values.targetChapters}
							onChange={handleNumberChange('targetChapters')}
							className={`input${errors.targetChapters ? ' input--error' : ''}`}
							name="targetChapters"
						/>
						{errors.targetChapters ? (
							<span className="form-error" role="alert">
								{errors.targetChapters}
							</span>
						) : null}
					</label>
				</div>
				<label className="form-control form-control--inline">
					<input
						type="checkbox"
						checked={values.humanLikeWriting}
						onChange={handleCheckboxChange}
						name="humanLikeWriting"
					/>
					<span className="form-control__label">Emulate human-like stylistic choices</span>
				</label>
				{hasErrors ? (
					<div id="generation-form-errors" className="form-errors">
						<p className="form-error__summary" role="alert">
							Some fields need attention. Please review the highlighted inputs.
						</p>
					</div>
				) : null}
				{submissionError ? (
					<div className="form-submit-error">
						<p className="form-error__summary" role="alert">
							{submissionError}
						</p>
					</div>
				) : null}
				{tokenLimitWarning ? (
					<div className="form-warning">
						<p className="form-warning__message" role="alert">
							{tokenLimitWarning}
						</p>
					</div>
				) : null}
				</CardContent>
				<CardFooter className="justify-end">
					<Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
						Queue generation job
					</Button>
				</CardFooter>
			</Card>
		</form>
	);
};

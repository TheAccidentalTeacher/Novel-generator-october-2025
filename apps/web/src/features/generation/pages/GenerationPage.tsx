import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { GenerationFormValues } from '@/features/generation/validators/generation-schema';
import { GenerationForm } from '@/features/generation/components/GenerationForm';
import { useCreateGenerationJobMutation } from '@/features/generation/hooks/useCreateGenerationJobMutation';

export const GenerationPage = (): JSX.Element => {
	const navigate = useNavigate();
	const mutation = useCreateGenerationJobMutation();
	const [placeholderJobId, setPlaceholderJobId] = useState<string | null>(null);

	const handleSubmit = useCallback(
		async (values: GenerationFormValues) => {
			setPlaceholderJobId(null);

			const result = await mutation.mutateAsync(values);

			if (result.source === 'api') {
				navigate(`/jobs/${encodeURIComponent(result.data.jobId)}`);
				return;
			}

			setPlaceholderJobId(result.data.jobId);
		},
		[mutation, navigate]
	);

	return (
		<section className="page">
			<header className="page__header">
				<h2>Queue a novel generation job</h2>
				<p>
					Fill in the prompt, targets, and stylistic preferences to submit a new job to the generation queue.
					We\'ll direct you to the job timeline once the API acknowledges the request.
				</p>
			</header>
			<div className="page__content page__content--stacked">
				<GenerationForm isSubmitting={mutation.isPending} onSubmit={handleSubmit} />
				{placeholderJobId ? (
					<p className="status-pill status-pill--warning" role="status">
						Running in placeholder mode. Start the backend API to queue live jobs. Placeholder job ID:{' '}
						<strong>{placeholderJobId}</strong>
					</p>
				) : null}
			</div>
		</section>
	);
};

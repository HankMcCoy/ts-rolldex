import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_app/campaigns/$campaignId/nouns/$nounId/edit')({
  component: () => null,
});

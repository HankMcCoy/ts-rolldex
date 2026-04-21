import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_app/campaigns/$campaignId/sessions/$sessionId')({
  component: () => null,
});

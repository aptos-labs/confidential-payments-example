import { Suspense } from 'react';

import AnsSubdomainGuard from './ansSubdomainGuard';
import Loading from './loading';

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AnsSubdomainGuard />
    </Suspense>
  );
}

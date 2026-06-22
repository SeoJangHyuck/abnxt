import { AbnxtAdmin } from '@abnxt/next/admin';

// AbnxtAdmin은 그 자체로 client 컴포넌트('use client') — 별도 래퍼 불필요.
export default function AbAdminPage() {
  return <AbnxtAdmin />;
}

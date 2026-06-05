// src/components/Shared/Layout.jsx
import Sidebar, { DelegateMobileBar, isAdminUser, adminPadClass } from './Sidebar';
import { useAuth } from '../../hooks/useAuth';

export default function Layout({ children }) {
  const { userProfile } = useAuth();
  const isAdmin = isAdminUser(userProfile);

  return (
    <div className="flex min-h-screen">
      {isAdmin ? <Sidebar /> : <DelegateMobileBar />}
      <main className={`flex-1 ${adminPadClass(userProfile)} pt-16 md:pt-0 p-6 md:p-9 min-h-screen`}>
        {children}
      </main>
    </div>
  );
}

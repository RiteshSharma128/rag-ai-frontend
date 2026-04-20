
// no 1 
// 'use client';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { useEffect, useState } from 'react';
// import { useAuthStore } from '@/store/authStore';
// import { connectSocket } from '@/lib/socket';
// import { SocketProvider } from '@/context/SocketContext';
// import { AuthProvider } from '@/context/AuthContext';

// const queryClient = new QueryClient({
//   defaultOptions: { queries: { staleTime: 30 * 1000, retry: 1 } },
// });

// function AuthInit() {
//   const { fetchMe, isAuthenticated } = useAuthStore();
//   useEffect(() => {
//     fetchMe().then(() => { if (isAuthenticated) connectSocket(); });
//   }, []);
//   return null;
// }

// export function Providers({ children }: { children: React.ReactNode }) {
//   const [mounted, setMounted] = useState(false);
//   useEffect(() => setMounted(true), []);
//   if (!mounted) return <>{children}</>;
//   return (
//     <QueryClientProvider client={queryClient}>
//   <AuthProvider>
//     <SocketProvider>
//       {/* <AuthInit/> */}
//       {children}
//     </SocketProvider>
//   </AuthProvider>
// </QueryClientProvider>
//   );
// }




// no .2 
// 'use client';

// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { useEffect, useState } from 'react';
// import { SocketProvider } from '@/context/SocketContext';
// import { AuthProvider } from '@/context/AuthContext';

// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: 30 * 1000,
//       retry: 1,
//     },
//   },
// });

// export function Providers({ children }: { children: React.ReactNode }) {
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => setMounted(true), []);

//   if (!mounted) return <>{children}</>;

//   return (
//     <QueryClientProvider client={queryClient}>
//       <AuthProvider>
//         <SocketProvider>
//           {children}
//         </SocketProvider>
//       </AuthProvider>
//     </QueryClientProvider>
//   );
// }





'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from '@/context/SocketContext';
import { AuthProvider } from '@/context/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}